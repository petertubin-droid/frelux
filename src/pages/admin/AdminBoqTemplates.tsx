import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import {
  fetchAllSections,
  fetchAllTemplates,
  saveSection,
  saveTemplate,
} from "@/lib/boq/queries";
import type { BoqSectionLibraryRow, BoqTemplateRow } from "@/lib/boq/types";

/**
 * Admin: BOQ templates and the standard section library.
 *
 * Templates carry the market, standard, rounding and which rate columns an
 * export shows; sections are the measured structure a new document starts from.
 * Both are configuration, so a change here reaches every user's next document
 * without touching code.
 */

const FIELD =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const LABEL =
  "block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1";

export default function AdminBoqTemplates() {
  useSeo({
    title: "Admin: BOQ Templates",
    description: "Manage BOQ templates and standard work sections.",
    noIndex: true,
  });

  const [templates, setTemplates] = useState<BoqTemplateRow[]>([]);
  const [sections, setSections] = useState<BoqSectionLibraryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, s] = await Promise.all([fetchAllTemplates(), fetchAllSections()]);
    if (t.error) toast.error(t.error);
    if (s.error) toast.error(s.error);
    setTemplates(t.templates);
    setSections(s.sections);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateTemplate = (id: string, changes: Partial<BoqTemplateRow>) =>
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...changes } : t)),
    );

  const persistTemplate = async (template: BoqTemplateRow) => {
    const { error } = await saveTemplate(template);
    if (error) toast.error(error);
    else toast.success(`${template.name} saved.`);
  };

  const updateSection = (id: string, changes: Partial<BoqSectionLibraryRow>) =>
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...changes } : s)),
    );

  const persistSection = async (section: BoqSectionLibraryRow) => {
    const { error } = await saveSection(section);
    if (error) toast.error(error);
    else toast.success(`Section ${section.code} saved.`);
  };

  const addSection = async () => {
    const nextOrder = (sections[sections.length - 1]?.sort_order ?? 0) + 10;
    const { error } = await saveSection({
      standard: "Commercial",
      code: `S${sections.length + 1}`,
      title: "New section",
      sort_order: nextOrder,
      is_active: true,
    });
    if (error) toast.error(error);
    else void load();
  };

  return (
    <Container>
      <PageHeader
        title="BOQ templates"
        subtitle="Templates, standard sections and export settings."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Templates</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className={LABEL}>Name</label>
                    <input
                      className={FIELD}
                      value={t.name}
                      onChange={(e) =>
                        updateTemplate(t.id, { name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Standard</label>
                    <select
                      className={FIELD}
                      value={t.standard}
                      onChange={(e) =>
                        updateTemplate(t.id, { standard: e.target.value })
                      }
                    >
                      {[
                        "Commercial",
                        "NRM2",
                        "CSI_MASTERFORMAT",
                        "CESMM4",
                        "ICMS",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Market</label>
                    <input
                      className={FIELD}
                      value={t.market_code ?? ""}
                      onChange={(e) =>
                        updateTemplate(t.id, {
                          market_code: e.target.value.toUpperCase() || null,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Currency</label>
                    <input
                      className={FIELD}
                      value={t.currency ?? ""}
                      onChange={(e) =>
                        updateTemplate(t.id, {
                          currency: e.target.value.toUpperCase() || null,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Rounding decimals</label>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      className={FIELD}
                      value={t.rounding_decimals}
                      onChange={(e) =>
                        updateTemplate(t.id, {
                          rounding_decimals: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Default preliminaries %</label>
                    <input
                      type="number"
                      step="0.1"
                      className={FIELD}
                      value={t.default_preliminaries_pct}
                      onChange={(e) =>
                        updateTemplate(t.id, {
                          default_preliminaries_pct:
                            Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Default overhead %</label>
                    <input
                      type="number"
                      step="0.1"
                      className={FIELD}
                      value={t.default_overhead_profit_pct}
                      onChange={(e) =>
                        updateTemplate(t.id, {
                          default_overhead_profit_pct:
                            Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Default contingency %</label>
                    <input
                      type="number"
                      step="0.1"
                      className={FIELD}
                      value={t.default_contingency_pct}
                      onChange={(e) =>
                        updateTemplate(t.id, {
                          default_contingency_pct: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Default retention %</label>
                    <input
                      type="number"
                      step="0.1"
                      className={FIELD}
                      value={t.default_retention_pct}
                      onChange={(e) =>
                        updateTemplate(t.id, {
                          default_retention_pct: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL}>
                      Default tax % (blank = none)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className={FIELD}
                      value={t.default_tax_pct ?? ""}
                      onChange={(e) =>
                        updateTemplate(t.id, {
                          default_tax_pct:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Page size</label>
                    <select
                      className={FIELD}
                      value={t.page_size}
                      onChange={(e) =>
                        updateTemplate(t.id, { page_size: e.target.value })
                      }
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={LABEL}>Footer note</label>
                    <input
                      className={FIELD}
                      value={t.footer_note ?? ""}
                      onChange={(e) =>
                        updateTemplate(t.id, { footer_note: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  {(
                    [
                      ["show_material_rate", "Show material rate"],
                      ["show_labour_rate", "Show labour rate"],
                      ["show_plant_rate", "Show plant rate"],
                      ["is_active", "Active"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(t[key])}
                        onChange={(e) =>
                          updateTemplate(t.id, {
                            [key]: e.target.checked,
                          } as Partial<BoqTemplateRow>)
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => void persistTemplate(t)}
                    className="ml-auto rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Save template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Standard work sections
          </h2>
          <button
            type="button"
            onClick={() => void addSection()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Add section
          </button>
        </div>
        <div className="space-y-2">
          {sections.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-2"
            >
              <div className="w-20">
                <label className={LABEL}>Code</label>
                <input
                  className={FIELD}
                  value={s.code}
                  onChange={(e) =>
                    updateSection(s.id, { code: e.target.value })
                  }
                />
              </div>
              <div className="min-w-[200px] flex-1">
                <label className={LABEL}>Title</label>
                <input
                  className={FIELD}
                  value={s.title}
                  onChange={(e) =>
                    updateSection(s.id, { title: e.target.value })
                  }
                />
              </div>
              <div className="w-24">
                <label className={LABEL}>Order</label>
                <input
                  type="number"
                  className={FIELD}
                  value={s.sort_order}
                  onChange={(e) =>
                    updateSection(s.id, {
                      sort_order: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="w-28">
                <label className={LABEL}>Standard</label>
                <input
                  className={FIELD}
                  value={s.standard}
                  onChange={(e) =>
                    updateSection(s.id, { standard: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={s.is_active}
                  onChange={(e) =>
                    updateSection(s.id, { is_active: e.target.checked })
                  }
                />
                Active
              </label>
              <button
                type="button"
                onClick={() => void persistSection(s)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Save
              </button>
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}
