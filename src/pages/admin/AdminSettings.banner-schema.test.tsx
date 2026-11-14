import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import type { DbSiteSettings } from "@/types/database";
import {
  SITE_SETTINGS_COLUMNS_WITHOUT_BANNER,
  isMissingMaintenanceBannerColumn,
} from "@/lib/siteSettingsColumns";

/**
 * The admin settings page asks for `select("*")`, so a database that has not run
 * the maintenance-banner migration answers PGRST204 for the whole row and the
 * page used to show "Couldn't load settings" (the reported error). It has to
 * retry without the two banner columns, keep every other field editable, and say
 * plainly that the ticker is unavailable.
 */

type Reply = { data: unknown; error: unknown };
let replyForSelect: (columns: string) => Reply = () => ({
  data: null,
  error: null,
});

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/lib/supabase", () => {
  const makeChain = (columns: string): Record<string, unknown> => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = (next: string) => makeChain(next);
    for (const method of [
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "like",
      "ilike",
      "in",
      "is",
      "not",
      "or",
      "and",
      "order",
      "range",
      "limit",
      "count",
      "head",
      "update",
      "insert",
      "delete",
      "upsert",
    ]) {
      chain[method] = self;
    }
    chain.maybeSingle = async () => replyForSelect(columns);
    chain.single = async () => replyForSelect(columns);
    return chain;
  };

  const supabase = {
    from: vi.fn(() => makeChain("")),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://example.com/test.png" },
        })),
      })),
    },
  };
  return { supabase };
});

const BANNER_COLUMN_ERROR = {
  code: "PGRST204",
  message:
    "Could not find the 'maintenance_banner_enabled' column of 'site_settings' in the schema cache",
};

const BASE_ROW = {
  id: "settings-1",
  site_name: "FRELUX",
  short_name: "FRELUX",
  tagline: "Estimating that holds up on site",
  description: "FRELUX description",
  contact_email: "hello@frelux.com",
  whatsapp_number: "+2348000000000",
  default_currency: "NGN",
  default_currency_symbol: "₦",
  default_unit: "m",
  maintenance_mode: false,
  seo_title: "FRELUX",
  seo_description: "FRELUX SEO",
  manual_paint_bucket_sizes: ["20", "4"],
  loader_config: null,
  display_currencies: [],
  ad_slots: [],
  payment_gateway: null,
} as unknown as DbSiteSettings;

beforeEach(() => {
  vi.clearAllMocks();
  replyForSelect = () => ({ data: null, error: null });
});

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminSettings")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminSettings on a database without the banner columns", () => {
  it("loads the page and explains the ticker is unavailable", async () => {
    const asked: string[] = [];
    replyForSelect = (columns) => {
      asked.push(columns);
      if (columns === "*") return { data: null, error: BANNER_COLUMN_ERROR };
      return { data: BASE_ROW, error: null };
    };

    await renderPage();

    // The page is usable, not the reported failure screen.
    expect(await screen.findByText("Site Settings")).toBeTruthy();
    expect(screen.queryByText("Couldn't load settings")).toBeNull();

    // It retried with an explicit column list instead of the star.
    expect(asked).toContain("*");
    expect(asked.some((columns) => columns.includes("site_name"))).toBe(true);

    // And it says so, rather than letting the admin think a message saved.
    expect(
      await screen.findByText(/isn't available in this database/i),
    ).toBeTruthy();
  });

  it("disables the ticker controls so nothing pretends to save", async () => {
    replyForSelect = (columns) =>
      columns === "*"
        ? { data: null, error: BANNER_COLUMN_ERROR }
        : { data: BASE_ROW, error: null };

    await renderPage();
    await screen.findByText(/isn't available in this database/i);

    const toggle = screen.getByRole("switch", { name: "Maintenance ticker" });
    expect((toggle as HTMLButtonElement).disabled).toBe(true);

    const publish = screen.getByRole("button", { name: /Publish message/i });
    expect((publish as HTMLButtonElement).disabled).toBe(true);

    const textarea = screen.getByLabelText(/Ticker message/i);
    expect((textarea as HTMLTextAreaElement).disabled).toBe(true);
  });

  it("keeps the ticker controls live when the columns exist", async () => {
    replyForSelect = () => ({
      data: {
        ...BASE_ROW,
        maintenance_banner_enabled: true,
        maintenance_banner_message: "Scheduled maintenance tonight.",
      },
      error: null,
    });

    await renderPage();
    await screen.findByText("Site Settings");

    expect(screen.queryByText(/isn't available in this database/i)).toBeNull();
    const toggle = screen.getByRole("switch", { name: "Maintenance ticker" });
    expect((toggle as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("the banner-free column list", () => {
  it("covers every site_settings field the page reads except the banner pair", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/types/database.ts"),
      "utf8",
    );
    const block = source.match(
      /export interface DbSiteSettings \{([\s\S]*?)\n\}/,
    )?.[1];
    expect(block, "DbSiteSettings interface not found").toBeTruthy();

    const declared = [...(block as string).matchAll(/^\s{2}([a-z_]+)\??:/gm)]
      .map((match) => match[1])
      .filter(
        (column) =>
          column !== "maintenance_banner_enabled" &&
          column !== "maintenance_banner_message",
      );

    const fallback = SITE_SETTINGS_COLUMNS_WITHOUT_BANNER.split(",");

    // The list is the production schema minus the banner pair, so it carries
    // columns the type has not caught up with yet. The property that matters is
    // coverage: a declared field missing from the retry would be blanked by the
    // next save. Duplicates would only make the query longer.
    const missing = declared.filter((column) => !fallback.includes(column));
    expect(missing).toEqual([]);
    expect(new Set(fallback).size).toBe(fallback.length);
    expect(fallback).not.toContain("maintenance_banner_enabled");
    expect(fallback).not.toContain("maintenance_banner_message");
  });

  it("recognises the schema-cache error the deploy reported", () => {
    expect(isMissingMaintenanceBannerColumn(BANNER_COLUMN_ERROR)).toBe(true);
    expect(isMissingMaintenanceBannerColumn({ code: "PGRST204" })).toBe(true);
    expect(
      isMissingMaintenanceBannerColumn({
        message:
          "column site_settings.maintenance_banner_message does not exist",
      }),
    ).toBe(true);
    expect(
      isMissingMaintenanceBannerColumn({ message: "permission denied" }),
    ).toBe(false);
    expect(isMissingMaintenanceBannerColumn(null)).toBe(false);
  });
});
