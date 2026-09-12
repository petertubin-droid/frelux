#!/usr/bin/env python3
"""One-pass idempotency transformer for the frelux migration chain.

Makes every statement category that fails on re-run idempotent:
  1. CREATE POLICY       -> prepend DROP POLICY IF EXISTS
  2. CREATE TRIGGER      -> prepend DROP TRIGGER IF EXISTS
  3. CREATE INDEX        -> add IF NOT EXISTS
  4. ADD CONSTRAINT      -> wrap in DO block with pg_constraint check
  5. CREATE TYPE         -> wrap in DO block with pg_type check

Edits only text OUTSIDE dollar-quoted blocks, single-quoted strings,
and comments, so dynamic SQL inside DO blocks is never touched.
"""
import os, re, sys

MIGRATIONS = 'supabase/migrations'

def protected_spans(sql):
    """Return spans (start, end) of regions to leave untouched:
    dollar-quoted bodies, single-quoted strings, line comments, block comments."""
    spans = []
    i, n = 0, len(sql)
    while i < n:
        c = sql[i]
        if c == '-' and sql[i:i+2] == '--':
            j = sql.find('\n', i)
            spans.append((i, n if j < 0 else j))
            i = n if j < 0 else j + 1
        elif c == '/' and sql[i:i+2] == '/*':
            j = sql.find('*/', i)
            spans.append((i, n if j < 0 else j + 2))
            i = n if j < 0 else j + 2
        elif c == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'" and j + 1 < n and sql[j+1] == "'":
                    j += 2
                elif sql[j] == "'":
                    break
                else:
                    j += 1
            spans.append((i, min(j + 1, n)))
            i = j + 1
        elif c == '$':
            m = re.match(r'\$[A-Za-z_]*\$', sql[i:])
            if m:
                tag = m.group(0)
                j = sql.find(tag, i + len(tag))
                if j < 0:
                    spans.append((i, n)); i = n
                else:
                    spans.append((i, j + len(tag))); i = j + len(tag)
            else:
                i += 1
        else:
            i += 1
    return spans

def is_protected(pos, spans):
    return any(s <= pos < e for s, e in spans)

def unprotected_statements(sql):
    """Yield (start, end) spans of unprotected regions, for regex work."""
    spans = protected_spans(sql)
    regions = []
    prev = 0
    for s, e in spans:
        if s > prev:
            regions.append((prev, s))
        prev = e
    if prev < len(sql):
        regions.append((prev, len(sql)))
    return regions

def find_unprotected(sql, pattern):
    """All regex matches of pattern that START in unprotected text."""
    regions = unprotected_statements(sql)
    out = []
    for rs, re_end in regions:
        seg = sql[rs:re_end]
        for m in re.finditer(pattern, seg, re.I | re.S):
            out.append((rs + m.start(), rs + m.end(), m))
    return out

def stmt_end(sql, pos):
    """Find the end (index past ';') of the statement starting at pos,
    skipping protected spans."""
    spans = protected_spans(sql)
    i = pos
    while i < len(sql):
        if is_protected(i, spans):
            i += 1
            continue
        if sql[i] == ';':
            return i + 1
        i += 1
    return len(sql)

stats = {'policy': 0, 'trigger': 0, 'index': 0, 'constraint': 0, 'type': 0}

for fname in sorted(os.listdir(MIGRATIONS)):
    path = os.path.join(MIGRATIONS, fname)
    if not fname.endswith('.sql'):
        continue
    sql = open(path, errors='ignore').read()
    orig = sql
    inserts = []   # (position, text)
    replacements = []  # (start, end, text)

    # --- 1. CREATE POLICY "name" ... ON <table> ---
    for start, end, m in find_unprotected(sql, r'CREATE POLICY\s+"([^"]+)"\s+ON\s+((?:"[^"]+"|[A-Za-z_][\w.]*))'):
        pname, table = m.group(1), m.group(2)
        # already guarded? look back 400 chars for DROP POLICY IF EXISTS "name"
        back = sql[max(0, start - 400):start]
        if re.search(r'DROP POLICY IF EXISTS\s+"' + re.escape(pname) + r'"', back, re.I):
            continue
        inserts.append((start, f'DROP POLICY IF EXISTS "{pname}" ON {table};\n'))
        stats['policy'] += 1

    # --- 2. CREATE TRIGGER [name] <timing> <events> ON <table> ---
    # NOTE: timing/event clause must be matched EXPLICITLY so the ON capture
    # is the real table reference (an earlier pass matched loosely and produced
    # `DROP TRIGGER ... ON BEFORE UPDATE ON <table>` garbage in phase56).
    trig_pat = (
        r'CREATE TRIGGER\s+(?:"([^"]+)"|([A-Za-z_]\w*))\s+'
        r'(?:BEFORE|AFTER|INSTEAD OF)\s+'
        r'(?:[A-Z]+(?:\s+OR\s+[A-Z]+)*)\s+'
        r'ON\s+((?:"[^"]+"|[A-Za-z_][\w.]*))\s'
    )
    for start, end, m in find_unprotected(sql, trig_pat):
        tname = ('"' + m.group(1) + '"') if m.group(1) else m.group(2)
        table = m.group(3)
        back = sql[max(0, start - 400):start]
        if re.search(r'DROP TRIGGER IF EXISTS\s+' + re.escape(tname) + r'\b', back, re.I):
            continue
        inserts.append((start, f'DROP TRIGGER IF EXISTS {tname} ON {table};\n'))
        stats['trigger'] += 1

    # --- 3. CREATE INDEX name ON ... -> CREATE INDEX IF NOT EXISTS ---
    for start, end, m in find_unprotected(sql, r'CREATE INDEX\s+(?!IF NOT EXISTS)([A-Za-z_][\w]*)\s+ON\s'):
        replacements.append((start, start + len('CREATE INDEX'), 'CREATE INDEX IF NOT EXISTS'))
        stats['index'] += 1

    # --- 4. ALTER TABLE ... ADD CONSTRAINT name ...;  -> DO block guard ---
    for start, end, m in find_unprotected(sql, r'ALTER TABLE\s+(?:ONLY\s+)?((?:"[^"]+"|[A-Za-z_][\w.]*))\s+ADD CONSTRAINT\s+([A-Za-z_]\w*)\s'):
        table, cname = m.group(1), m.group(2)
        send = stmt_end(sql, start)
        stmt = sql[start:send]
        guard = (
            f'DO $mig$\n'
            f'BEGIN\n'
            f'  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = \'{cname}\'\n'
            f'                 AND conrelid = {table}::regclass) THEN\n'
            f'{stmt.strip()}\n'
            f'  END IF;\n'
            f'END\n'
            f'$mig$;\n'
        )
        replacements.append((start, send, guard))
        stats['constraint'] += 1

    # --- 5. CREATE TYPE name AS ENUM (...) -> DO block guard ---
    for start, end, m in find_unprotected(sql, r'CREATE TYPE\s+((?:"[^"]+"|[A-Za-z_][\w.]*))\s+AS\s+'):
        tname = m.group(1)
        send = stmt_end(sql, start)
        stmt = sql[start:send]
        guard = (
            f'DO $mig$\n'
            f'BEGIN\n'
            f'  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = \'{tname.strip(chr(34))}\') THEN\n'
            f'{stmt.strip()}\n'
            f'  END IF;\n'
            f'END\n'
            f'$mig$;\n'
        )
        replacements.append((start, send, guard))
        stats['type'] += 1

    # apply: process replacements and inserts from the END backwards
    for kind in (replacements, ):
        pass
    # merge: replacements override inserts in same span
    edits = []
    for s, e, text in replacements:
        edits.append((s, e, text))
    for pos, text in inserts:
        # skip insert if inside a replacement span
        if any(s <= pos < e for s, e, _ in replacements):
            continue
        edits.append((pos, pos, text))
    edits.sort(key=lambda x: (-x[0], x[1]))
    for s, e, text in edits:
        sql = sql[:s] + text + sql[e:]

    if sql != orig:
        open(path, 'w').write(sql)
        print(f'{fname}: edited')

print(stats)
