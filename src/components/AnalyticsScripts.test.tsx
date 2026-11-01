import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { builder } = vi.hoisted(() => {
  const b = {
    select: () => b,
    limit: () => b,
    maybeSingle: async () => ({
      // Mirrors production: the GA4 property is stored in settings, so the
      // direct tag runs alongside the container.
      data: { ga_measurement_id: "G-MPHE53M93W", meta_pixel_id: null },
      error: null,
    }),
  };
  return { builder: b };
});

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: async () => ({ from: () => builder }),
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

async function renderComp() {
  const Comp = (await import("@/components/AnalyticsScripts")).default;
  return render(
    <MemoryRouter>
      <Comp />
    </MemoryRouter>,
  );
}

function headScripts(): string {
  return Array.from(document.head.querySelectorAll("script"))
    .map((el) => el.innerHTML || el.getAttribute("src") || "")
    .join("\n");
}

beforeEach(() => {
  document.head.innerHTML = "";
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

afterEach(() => {
  document.head.innerHTML = "";
});

describe("AnalyticsScripts", () => {
  it("renders without crashing", async () => {
    const { container } = await renderComp();
    expect(container).toBeTruthy();
  });

  it("loads the configured GTM container", async () => {
    await renderComp();
    await waitFor(() => {
      expect(headScripts()).toContain("gtm.js?id=");
    });
    expect(headScripts()).toContain("GTM-NLVBFFH7");
  });

  it("pushes the denied consent default before the container loads", async () => {
    await renderComp();
    await waitFor(() => {
      expect(headScripts()).toContain("gtm.js?id=");
    });
    const html = headScripts();
    const consentAt = html.indexOf("gtag('consent','default'");
    const loaderAt = html.indexOf("gtm.js?id=");
    expect(consentAt).toBeGreaterThan(-1);
    expect(consentAt).toBeLessThan(loaderAt);
    expect(html).toContain("analytics_storage:'denied'");
    expect(html).toContain("ad_personalization:'denied'");
  });

  it("sends the consent default only once per page", async () => {
    await renderComp();
    await waitFor(() => {
      expect(headScripts()).toContain("gtm.js?id=");
    });
    const occurrences =
      headScripts().split("gtag('consent','default'").length - 1;
    expect(occurrences).toBe(1);
  });

  it("keeps the direct GA4 tag alive next to the container", async () => {
    await renderComp();
    await waitFor(() => {
      expect(headScripts()).toContain("gtag/js?id=G-MPHE53M93W");
    });
    // The container does not carry a GA4 tag yet, so GA must still be fed.
    expect(headScripts()).toContain("gtag('config','G-MPHE53M93W')");
  });

  it("stays off admin routes", async () => {
    window.history.pushState({}, "", "/admin/analytics");
    await renderComp();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(headScripts()).not.toContain("gtm.js?id=");
  });

  it("rejects malformed container ids", async () => {
    const { isValidGtmContainerId } = await import("@/lib/analytics-ids");
    expect(isValidGtmContainerId("GTM-NLVBFFH7")).toBe(true);
    expect(isValidGtmContainerId("GTM-<script>")).toBe(false);
    expect(isValidGtmContainerId("G-MPHE53M93W")).toBe(false);
    expect(isValidGtmContainerId("")).toBe(false);
  });
});
