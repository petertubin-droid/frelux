/**
 * AdminIntelligenceSources conformance (admin coverage tranche 2, 2026-11-23).
 *
 * Asserts intelligence source registration, URL validation, toggle/enable,
 * disable, test execution, crawl triggering, deletion, and web intelligence search.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminIntelligenceSources from "@/pages/admin/AdminIntelligenceSources";
import * as intelClient from "@/lib/learning/web-intelligence/intel-client";
import type { IntelligenceSource } from "@/lib/learning/web-intelligence/types";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: { email: "admin@frelux.com" }, loading: false })),
}));

vi.mock("@/lib/learning/web-intelligence/intel-client", () => ({
  listSources: vi.fn(),
  createSource: vi.fn(),
  removeSource: vi.fn(),
  enableSource: vi.fn(),
  disableSource: vi.fn(),
  triggerCrawl: vi.fn(),
  testSource: vi.fn(),
  searchWeb: vi.fn(),
}));

const mockSources: IntelligenceSource[] = [
  {
    id: "src-1",
    name: "Dangote Cement Official",
    base_url: "https://dangotecement.com",
    source_type: "MANUFACTURER",
    country: "NG",
    reliability: "HIGH",
    crawl_frequency: "DAILY",
    max_pages: 10,
    enabled: true,
    is_price_source: true,
    is_product_source: true,
    is_knowledge_source: false,
    learning_eligible: true,
    allowed_paths: ["/prices", "/products"],
    created_date: "2026-10-01T00:00:00Z",
  },
  {
    id: "src-2",
    name: "Lafarge Nigeria",
    base_url: "https://lafarge.com.ng",
    source_type: "MANUFACTURER",
    country: "NG",
    reliability: "HIGH",
    crawl_frequency: "WEEKLY",
    max_pages: 5,
    enabled: false,
    is_price_source: true,
    is_product_source: false,
    is_knowledge_source: false,
    learning_eligible: true,
    allowed_paths: ["/"],
    created_date: "2026-10-02T00:00:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(intelClient.listSources).mockResolvedValue([...mockSources]);
});

describe("AdminIntelligenceSources", () => {
  it("loads and displays registered sources on mount", async () => {
    render(
      <MemoryRouter>
        <AdminIntelligenceSources />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Intelligence Sources/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Dangote Cement Official/i)).toBeInTheDocument();
      expect(screen.getByText(/Lafarge Nigeria/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Registered sources \(2\)/i)).toBeInTheDocument();
  });

  it("refuses registration with empty fields without calling createSource", async () => {
    render(
      <MemoryRouter>
        <AdminIntelligenceSources />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Register source/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Name and base URL are required/i),
      ).toBeInTheDocument();
    });
    expect(intelClient.createSource).not.toHaveBeenCalled();
  });

  it("refuses registration with an invalid URL", async () => {
    render(
      <MemoryRouter>
        <AdminIntelligenceSources />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Source name/i), {
      target: { value: "Invalid Source" },
    });
    fireEvent.change(screen.getByLabelText(/https:\/\/example.com/i), {
      target: { value: "not-a-valid-url" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Register source/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Base URL must be a valid absolute http\(s\) URL/i),
      ).toBeInTheDocument();
    });
    expect(intelClient.createSource).not.toHaveBeenCalled();
  });

  it("registers a source with allowed paths and reloads", async () => {
    vi.mocked(intelClient.createSource).mockResolvedValueOnce({ ok: true });

    render(
      <MemoryRouter>
        <AdminIntelligenceSources />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Source name/i), {
      target: { value: "BUA Cement" },
    });
    fireEvent.change(screen.getByLabelText(/https:\/\/example.com/i), {
      target: { value: "https://buacement.com" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Allowed paths/i),
      { target: { value: "/pricing\n/dealers" } },
    );

    fireEvent.click(screen.getByRole("button", { name: /Register source/i }));

    await waitFor(() => {
      expect(intelClient.createSource).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "BUA Cement",
          base_url: "https://buacement.com",
          allowed_paths: ["/pricing", "/dealers"],
        }),
      );
    });

    expect(
      await screen.findByText(/Source registered\. It must be explicitly enabled/i),
    ).toBeInTheDocument();
  });

  it("surfaces registration errors from createSource", async () => {
    vi.mocked(intelClient.createSource).mockResolvedValueOnce({
      ok: false,
      error: "Source URL already registered in domain pool",
    });

    render(
      <MemoryRouter>
        <AdminIntelligenceSources />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Source name/i), {
      target: { value: "Duplicate" },
    });
    fireEvent.change(screen.getByLabelText(/https:\/\/example.com/i), {
      target: { value: "https://duplicate.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Register source/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Source URL already registered in domain pool/i),
      ).toBeInTheDocument();
    });
  });

  it("toggles source enable and disable status", async () => {
    vi.mocked(intelClient.disableSource).mockResolvedValueOnce({
      ok: true,
      message: "Source disabled",
    });
    vi.mocked(intelClient.enableSource).mockResolvedValueOnce({
      ok: true,
      message: "Source enabled",
    });

    render(
      <MemoryRouter>
        <AdminIntelligenceSources />
      </MemoryRouter>,
    );

    await screen.findByText(/Dangote Cement Official/i);

    // Dangote is enabled, so it should have a "Disable" button
    const disableBtn = screen.getByRole("button", { name: /Disable/i });
    fireEvent.click(disableBtn);

    await waitFor(() => {
      expect(intelClient.disableSource).toHaveBeenCalledWith("src-1");
    });

    // Lafarge is disabled, so it should have an "Enable" button
    const enableBtn = screen.getByRole("button", { name: /Enable/i });
    fireEvent.click(enableBtn);

    await waitFor(() => {
      expect(intelClient.enableSource).toHaveBeenCalledWith("src-2");
    });
  });

  it("triggers test on a source", async () => {
    vi.mocked(intelClient.testSource).mockResolvedValueOnce({
      ok: true,
      message: "Crawl probe passed: 200 OK, robots.txt allows /prices",
    });

    render(
      <MemoryRouter>
        <AdminIntelligenceSources />
      </MemoryRouter>,
    );

    await screen.findByText(/Dangote Cement Official/i);
    const testBtns = screen.getAllByRole("button", { name: /Test/i });
    fireEvent.click(testBtns[0]);

    await waitFor(() => {
      expect(intelClient.testSource).toHaveBeenCalledWith("src-1");
      expect(
        screen.getByText(/Crawl probe passed: 200 OK/i),
      ).toBeInTheDocument();
    });
  });

  it("triggers crawl on enabled source and enforces disable state on disabled source", async () => {
    vi.mocked(intelClient.triggerCrawl).mockResolvedValueOnce({
      ok: true,
      message: "Crawl dispatched",
    });

    render(
      <MemoryRouter>
        <AdminIntelligenceSources />
      </MemoryRouter>,
    );

    await screen.findByText(/Dangote Cement Official/i);
    const crawlBtns = screen.getAllByRole("button", { name: /Crawl now/i });
    // First source (Dangote) is enabled -> button is enabled
    expect(crawlBtns[0]).not.toBeDisabled();
    // Second source (Lafarge) is disabled -> button is disabled
    expect(crawlBtns[1]).toBeDisabled();

    fireEvent.click(crawlBtns[0]);
    await waitFor(() => {
      expect(intelClient.triggerCrawl).toHaveBeenCalledWith("src-1");
    });
  });

  it("removes a source", async () => {
    vi.mocked(intelClient.removeSource).mockResolvedValueOnce({
      ok: true,
      message: "Source removed",
    });

    render(
      <MemoryRouter>
        <AdminIntelligenceSources />
      </MemoryRouter>,
    );

    await screen.findByText(/Dangote Cement Official/i);
    const removeBtns = screen.getAllByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtns[0]);

    await waitFor(() => {
      expect(intelClient.removeSource).toHaveBeenCalledWith("src-1");
    });
  });

  it("searches intelligence and displays results", async () => {
    vi.mocked(intelClient.searchWeb).mockResolvedValueOnce({
      ok: true,
      results: [
        {
          title: "Current Cement Prices in Lagos 2026",
          url: "https://buildingmaterials.ng/cement",
          snippet: "50kg Dangote cement retailing at N10,500 in Alaba market.",
          provider: "exa",
        },
      ],
    });

    render(
      <MemoryRouter>
        <AdminIntelligenceSources />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/e\.g\. current cement price/i);
    fireEvent.change(searchInput, { target: { value: "cement price lagos" } });

    const searchBtn = screen.getByRole("button", { name: /^Search$/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(intelClient.searchWeb).toHaveBeenCalledWith("cement price lagos");
      expect(
        screen.getByText(/Current Cement Prices in Lagos 2026/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/50kg Dangote cement retailing/i),
      ).toBeInTheDocument();
    });
  });
});
