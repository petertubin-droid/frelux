import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup, waitFor } from "@testing-library/react";
import {
  applyPageTranslation,
  resetTranslationState,
  restoreOriginalText,
  setPageLanguage,
} from "@/lib/translate/page-translator";
import { GoogleTranslateSync, mapToGoogleLanguage } from "./GoogleTranslate";

// ---------------------------------------------------------------------------
// Fake translate.googleapis.com endpoint — mirrors the real response shape:
// data[0] is a list of sentence entries [translated, original, ...], where
// each translated line keeps its trailing newline except the last.
// ---------------------------------------------------------------------------
const EN_TO_FR: Record<string, string> = {
  "Cement and blocks are construction materials.":
    "Le ciment et les blocs sont des matériaux de construction.",
  "Roof pitch in degrees": "Pente du toit en degrés",
  "Plan your building project": "Planifiez votre projet de construction",
  "Total cost of the project": "Coût total du projet",
};

function buildGtxResponse(q: string): unknown[] {
  const lines = q.split("\n");
  const sentences = lines.map((line, i) => {
    const trans = EN_TO_FR[line] ?? line;
    const suffix = i < lines.length - 1 ? "\n" : "";
    return [trans + suffix, line + suffix, null, null, 3];
  });
  return [sentences, null, "en", null, null, null, null, []];
}

function installFetchMock() {
  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const href = typeof url === "string" ? url : url.toString();
    const q = new URL(href).searchParams.get("q");
    if (!q) throw new Error("missing q");
    return {
      ok: true,
      json: async () => buildGtxResponse(q),
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setContent() {
  document.body.innerHTML = `
    <main>
      <h1>Plan your building project</h1>
      <p>Cement and blocks are construction materials.</p>
      <p>Roof pitch in degrees</p>
      <code>const x = 1;</code>
      <span class="notranslate">Total cost of the project</span>
      <input placeholder="Total cost of the project" />
    </main>
  `;
  document.title = "Plan your building project";
}

beforeEach(() => {
  resetTranslationState();
  localStorage.clear();
  setContent();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  restoreOriginalText();
  document.body.innerHTML = "";
});

describe("page-translator engine", () => {
  it("translates visible text, placeholders and the title in one batch", async () => {
    const fetchMock = installFetchMock();
    await applyPageTranslation("fr");

    expect(screen.getByText(/Le ciment et les blocs/)).toBeInTheDocument();
    expect(screen.getByText("Pente du toit en degrés")).toBeInTheDocument();
    expect(screen.getByText(/Planifiez votre projet/)).toBeInTheDocument();
    expect(document.querySelector("input")?.getAttribute("placeholder")).toBe(
      "Coût total du projet",
    );
    expect(document.title).toBe("Planifiez votre projet de construction");
    // one chunked request for all segments
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never touches code blocks or .notranslate content", async () => {
    installFetchMock();
    await applyPageTranslation("fr");
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
    expect(screen.getByText("Total cost of the project")).toBeInTheDocument();
  });

  it("re-uses the cache on a second pass without network", async () => {
    const fetchMock = installFetchMock();
    await applyPageTranslation("fr");
    const calls = fetchMock.mock.calls.length;

    // Simulate React reverting a node, then re-apply.
    screen.getByText(/Le ciment et les blocs/).textContent =
      "Cement and blocks are construction materials.";
    await applyPageTranslation("fr");
    expect(fetchMock.mock.calls.length).toBe(calls);
    expect(screen.getByText(/Le ciment et les blocs/)).toBeInTheDocument();
  });

  it("restores the original English text", async () => {
    installFetchMock();
    await applyPageTranslation("fr");
    restoreOriginalText();
    expect(screen.getByText("Plan your building project")).toBeInTheDocument();
    expect(
      screen.getByText("Cement and blocks are construction materials."),
    ).toBeInTheDocument();
    expect(document.title).toBe("Plan your building project");
    expect(document.querySelector("input")?.getAttribute("placeholder")).toBe(
      "Total cost of the project",
    );
  });

  it("reports failure when the endpoint is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const ok = await applyPageTranslation("fr");
    expect(ok).toBe(false);
    expect(screen.getByText("Plan your building project")).toBeInTheDocument();
  });

  it("setPageLanguage('en') restores after translating", async () => {
    installFetchMock();
    await setPageLanguage("fr");
    expect(screen.getByText(/Le ciment et les blocs/)).toBeInTheDocument();
    await setPageLanguage("en");
    expect(
      screen.getByText("Cement and blocks are construction materials."),
    ).toBeInTheDocument();
  });
});

describe("GoogleTranslateSync", () => {
  it("translates the page when the language changes and restores on 'en'", async () => {
    installFetchMock();
    const { rerender } = render(<GoogleTranslateSync language="en" />);
    expect(screen.getByText("Plan your building project")).toBeInTheDocument();

    await act(async () => {
      rerender(<GoogleTranslateSync language="fr" />);
    });
    await waitFor(() => {
      expect(screen.getByText(/Le ciment et les blocs/)).toBeInTheDocument();
    });
    expect(document.title).toBe("Planifiez votre projet de construction");

    await act(async () => {
      rerender(<GoogleTranslateSync language="en" />);
    });
    await waitFor(() => {
      expect(
        screen.getByText("Plan your building project"),
      ).toBeInTheDocument();
    });
    expect(document.title).toBe("Plan your building project");
  });

  it("shows the manual fallback link when translation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("blocked");
      }),
    );
    render(<GoogleTranslateSync language="fr" />);
    const notice = await screen.findByText("Automatic translation unavailable");
    expect(notice).toBeInTheDocument();
    const link = screen.getByText("Open in Google Translate");
    expect(link.getAttribute("href")).toContain("tl=fr");
  });

  it("does not inject the retired Google widget or write its cookie", async () => {
    installFetchMock();
    render(<GoogleTranslateSync language="fr" />);
    await waitFor(() => {
      expect(screen.getByText(/Le ciment et les blocs/)).toBeInTheDocument();
    });
    expect(document.getElementById("google-translate-script")).toBeNull();
    expect(document.cookie).not.toContain("googtrans");
  });
});

describe("mapToGoogleLanguage", () => {
  it("maps FRELUX codes to the service codes", () => {
    expect(mapToGoogleLanguage("fr")).toBe("fr");
    expect(mapToGoogleLanguage("zh")).toBe("zh-CN");
  });
});
