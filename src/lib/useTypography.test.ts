import { describe, it, expect } from "vitest";
import {
  useTypography,
  previewTypography,
  resetPreview,
} from "./useTypography";
import { DEFAULT_TYPOGRAPHY } from "./font-library";

describe("useTypography", () => {
  it("is a function (hook)", () => {
    expect(typeof useTypography).toBe("function");
  });

  it("previewTypography applies CSS variables to :root", () => {
    previewTypography(DEFAULT_TYPOGRAPHY);
    const root = document.documentElement;
    expect(root.style.getPropertyValue("--font-body")).toContain(
      DEFAULT_TYPOGRAPHY.body,
    );
    expect(root.style.getPropertyValue("--font-headings")).toContain(
      DEFAULT_TYPOGRAPHY.headings,
    );
  });

  it("resetPreview clears custom properties back to default", () => {
    previewTypography({
      body: "Roboto",
      headings: "Montserrat",
      navigation: "Roboto",
      buttons: "Montserrat",
      calculatorTitles: "Roboto",
      calculatorResults: "Montserrat",
      admin: "Roboto",
    });
    expect(
      document.documentElement.style.getPropertyValue("--font-body"),
    ).toContain("Roboto");

    resetPreview();
    expect(
      document.documentElement.style.getPropertyValue("--font-body"),
    ).toContain(DEFAULT_TYPOGRAPHY.body);
  });
});
