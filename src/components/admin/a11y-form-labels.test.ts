import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Screen-reader users need a programmatic name on every field. AdminField and
 * the labelled inputs cover most of admin, but raw inputs still slip through.
 *
 * This is a ratchet: the number may only go down. Give the field an
 * aria-label, an id that a <label htmlFor> points at, or wrap it in a label.
 */
const REMAINING_UNNAMED = 0;

const roots = ["src/pages/admin", "src/components/admin"];

function adminFiles(): string[] {
  return roots.flatMap((root) =>
    fs
      .readdirSync(path.resolve(process.cwd(), root), { recursive: true })
      .map((entry) => path.join(root, String(entry)))
      .filter((file) => file.endsWith(".tsx") && !file.includes(".test.")),
  );
}

function unnamedInputs(file: string): number[] {
  const source = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
  const found: number[] = [];

  for (const match of source.matchAll(/<input\b/g)) {
    let i = match.index + 6;
    let braces = 0;
    let quote: string | null = null;

    while (i < source.length) {
      const char = source[i];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'" || char === "`") {
        quote = char;
      } else if (char === "{") braces += 1;
      else if (char === "}") braces -= 1;
      else if (char === ">" && braces === 0) break;
      i += 1;
    }

    const tag = source.slice(match.index, i + 1);
    const named =
      /aria-label|aria-labelledby|\bid="|type="hidden"|\{\.\.\./.test(tag) ||
      /<label[^>]*>\s*$/.test(
        source.slice(Math.max(0, match.index - 400), match.index),
      );

    if (!named) found.push(source.slice(0, match.index).split("\n").length);
  }

  return found;
}

describe("admin form accessibility", () => {
  it("does not add more inputs without an accessible name", () => {
    const offenders = adminFiles().flatMap((file) =>
      unnamedInputs(file).map((line) => `${file}:${line}`),
    );

    expect(offenders.length).toBeLessThanOrEqual(REMAINING_UNNAMED);
  });
});
