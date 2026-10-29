#!/usr/bin/env python3
"""Publish every published FRELUX article in Spanish.

Resumable: an article that already has a published `es` row is skipped, so a
re-run only picks up what is missing. Each article is inserted as soon as it is
translated, so a crash never loses completed work.

Attribution stays honest: translator is recorded as machine:google and the note
names the date and owner instruction, so nothing pretends to be human-reviewed.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

REF = "nfgaaohweygwydoelxnf"
TOKEN = os.environ["PAYSTACK_SECRET_KEY_3"]
UA = {"User-Agent": "curl/8"}
TARGET = "es"
NOTE = (
    "Published on owner instruction 2026-10-29 (raise global coverage). "
    "Mechanical translation of the published English original; pending human polish."
)
LOG = "/tmp/es_run.log"


def log(msg: str) -> None:
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(LOG, "a") as fh:
        fh.write(line + "\n")


def sql(query: str):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": query}).encode(),
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8",
        },
        method="POST",
    )
    for attempt in range(3):
        try:
            return json.load(urllib.request.urlopen(req, timeout=120))
        except urllib.error.HTTPError as exc:
            body = exc.read()[:200].decode(errors="replace")
            if attempt == 2:
                return {"err": body}
            time.sleep(2 * (attempt + 1))
        except Exception:
            if attempt == 2:
                return {"err": "network"}
            time.sleep(2 * (attempt + 1))
    return {"err": "unknown"}


def translate(text: str, depth: int = 0) -> str:
    """Translate one chunk. Returns None on hard failure so callers can skip."""
    if not text or not text.strip():
        return text
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=en&tl={TARGET}&dt=t&q={urllib.parse.quote(text)}"
    )
    for attempt in range(4):
        try:
            data = json.load(
                urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45)
            )
            return "".join(seg[0] for seg in data[0] if seg and seg[0])
        except Exception:
            if depth == 0 and len(text) > 1200:
                mid = text.rfind(". ", 0, len(text) // 2 + 200)
                if mid > 200:
                    left = translate(text[: mid + 1], 1)
                    right = translate(text[mid + 2 :], 1)
                    if left is None or right is None:
                        return None
                    return f"{left} {right}"
            time.sleep(1.5 * (attempt + 1))
    return None


def chunks(md: str, size: int = 2400):
    out, cur = [], ""
    for para in md.split("\n\n"):
        if len(cur) + len(para) + 2 > size and cur:
            out.append(cur)
            cur = para
        else:
            cur = f"{cur}\n\n{para}" if cur else para
    if cur:
        out.append(cur)
    return out


def translate_md(md: str) -> str | None:
    parts = []
    for chunk in chunks(md):
        # Markdown table rows are kept verbatim: pipes and column widths do not
        # survive machine translation, and a broken table is worse than English.
        if chunk.strip().startswith("|"):
            parts.append(chunk)
            continue
        rendered = translate(chunk)
        if rendered is None:
            return None
        parts.append(rendered)
    return "\n\n".join(parts)


def quote(value) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def publish(article: dict) -> tuple[str, str]:
    slug = article["slug"]
    title = translate(article["title"] or "")
    desc = translate((article["meta_description"] or article["excerpt"] or "")[:1200])
    body = translate_md(article["content"] or "")
    if title is None or body is None:
        return slug, "translate_failed"
    sql(f"delete from content_translations where content_key={quote(slug)} and locale='{TARGET}'")
    result = sql(
        "insert into content_translations (content_type,content_key,locale,title,description,"
        "body_md,status,translator,published_at,notes) values "
        f"('article',{quote(slug)},'{TARGET}',{quote(title)},{quote((desc or '')[:480])},"
        f"{quote(body)},'published','machine:google',now(),{quote(NOTE)}) returning content_key"
    )
    if isinstance(result, list):
        return slug, f"ok({len(body)}c)"
    return slug, f"db_error:{str(result)[:80]}"


def main() -> None:
    rows = sql(
        "select a.slug, a.title, a.excerpt, a.meta_description, a.content "
        "from learn_articles a "
        "where a.status='published' and not exists ("
        "  select 1 from content_translations t "
        f"  where t.content_key=a.slug and t.locale='{TARGET}' and t.status='published') "
        "order by a.published_at desc"
    )
    if not isinstance(rows, list):
        log(f"could not list articles: {rows}")
        sys.exit(1)
    log(f"pending articles: {len(rows)}")

    done = failed = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for slug, status in pool.map(publish, rows):
            if status.startswith("ok"):
                done += 1
            else:
                failed += 1
            log(f"{status:>18}  {slug}  [done={done} failed={failed}]")

    counts = sql(
        f"select count(*) n from content_translations where locale='{TARGET}' and status='published'"
    )
    log(f"FINISHED published={done} failed={failed} total_es={counts}")


if __name__ == "__main__":
    main()
