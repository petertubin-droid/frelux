import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

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
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const unnamed: number[] = [];
  const hasAttribute = (node: ts.JsxOpeningLikeElement, name: string) =>
    node.attributes.properties.some(
      (property) => property.name?.getText(parsed) === name,
    );
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(parsed) === "input"
    ) {
      const inputType = node.attributes.properties.find(
        (property): property is ts.JsxAttribute =>
          ts.isJsxAttribute(property) &&
          property.name.getText(parsed) === "type",
      );
      let named =
        hasAttribute(node, "aria-label") ||
        hasAttribute(node, "aria-labelledby") ||
        hasAttribute(node, "id") ||
        node.attributes.properties.some(ts.isJsxSpreadAttribute) ||
        inputType?.initializer?.getText(parsed) === '"hidden"';
      let parent: ts.Node | undefined = node.parent;
      while (parent && !named) {
        if (ts.isJsxElement(parent)) {
          const parentTag = parent.openingElement.tagName.getText(parsed);
          named =
            parentTag === "label" ||
            ((parentTag === "AdminField" || parentTag === "Field") &&
              hasAttribute(parent.openingElement, "label"));
        }
        parent = parent.parent;
      }
      if (!named) {
        unnamed.push(
          parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return unnamed;
}

function unnamedSelects(file: string): number[] {
  // AdminUi defines the generic AdminSelect primitive itself; the call sites
  // are checked below so names can be verified in their actual form context.
  if (file === "src/components/admin/AdminUi.tsx") return [];
  const source = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const unnamed: number[] = [];
  const hasAttribute = (node: ts.JsxOpeningLikeElement, name: string) =>
    node.attributes.properties.some(
      (property) => property.name?.getText(parsed) === name,
    );
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ["select", "AdminSelect"].includes(node.tagName.getText(parsed))
    ) {
      const idProperty = node.attributes.properties.find(
        (property): property is ts.JsxAttribute =>
          ts.isJsxAttribute(property) && property.name.getText(parsed) === "id",
      );
      const idValue =
        idProperty?.initializer && ts.isStringLiteral(idProperty.initializer)
          ? idProperty.initializer.text
          : null;
      const linkedLabel = idValue
        ? new RegExp(`<label\\b[^>]*\\bhtmlFor=[\"']${idValue}[\"']`).test(
            source,
          )
        : false;
      let named =
        hasAttribute(node, "aria-label") ||
        hasAttribute(node, "aria-labelledby") ||
        linkedLabel;
      let parent: ts.Node | undefined = node.parent;
      while (parent && !named) {
        if (ts.isJsxElement(parent)) {
          const parentTag = parent.openingElement.tagName.getText(parsed);
          named =
            parentTag === "label" ||
            ((parentTag === "AdminField" || parentTag === "Field") &&
              hasAttribute(parent.openingElement, "label"));
        }
        parent = parent.parent;
      }
      if (!named) {
        unnamed.push(
          parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return unnamed;
}

describe("admin form accessibility", () => {
  it("does not add more inputs without an accessible name", () => {
    const offenders = adminFiles().flatMap((file) =>
      unnamedInputs(file).map((line) => `${file}:${line}`),
    );

    expect(offenders.length).toBeLessThanOrEqual(REMAINING_UNNAMED);
  });

  it("gives admin dropdowns an accessible name", () => {
    const offenders = adminFiles().flatMap((file) =>
      unnamedSelects(file).map((line) => `${file}:${line}`),
    );

    expect(offenders).toEqual([]);
  });
});

describe("admin switches", () => {
  it("names every Toggle for screen readers", () => {
    const unnamed = adminFiles().flatMap((file) => {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
      const found: string[] = [];

      for (const match of source.matchAll(/<Toggle\b/g)) {
        let i = match.index + 7;
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
        if (!/\blabel=|\baria-label|\bsrLabel/.test(tag)) {
          found.push(
            `${file}:${source.slice(0, match.index).split("\n").length}`,
          );
        }
      }

      return found;
    });

    expect(unnamed).toEqual([]);
  });
});
