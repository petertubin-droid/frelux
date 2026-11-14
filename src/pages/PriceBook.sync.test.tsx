import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/seo", () => ({ useSeo: vi.fn(), useBreadcrumbJsonLd: vi.fn() }));
vi.mock("@/components/ui/Container", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/lib/international/currency-context", () => ({
  useDisplayCurrency: () => ({ code: "NGN", symbol: "₦" }),
}));

type Outcome =
  | { status: "unconfigured" | "signed-out"; entries: [] }
  | { status: "ok"; entries: unknown[] }
  | { status: "failed"; entries: []; reason: string };

const sync = {
  fetched: { status: "signed-out", entries: [] } as Outcome,
  saves: [] as unknown[],
  saveResult: { ok: false, reason: "not signed in" } as {
    ok: boolean;
    reason?: string;
  },
  deletes: [] as string[],
};

vi.mock("@/lib/pricing/price-book-sync", () => ({
  fetchAccountBook: async () => sync.fetched,
  saveAccountEntry: async (entry: unknown) => {
    sync.saves.push(entry);
    return sync.saveResult;
  },
  deleteAccountEntry: async (slug: string) => {
    sync.deletes.push(slug);
    return sync.saveResult;
  },
}));

import PriceBook from "@/pages/PriceBook";
import { PriceBookProvider } from "@/lib/pricing/price-book-context";

const renderPage = () =>
  render(
    <MemoryRouter>
      <PriceBookProvider>
        <PriceBook />
      </PriceBookProvider>
    </MemoryRouter>,
  );

const accountEntry = {
  slug: "gutter-per-meter",
  rate: 3100,
  currency: "NGN",
  updatedAt: "2026-11-10T04:00:00.000Z",
};

describe("price book account sync on the page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    sync.fetched = { status: "signed-out", entries: [] };
    sync.saves = [];
    sync.deletes = [];
    sync.saveResult = { ok: false, reason: "not signed in" };
  });

  it("says the rates are browser only when there is no account", async () => {
    renderPage();
    expect(await screen.findByTestId("price-book-storage")).toHaveTextContent(
      /saved in this browser\. Sign in to keep them on your account/i,
    );
  });

  it("shows a rate that exists only on the account, and calls the book synced", async () => {
    sync.fetched = { status: "ok", entries: [accountEntry] };
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("list")).toBeDefined();
    });
    expect(
      within(screen.getByRole("list")).getByText("gutter-per-meter"),
    ).toBeDefined();
    expect(screen.getByTestId("price-book-storage")).toHaveTextContent(
      /saved to your account and to this browser/i,
    );
    // The account copy reached the browser copy, not only the screen.
    expect(window.localStorage.getItem("frelux.price-book.v1") ?? "").toContain(
      "gutter-per-meter",
    );
  });

  it("says the account copy did not update when the read fails", async () => {
    sync.fetched = { status: "failed", entries: [], reason: "network down" };
    renderPage();
    expect(await screen.findByTestId("price-book-storage")).toHaveTextContent(
      /account copy did not update just now/i,
    );
  });

  it("does not claim the account when a rate is saved while signed out", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Material slug"), {
      target: { value: "fascia-per-meter" },
    });
    fireEvent.change(screen.getByLabelText("Rate per unit"), {
      target: { value: "4200" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save rate/i }));

    expect(screen.getByRole("status")).toHaveTextContent(
      /It is in this browser\.$/,
    );
    // The write was still offered to the account layer, which refused it.
    expect(sync.saves).toHaveLength(1);
  });

  it("says the rate is on the account once the account accepts it", async () => {
    sync.saveResult = { ok: true };
    renderPage();
    fireEvent.change(screen.getByLabelText("Material slug"), {
      target: { value: "fascia-per-meter" },
    });
    fireEvent.change(screen.getByLabelText("Rate per unit"), {
      target: { value: "4200" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save rate/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /It is on your account and in this browser/i,
      );
    });
  });

  it("sends a deletion to the account as well as removing it locally", async () => {
    sync.fetched = { status: "ok", entries: [accountEntry] };
    sync.saveResult = { ok: true };
    renderPage();
    await waitFor(() => expect(screen.getByRole("list")).toBeDefined());

    fireEvent.click(
      screen.getByRole("button", { name: "Remove gutter-per-meter" }),
    );
    await waitFor(() => expect(sync.deletes).toEqual(["gutter-per-meter"]));
    expect(screen.queryByRole("list")).toBeNull();
  });
});
