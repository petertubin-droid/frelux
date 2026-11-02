import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbGalleryEntry, DbGalleryImage } from "@/types/database";

// Targeted Supabase mock: a small builder that lets each test
// configure what a query chain resolves with.
let queryResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};
let singleResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};

function builder(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const proxy = new Proxy(chain, {
    get(target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) =>
          Promise.resolve(result).then(resolve);
      }
      if (prop === "maybeSingle") return () => Promise.resolve(result);
      if (prop === "single") return () => Promise.resolve(singleResult);
      if (prop in target) return target[prop];
      target[prop] = () => proxy;
      return target[prop];
    },
  });
  return proxy;
}

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
  isSupabaseConfigured: true,
}));

import {
  fetchPublishedCaseStudies,
  fetchCaseStudyById,
  upsertCaseStudy,
  setCaseStudyPublished,
} from "@/lib/case-studies";

function studyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs-1",
    gallery_entry_id: "ge-1",
    headline: "Flat repaint",
    summary: "Full repaint of a 3-bed flat",
    project_scope: null,
    challenges: null,
    outcome: null,
    materials_used: ["emulsion"],
    project_duration: "2 weeks",
    budget: 400000,
    currency: "NGN",
    is_published: true,
    created_by: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
    ...overrides,
  };
}

function approvedEntry(
  overrides: Partial<DbGalleryEntry> = {},
): DbGalleryEntry {
  return {
    id: "ge-1",
    user_id: "u1",
    title: "3-bed flat repaint",
    description: null,
    project_category: "painting",
    paint_type_used: null,
    paint_quality_used: null,
    colour_used: null,
    location: "Lagos",
    completion_date: "2026-09-01",
    is_public: true,
    is_featured: false,
    status: "approved",
    created_at: "2026-09-02T00:00:00Z",
    updated_at: "2026-09-02T00:00:00Z",
    ...overrides,
  } as DbGalleryEntry;
}

function image(type: "before" | "after", url: string): DbGalleryImage {
  return {
    id: `img-${type}`,
    gallery_entry_id: "ge-1",
    image_type: type,
    image_url: url,
    caption: null,
    sort_order: 0,
    created_at: "2026-09-02T00:00:00Z",
  } as DbGalleryImage;
}

function setImageResult(
  firstCallResult: { data: unknown; error: unknown },
  images: unknown[],
) {
  // First from() call = the case_studies query (thenable / maybeSingle);
  // later calls fetch gallery_images via .in().
  let call = 0;
  fromMock.mockImplementation(() => {
    call += 1;
    return builder(
      call === 1 ? firstCallResult : { data: images, error: null },
    );
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: null, error: null };
  singleResult = { data: null, error: null };
  fromMock.mockImplementation(() => builder(queryResult));
});

describe("fetchPublishedCaseStudies", () => {
  it("returns published case studies with approved gallery entries and their before/after images", async () => {
    queryResult = {
      data: [studyRow({ gallery_entry: approvedEntry() })],
      error: null,
    };
    setImageResult(queryResult, [
      image("before", "https://cdn/before.jpg"),
      image("after", "https://cdn/after.jpg"),
    ]);

    const views = await fetchPublishedCaseStudies();
    expect(views).toHaveLength(1);
    expect(views[0].caseStudy.headline).toBe("Flat repaint");
    expect(views[0].entry.location).toBe("Lagos");
    expect(views[0].beforeImage?.image_url).toBe("https://cdn/before.jpg");
    expect(views[0].afterImage?.image_url).toBe("https://cdn/after.jpg");
  });

  it("filters out case studies whose gallery entry is unapproved, not public, or missing", async () => {
    queryResult = {
      data: [
        studyRow({
          id: "cs-pending",
          gallery_entry: approvedEntry({ id: "ge-p", status: "pending" }),
        }),
        studyRow({
          id: "cs-private",
          gallery_entry: approvedEntry({ id: "ge-x", is_public: false }),
        }),
        studyRow({ id: "cs-noentry", gallery_entry: null }),
        studyRow({
          id: "cs-ok",
          gallery_entry: approvedEntry({ id: "ge-ok" }),
        }),
      ],
      error: null,
    };
    setImageResult(queryResult, []);

    const views = await fetchPublishedCaseStudies();
    expect(views.map((v) => v.caseStudy.id)).toEqual(["cs-ok"]);
  });

  it("propagates query errors", async () => {
    queryResult = { data: null, error: { message: "boom" } };
    await expect(fetchPublishedCaseStudies()).rejects.toThrow("boom");
  });
});

describe("fetchCaseStudyById", () => {
  it("returns null when nothing is found", async () => {
    singleResult = { data: null, error: null };
    await expect(fetchCaseStudyById("missing")).resolves.toBeNull();
  });

  it("returns null when the gallery entry is not publishable", async () => {
    singleResult = {
      data: studyRow({ gallery_entry: approvedEntry({ status: "rejected" }) }),
      error: null,
    };
    await expect(fetchCaseStudyById("cs-1")).resolves.toBeNull();
  });

  it("returns the assembled view for a published study", async () => {
    setImageResult(
      { data: studyRow({ gallery_entry: approvedEntry() }), error: null },
      [image("after", "https://cdn/after.jpg")],
    );
    const view = await fetchCaseStudyById("cs-1");
    expect(view?.caseStudy.id).toBe("cs-1");
    expect(view?.afterImage?.image_url).toBe("https://cdn/after.jpg");
    expect(view?.beforeImage).toBeNull();
  });
});

describe("upsertCaseStudy", () => {
  it("saves the payload and returns the saved row", async () => {
    singleResult = { data: studyRow(), error: null };
    const saved = await upsertCaseStudy({
      gallery_entry_id: "ge-1",
      headline: "Flat repaint",
      summary: "Full repaint of a 3-bed flat",
      materials_used: ["emulsion"],
      is_published: true,
    });
    expect(saved.id).toBe("cs-1");
  });

  it("rejects when the database errors", async () => {
    singleResult = { data: null, error: { message: "insert failed" } };
    await expect(
      upsertCaseStudy({
        gallery_entry_id: "ge-1",
        headline: "H",
        summary: "S",
      }),
    ).rejects.toThrow("insert failed");
  });
});

describe("setCaseStudyPublished", () => {
  it("propagates update errors", async () => {
    queryResult = { data: null, error: { message: "update failed" } };
    await expect(setCaseStudyPublished("cs-1", false)).rejects.toThrow(
      "update failed",
    );
  });
});
