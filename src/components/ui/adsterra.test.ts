import { describe, it, expect, vi, afterEach } from "vitest";
import type { DbAdProvider } from "@/types/database";

const provider = (settings: Record<string, unknown> = {}) =>
  ({
    id: "prov",
    name: "Adsterra",
    slug: "adsterra",
    provider_type: "display",
    is_active: true,
    priority: 2,
    credentials: {
      key: "2fc239403361cb893fa79b52b1d98332",
      serve_domain: "www.highrevenueformat.com",
    },
    settings,
    is_system: true,
    created_at: "",
    updated_at: "",
  }) as unknown as DbAdProvider;

/** Mount a banner the way AdSlot does: labeled .frelux-ad-unit wrapper. */
function mountBanner() {
  const wrapper = document.createElement("div");
  wrapper.className = "frelux-ad-unit";
  const inner = document.createElement("div");
  wrapper.appendChild(inner);
  document.body.appendChild(wrapper);
  return { wrapper, inner };
}

async function render(inner: HTMLElement) {
  const mod = await import("@/components/ui/adsterra");
  mod.renderAdsterraBanner(inner, provider(), {
    key: "2fc239403361cb893fa79b52b1d98332",
    slotKey: "learn_in_article",
  });
  return mod;
}

describe("adsterra", () => {
  it("imports and exports a usable API", async () => {
    const mod = await import("@/components/ui/adsterra");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.values(mod).some((x) => typeof x === "function")).toBe(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("hides the whole labeled slot when the zone no-fills (no empty Advertisement box)", async () => {
    vi.useFakeTimers();
    const { wrapper, inner } = mountBanner();
    await render(inner);

    const iframe = wrapper.querySelector("iframe");
    expect(iframe).toBeTruthy();
    // srcdoc iframes in happy-dom do not fire load on their own.
    iframe!.dispatchEvent(new Event("load"));
    expect(wrapper.style.display).not.toBe("none");

    // Late-fill window closes with an empty frame: the slot (label
    // included) must collapse instead of leaving an empty labeled box.
    vi.advanceTimersByTime(6500);
    expect(wrapper.style.display).toBe("none");
  });

  it("restores the slot when a creative lands after the window closed", async () => {
    vi.useFakeTimers();
    const { wrapper, inner } = mountBanner();
    await render(inner);

    const iframe = wrapper.querySelector("iframe") as HTMLIFrameElement;
    iframe.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(6500);
    expect(wrapper.style.display).toBe("none");

    // A creative arrives late: the re-measure (MutationObserver in real
    // browsers, re-load here in happy-dom) must bring the whole slot back.
    const body = iframe.contentDocument!.body;
    Object.defineProperty(body, "scrollHeight", {
      value: 60,
      configurable: true,
    });
    const div = document.createElement("div");
    div.style.height = "60px";
    body.appendChild(div);
    iframe.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(50);
    expect(wrapper.style.display).not.toBe("none");
    expect(iframe.style.height).toBe("60px");
  });
});
