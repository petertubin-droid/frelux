import { describe, expect, it, vi } from "vitest";
import {
  cleanLabelText,
  fieldLabel,
  findMissingFields,
  focusMissingField,
  isFieldEmpty,
} from "./missing-fields";

function form(markup: string): HTMLDivElement {
  const host = document.createElement("div");
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

describe("isFieldEmpty", () => {
  it("treats whitespace as no answer", () => {
    const input = document.createElement("input");
    input.value = "   ";
    expect(isFieldEmpty(input)).toBe(true);
    input.value = "3";
    expect(isFieldEmpty(input)).toBe(false);
  });

  it("reads a radio by whether its group is chosen", () => {
    const input = document.createElement("input");
    input.type = "radio";
    expect(isFieldEmpty(input)).toBe(true);
    input.checked = true;
    expect(isFieldEmpty(input)).toBe(false);
  });
});

describe("fieldLabel", () => {
  it("prefers an explicit label over the surrounding hint text", () => {
    const host = form(`
      <label for="width">
        <span>Width (m)</span>
        <input id="width" data-field-label="Wall width" />
        <span>Leave blank to use the plot width</span>
      </label>`);
    expect(fieldLabel(host.querySelector("input")!)).toBe("Wall width");
  });

  it("uses the label's own name and drops the hint beneath it", () => {
    const host = form(`
      <label for="gate">
        <span>Gate width (m)</span>
        <input id="gate" />
        <span>0 if the wall has no opening</span>
      </label>`);
    expect(fieldLabel(host.querySelector("input")!)).toBe("Gate width (m)");
  });

  it("falls back to the field name when nothing names it", () => {
    const host = form(`<input name="slabThickness" />`);
    expect(fieldLabel(host.querySelector("input")!)).toBe("Slab thickness");
  });

  it("collapses the whitespace JSX leaves in a label", () => {
    expect(cleanLabelText("  Coaches\n   high  ")).toBe("Coaches high");
  });
});

describe("findMissingFields", () => {
  it("names only the fields that are empty, in page order", () => {
    const host = form(`
      <label for="a"><span>Plot length</span><input id="a" aria-required="true" value="30" /></label>
      <label for="b"><span>Plot width</span><input id="b" aria-required="true" value="" /></label>
      <label for="c"><span>Slab thickness</span><input id="c" data-required="true" /></label>`);
    const missing = findMissingFields(host);
    expect(missing.map((field) => field.label)).toEqual([
      "Plot width",
      "Slab thickness",
    ]);
    expect(missing[0].id).toBe("b");
  });

  it("ignores fields that are not marked required", () => {
    const host = form(
      `<label for="x"><span>Note</span><input id="x" /></label>`,
    );
    expect(findMissingFields(host)).toEqual([]);
  });

  it("reports an unanswered choice group once, by the group's name", () => {
    const host = form(`
      <fieldset>
        <legend>Block size</legend>
        <label><input type="radio" name="block" value="9" aria-required="true" /><span>9 inch block</span></label>
        <label><input type="radio" name="block" value="6" aria-required="true" /><span>6 inch block</span></label>
      </fieldset>`);
    const missing = findMissingFields(host);
    expect(missing).toHaveLength(1);
    expect(missing[0].label).toMatch(/inch block/);
  });

  it("stops reporting a choice group once one option is chosen", () => {
    const host = form(`
      <fieldset>
        <label><input type="radio" name="block" value="9" aria-required="true" checked /><span>9 inch block</span></label>
        <label><input type="radio" name="block" value="6" aria-required="true" /><span>6 inch block</span></label>
      </fieldset>`);
    expect(findMissingFields(host)).toEqual([]);
  });

  it("does nothing when there is no container", () => {
    expect(findMissingFields(null)).toEqual([]);
  });
});

describe("focusMissingField", () => {
  it("puts the cursor in the field it reports", () => {
    const host = form(
      `<label for="z"><span>Depth</span><input id="z" /></label>`,
    );
    const input = host.querySelector("input") as HTMLInputElement;
    const focused = focusMissingField({
      id: "z",
      label: "Depth",
      element: input,
    });
    expect(focused?.label).toBe("Depth");
    expect(document.activeElement).toBe(input);
    expect(() => focusMissingField(undefined)).not.toThrow();
  });
});
