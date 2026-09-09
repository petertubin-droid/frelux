import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
// The REAL shared validator — same module the edge function runs.
import {
  validateStudioProject,
  type StudioFile,
} from "@studio-shared/studio/validate";
import { composePreview } from "../preview";

// =========================================================
// ARCHIE CODING STUDIO — REAL QA, NO MOCKS.
// The validator here is the SAME module the edge function
// enforces server-side; the preview composer here is the
// SAME module that renders the live iframe. What these tests
// verify is what actually runs.
// =========================================================

const VALID_PROJECT: StudioFile[] = [
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Interiors</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Premium Interiors</h1>
  <a href="about.html">About us</a>
  <script src="main.js"></script>
</body>
</html>`,
  },
  { path: "styles.css", content: "body { font-family: sans-serif; }" },
  {
    path: "main.js",
    content: 'document.querySelector("h1")!.textContent = "hi";',
  },
  {
    path: "about.html",
    content: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>About</title>
<link rel="stylesheet" href="styles.css"></head><body><h2>About</h2><a href="index.html">Home</a></body></html>`,
  },
];

describe("studio validator (real QA, shared with the edge function)", () => {
  it("accepts a valid complete project", () => {
    const report = validateStudioProject(VALID_PROJECT);
    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.pages.sort()).toEqual(["about.html", "index.html"]);
  });

  it("rejects a project without index.html", () => {
    const report = validateStudioProject(VALID_PROJECT.slice(1));
    expect(report.valid).toBe(false);
    expect(report.issues.some((i) => i.rule === "missing_entrypoint")).toBe(
      true,
    );
  });

  it("rejects broken local references — real reference resolution", () => {
    const files: StudioFile[] = [
      {
        path: "index.html",
        content:
          '<!DOCTYPE html><html lang="en"><head><title>t</title><meta name="viewport" content="width=1"></head><body><img src="missing.png"></body></html>',
      },
    ];
    const report = validateStudioProject(files);
    expect(report.valid).toBe(false);
    expect(
      report.issues.some(
        (i) =>
          i.rule === "broken_reference" && i.message.includes("missing.png"),
      ),
    ).toBe(true);
  });

  it.each([
    ["document.cookie = 'x'", "no_cookie_access"],
    ["fetch('/api/data')", "no_fetch_calls"],
    ["eval('code')", "no_eval"],
    ["localStorage.setItem('k','v')", "no_persistent_storage_writes"],
    [
      '<form action="https://evil.example" method="post">',
      "no_external_form_posts",
    ],
    ["const key = 'sk-abcdefghijklmnop123456';", "no_embedded_credentials"],
    ["// call https://frelux.tools/api", "no_production_access"],
  ])("rejects forbidden pattern: %s", (code, rule) => {
    const files: StudioFile[] = [
      {
        path: "index.html",
        content: `<!DOCTYPE html><html lang="en"><head><title>t</title>
<meta name="viewport" content="width=1"></head><body><script>${code}</script></body></html>`,
      },
    ];
    const report = validateStudioProject(files);
    expect(report.issues.some((i) => i.rule === rule)).toBe(true);
  });

  it("rejects unsafe paths", () => {
    const report = validateStudioProject([
      {
        path: "../escape.html",
        content: "<html lang='en'><title>t</title><body></body></html>",
      },
    ]);
    expect(report.issues.some((i) => i.rule === "unsafe_path")).toBe(true);
  });

  it("rejects a truncated index.html (missing closing tags)", () => {
    const report = validateStudioProject([
      {
        path: "index.html",
        content:
          '<!DOCTYPE html><html lang="en"><head><title>t</title><meta name="viewport" content="width=1"></head><body>',
      },
    ]);
    expect(report.issues.some((i) => i.rule === "truncated_html")).toBe(true);
  });

  it("rejects an empty manifest", () => {
    expect(validateStudioProject([]).valid).toBe(false);
  });
});

describe("studio preview composer (actual executable code)", () => {
  it("inlines the REAL stylesheet and script contents into the running document", () => {
    const { html, warnings } = composePreview(VALID_PROJECT, "index.html");
    expect(warnings).toEqual([]);
    expect(html).toContain('data-archie-src="styles.css"');
    expect(html).toContain("font-family: sans-serif");
    expect(html).toContain('data-archie-src="main.js"');
    // The script content is inlined, not referenced.
    expect(html).not.toMatch(/<script(?![^>]*data-archie-src)[^>]+src=/);
  });

  it("routes internal page links through the preview harness", () => {
    const { html } = composePreview(VALID_PROJECT, "index.html");
    expect(html).toContain('data-archie-nav="about.html"');
    expect(html).toContain('data-archie-harness="router"');
    // No same-origin navigation can escape the sandbox.
    expect(html).not.toMatch(/href="about\.html"/);
  });

  it("leaves external links untouched (sandbox blocks top navigation)", () => {
    const files: StudioFile[] = [
      {
        path: "index.html",
        content: `<!DOCTYPE html><html lang="en"><head><title>t</title>
<meta name="viewport" content="width=1"></head><body><a href="https://example.com">ext</a></body></html>`,
      },
    ];
    const { html } = composePreview(files, "index.html");
    expect(html).toContain('href="https://example.com"');
  });

  it("composes other pages identically — same files, same document", () => {
    const about = composePreview(VALID_PROJECT, "about.html");
    expect(about.html).toContain("<h2>About</h2>");
    expect(about.html).toContain('data-archie-nav="index.html"');
  });

  it("reports honestly when a page is missing", () => {
    const { html, warnings } = composePreview(VALID_PROJECT, "nope.html");
    expect(warnings[0]).toContain("nope.html");
    expect(html).toContain("not found");
  });

  it("is deterministic — identical input yields identical output", () => {
    expect(composePreview(VALID_PROJECT, "index.html").html).toBe(
      composePreview(VALID_PROJECT, "index.html").html,
    );
  });
});

describe("studio isolation & permanence (migration + registration)", () => {
  const migration = readFileSync(
    path.join(
      __dirname,
      "../../../../supabase/migrations/20260912000000_archie_studio.sql",
    ),
    "utf8",
  );

  it("creates fully isolated studio tables (no production FKs)", () => {
    for (const table of [
      "frelux_studio_projects",
      "frelux_studio_files",
      "frelux_studio_versions",
      "frelux_studio_reviews",
    ]) {
      expect(migration).toContain(table);
    }
    // Only references are to auth.users (owner) and within studio.
    expect(migration).toContain("REFERENCES auth.users");
    expect(migration).not.toContain("REFERENCES public.frelux_colors");
  });

  it("enforces owner-scoped RLS on every studio table", () => {
    expect((migration.match(/ENABLE ROW LEVEL SECURITY/g) ?? []).length).toBe(
      4,
    );
    expect(migration).toContain("owner_id = auth.uid()");
  });

  it("version kinds cover the full iteration lifecycle", () => {
    expect(migration).toContain("'DRAFT_BUILD'");
    expect(migration).toContain("'FEEDBACK_ITERATION'");
    expect(migration).toContain("'ROLLBACK'");
    expect(migration).toContain("'PRODUCTION_BUILD'");
  });
});
