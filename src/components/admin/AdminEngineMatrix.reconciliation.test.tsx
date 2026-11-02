import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminEngineMatrix } from "./AdminEngineMatrix";
import {
  buildEngineManifest,
  summariseManifest,
} from "@/lib/ai-foundation/engine-manifest";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key, language: "en" }),
}));

const summary = summariseManifest(buildEngineManifest());

function renderMatrix() {
  return render(
    <MemoryRouter>
      <AdminEngineMatrix />
    </MemoryRouter>,
  );
}

describe("AdminEngineMatrix reconciliation band", () => {
  it("shows the real three-way counts, not hard-coded ones", () => {
    renderMatrix();
    expect(
      screen.getByText(/engines are described by all three vocabularies/i),
    ).toBeInTheDocument();
    const band = screen.getByText(/Reconciliation with the AI and capability/i)
      .parentElement!.parentElement as HTMLElement;
    expect(band.textContent).toContain(String(summary.total));
    expect(band.textContent).toContain(String(summary.describedByAllThree));
    expect(band.textContent).toContain(String(summary.capabilityOnly));
  });

  it("names the engines only one vocabulary can see", () => {
    renderMatrix();
    const manifest = buildEngineManifest();
    const aiOnly = manifest
      .filter(
        (m) => m.sources.aiEngineIds.length > 0 && !m.sources.capabilityId,
      )
      .map((m) => m.sources.aiEngineIds[0]);
    for (const id of aiOnly) {
      expect(screen.getByText(new RegExp(id))).toBeInTheDocument();
    }
  });

  it("keeps the existing inventory matrix underneath", () => {
    renderMatrix();
    expect(screen.getByText(/Total Discovered Engines/i)).toBeInTheDocument();
  });
});
