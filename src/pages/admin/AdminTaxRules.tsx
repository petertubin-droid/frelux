import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, AlertTriangle, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminCard,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminButton,
  StateMessage,
  Toggle,
} from "@/components/admin/AdminUi";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { AdminModal } from "@/components/admin/AdminModal";
import AdminPagination from "@/components/admin/AdminPagination";
import { useToast } from "@/components/ui/Toast";

/**
 * Tax rules by market.
 *
 * The quote surfaces show "tax not determined" rather than guessing a rate,
 * which is correct and, until this screen existed, permanent: 42 markets had no
 * rule and no way to add one. A rule here is a citation, not a number: the
 * database refuses an active rule without a named reviewer, a next review date
 * and a source, and every change is audited with the actor.
 */

interface TaxRule {
  id: string;
  rule_code: string;
  version: number;
  market_code: string;
  jurisdiction_level: "national" | "regional" | "state" | "municipal";
  jurisdiction_code: string | null;
  tax_category: "consumption" | "withholding" | "settlement";
  tax_name: string;
  components: { name: string; rate_pct: number; compound_on?: string | null }[];
  basis_inclusive: boolean;
  taxable_base_definition: string;
  rounding_method: "half_up" | "half_even" | "down";
  exemption_handling: string;
  unknown_handling: string;
  applies_to: "materials" | "services" | "both";
  effective_from: string;
  effective_to: string | null;
  source_title: string;
  source_url: string;
  source_publisher: string;
  reviewer_name: string | null;
  next_review_date: string | null;
  is_active: boolean;
  updated_at: string;
}

interface MarketOption {
  country_code: string;
  country_name: string;
}

const BLANK = {
  rule_code: "",
  version: 1,
  market_code: "NG",
  jurisdiction_level: "national" as TaxRule["jurisdiction_level"],
  jurisdiction_code: "",
  tax_category: "consumption" as TaxRule["tax_category"],
  tax_name: "VAT",
  components: [
    { name: "VAT", rate_pct: 0, compound_on: null },
  ] as TaxRule["components"],
  basis_inclusive: false,
  taxable_base_definition: "",
  rounding_method: "half_up" as TaxRule["rounding_method"],
  exemption_handling: "excluded_from_base",
  unknown_handling: "not_determined",
  applies_to: "both" as TaxRule["applies_to"],
  effective_from: "",
  effective_to: "",
  source_title: "",
  source_url: "",
  source_publisher: "",
  reviewer_name: "",
  next_review_date: "",
  is_active: false,
};

/** Dates are shown as the ISO day they are recorded as: a tax effective date
 * has no time zone, and a locale-rendered date could shift it by a day. */
function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function rateSummary(rule: TaxRule): string {
  return (rule.components ?? [])
    .map((c) => `${c.name} ${c.rate_pct}%`)
    .join(" + ");
}

function reviewState(rule: TaxRule): "ok" | "due" | "overdue" | "none" {
  if (!rule.next_review_date) return "none";
  const due = new Date(`${rule.next_review_date}T00:00:00Z`).getTime();
  const now = Date.now();
  if (due < now) return "overdue";
  if (due - now < 30 * 24 * 3600 * 1000) return "due";
  return "ok";
}

export default function AdminTaxRules() {
  const { toast } = useToast();
  const [rows, setRows] = useState<TaxRule[]>([]);
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marketFilter, setMarketFilter] = useState("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [editing, setEditing] = useState<TaxRule | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ruleRows, error: ruleError }, { data: marketRows }] =
      await Promise.all([
        supabase
          .from("tax_jurisdiction_rules")
          .select("*")
          .order("market_code")
          .order("rule_code")
          .order("version", { ascending: false }),
        supabase
          .from("market_profiles")
          .select("country_code, country_name")
          .order("country_code"),
      ]);
    if (ruleError) setError(ruleError.message);
    else {
      setError("");
      setRows((ruleRows ?? []) as unknown as TaxRule[]);
    }
    setMarkets((marketRows ?? []) as MarketOption[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const filtered = rows.filter(
      (r) =>
        (marketFilter === "all" || r.market_code === marketFilter) &&
        (!activeOnly || r.is_active),
    );
    return filtered;
  }, [rows, marketFilter, activeOnly]);

  const paged = visible.slice(page * pageSize, page * pageSize + pageSize);

  function openNew() {
    setForm({ ...BLANK });
    // A draft, distinguished from an existing rule by a blank id.
    setEditing({ id: "" } as unknown as TaxRule);
  }

  function openEdit(rule: TaxRule) {
    setEditing(rule);
    setForm({
      rule_code: rule.rule_code,
      version: rule.version,
      market_code: rule.market_code,
      jurisdiction_level: rule.jurisdiction_level,
      jurisdiction_code: rule.jurisdiction_code ?? "",
      tax_category: rule.tax_category,
      tax_name: rule.tax_name,
      components: rule.components ?? [
        { name: rule.tax_name, rate_pct: 0, compound_on: null },
      ],
      basis_inclusive: rule.basis_inclusive,
      taxable_base_definition: rule.taxable_base_definition,
      rounding_method: rule.rounding_method,
      exemption_handling: rule.exemption_handling,
      unknown_handling: rule.unknown_handling,
      applies_to: rule.applies_to,
      effective_from: rule.effective_from,
      effective_to: rule.effective_to ?? "",
      source_title: rule.source_title,
      source_url: rule.source_url,
      source_publisher: rule.source_publisher,
      reviewer_name: rule.reviewer_name ?? "",
      next_review_date: rule.next_review_date ?? "",
      is_active: rule.is_active,
    });
  }

  async function save() {
    if (!form.rule_code.trim()) {
      toast({
        type: "error",
        title: "A rule code is needed",
        message: "e.g. DE-VAT-STD",
      });
      return;
    }
    if (!form.taxable_base_definition.trim()) {
      toast({
        type: "error",
        title: "Describe what is taxed",
        message: "The quote surfaces show this to explain the rule.",
      });
      return;
    }
    if (
      form.is_active &&
      (!form.reviewer_name.trim() || !form.next_review_date)
    ) {
      toast({
        type: "error",
        title: "An active rule needs a reviewer and a review date",
        message: "Leave it inactive until both are known.",
      });
      return;
    }
    const payload = {
      rule_code: form.rule_code.trim(),
      version: Number(form.version) || 1,
      market_code: form.market_code,
      jurisdiction_level: form.jurisdiction_level,
      jurisdiction_code: form.jurisdiction_code.trim() || null,
      tax_category: form.tax_category,
      tax_name: form.tax_name.trim() || form.components[0]?.name || "Tax",
      components: form.components.map((c) => ({
        name: c.name,
        rate_pct: Number(c.rate_pct),
        compound_on: c.compound_on || null,
      })),
      basis_inclusive: form.basis_inclusive,
      taxable_base_definition: form.taxable_base_definition.trim(),
      rounding_method: form.rounding_method,
      exemption_handling: form.exemption_handling,
      unknown_handling: form.unknown_handling,
      applies_to: form.applies_to,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      source_title: form.source_title.trim(),
      source_url: form.source_url.trim(),
      source_publisher: form.source_publisher.trim(),
      reviewer_name: form.reviewer_name.trim() || null,
      next_review_date: form.next_review_date || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    const isNew = !editing?.id;
    const { error: writeError } = isNew
      ? await supabase.from("tax_jurisdiction_rules").insert(payload)
      : await supabase
          .from("tax_jurisdiction_rules")
          .update(payload)
          .eq("id", editing?.id as string);
    setSaving(false);

    if (writeError) {
      toast({ type: "error", title: "Not saved", message: writeError.message });
      return;
    }
    toast({
      type: "success",
      title: isNew ? "Rule added" : "Rule updated",
      message: form.is_active
        ? "Quotes in this market will use it where the jurisdiction matches."
        : "Saved inactive, so no quote uses it yet.",
    });
    setEditing(null);
    void load();
  }

  async function setActive(rule: TaxRule, next: boolean) {
    const { error: writeError } = await supabase
      .from("tax_jurisdiction_rules")
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq("id", rule.id);
    if (writeError) {
      toast({
        type: "error",
        title: "Not changed",
        message: writeError.message,
      });
      return;
    }
    toast({
      type: "success",
      title: next ? "Rule activated" : "Rule deactivated",
      message: next
        ? "It now applies to matching quotes."
        : "Quotes in that market fall back to tax not determined.",
    });
    void load();
  }

  return (
    <>
      <AdminPageHeader
        title="Tax rules"
        description="Verified consumption tax by market. A quote with no matching rule says tax not determined rather than guessing."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Market
          </span>
          <AdminSelect
            value={marketFilter}
            onChange={(e) => {
              setMarketFilter(e.target.value);
              setPage(0);
            }}
            className="min-w-[180px]"
          >
            <option value="all">All markets</option>
            {markets.map((m) => (
              <option key={m.country_code} value={m.country_code}>
                {m.country_code} · {m.country_name}
              </option>
            ))}
          </AdminSelect>
        </label>
        <div className="flex items-center gap-2 pb-2">
          <Toggle
            checked={activeOnly}
            onChange={setActiveOnly}
            label="Active only"
          />
        </div>
        <div className="ml-auto pb-2">
          <AdminButton
            type="button"
            onClick={openNew}
            className="min-h-9 rounded-lg px-3 text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> New rule
          </AdminButton>
        </div>
      </div>

      {loading ? (
        <StateMessage
          type="loading"
          title="Reading rules"
          message="Loading tax rules…"
        />
      ) : error ? (
        <StateMessage
          type="error"
          title="Could not read rules"
          message={error}
        />
      ) : visible.length === 0 ? (
        <StateMessage
          type="empty"
          title="No rules yet"
          message="No market has a verified rule with these filters. Add one with its citation and reviewer."
        />
      ) : (
        <AdminCard>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Market</th>
                  <th className="px-3 py-2 font-medium">Rule</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 font-medium">Effective</th>
                  <th className="px-3 py-2 font-medium">Review</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {paged.map((rule) => {
                  const review = reviewState(rule);
                  return (
                    <tr
                      key={rule.id}
                      className="border-t border-border/40 align-top"
                    >
                      <td className="px-3 py-2 font-medium text-foreground">
                        {rule.market_code}
                        <div className="text-xs font-normal text-muted-foreground">
                          {rule.jurisdiction_level}
                          {rule.jurisdiction_code
                            ? ` · ${rule.jurisdiction_code}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-foreground">{rule.rule_code}</div>
                        <div className="text-xs text-muted-foreground">
                          v{rule.version} · {rule.tax_name}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {rateSummary(rule)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(rule.effective_from)}
                        {rule.effective_to
                          ? ` → ${formatDate(rule.effective_to)}`
                          : ""}
                      </td>
                      <td className="px-3 py-2">
                        {rule.next_review_date ? (
                          <span
                            className={
                              review === "overdue"
                                ? "text-red-600 dark:text-red-400"
                                : review === "due"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-muted-foreground"
                            }
                          >
                            {formatDate(rule.next_review_date)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            rule.is_active
                              ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                          }
                        >
                          {rule.is_active ? "active" : "inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <AdminButton
                            type="button"
                            onClick={() => openEdit(rule)}
                            className="min-h-8 rounded-lg border border-border px-2.5 text-xs dark:border-white/10"
                          >
                            <Pencil
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />{" "}
                            Edit
                          </AdminButton>
                          <AdminButton
                            type="button"
                            onClick={() =>
                              void setActive(rule, !rule.is_active)
                            }
                            className="min-h-8 rounded-lg border border-border px-2.5 text-xs dark:border-white/10"
                          >
                            {rule.is_active ? "Deactivate" : "Activate"}
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visible.length > pageSize && (
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={visible.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(0);
              }}
            />
          )}
        </AdminCard>
      )}

      <AdminModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${form.rule_code}` : "New tax rule"}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <p>
              A rule is a citation, not a number. The database refuses to
              activate one without a named reviewer, a next review date and a
              source, and every change is audited.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Market">
              <AdminSelect
                value={form.market_code}
                onChange={(e) =>
                  setForm({ ...form, market_code: e.target.value })
                }
              >
                {markets.map((m) => (
                  <option key={m.country_code} value={m.country_code}>
                    {m.country_code} · {m.country_name}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField
              label="Rule code"
              hint="Unique with the version, e.g. DE-VAT-STD"
            >
              <AdminInput
                value={form.rule_code}
                onChange={(e) =>
                  setForm({ ...form, rule_code: e.target.value })
                }
              />
            </AdminField>
            <AdminField label="Version">
              <AdminInput
                type="number"
                value={form.version}
                onChange={(e) =>
                  setForm({ ...form, version: Number(e.target.value) })
                }
              />
            </AdminField>
            <AdminField label="Jurisdiction level">
              <AdminSelect
                value={form.jurisdiction_level}
                onChange={(e) =>
                  setForm({
                    ...form,
                    jurisdiction_level: e.target
                      .value as TaxRule["jurisdiction_level"],
                  })
                }
              >
                {["national", "regional", "state", "municipal"].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Jurisdiction code" hint="Optional, e.g. NG-LA">
              <AdminInput
                value={form.jurisdiction_code}
                onChange={(e) =>
                  setForm({ ...form, jurisdiction_code: e.target.value })
                }
              />
            </AdminField>
            <AdminField
              label="Tax name"
              hint="Shown on the quote, e.g. VAT, GST, MwSt"
            >
              <AdminInput
                value={form.tax_name}
                onChange={(e) => setForm({ ...form, tax_name: e.target.value })}
              />
            </AdminField>
          </div>

          <AdminField
            label="Components"
            hint="Rates are percentages. A component may compound on an earlier one."
          >
            <div className="space-y-2">
              {form.components.map((comp, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <AdminInput
                    value={comp.name}
                    placeholder="Name"
                    onChange={(e) => {
                      const next = [...form.components];
                      next[index] = { ...next[index], name: e.target.value };
                      setForm({ ...form, components: next });
                    }}
                    className="min-w-[120px] flex-1"
                  />
                  <AdminInput
                    type="number"
                    value={comp.rate_pct}
                    onChange={(e) => {
                      const next = [...form.components];
                      next[index] = {
                        ...next[index],
                        rate_pct: Number(e.target.value),
                      };
                      setForm({ ...form, components: next });
                    }}
                    className="w-24"
                  />
                  <AdminSelect
                    value={comp.compound_on ?? ""}
                    onChange={(e) => {
                      const next = [...form.components];
                      next[index] = {
                        ...next[index],
                        compound_on: e.target.value || null,
                      };
                      setForm({ ...form, components: next });
                    }}
                    className="w-40"
                  >
                    <option value="">additive</option>
                    {form.components.slice(0, index).map((prior) => (
                      <option key={prior.name} value={prior.name}>
                        on {prior.name}
                      </option>
                    ))}
                  </AdminSelect>
                  {form.components.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          components: form.components.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                      className="min-h-8 rounded-lg border border-border px-2 text-xs text-muted-foreground dark:border-white/10"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    components: [
                      ...form.components,
                      { name: "", rate_pct: 0, compound_on: null },
                    ],
                  })
                }
                className="min-h-8 rounded-lg border border-border px-2.5 text-xs dark:border-white/10"
              >
                Add component
              </button>
            </div>
          </AdminField>

          <AdminField
            label="What is taxed"
            hint="Plain words, shown to whoever reads the quote"
          >
            <AdminInput
              value={form.taxable_base_definition}
              onChange={(e) =>
                setForm({ ...form, taxable_base_definition: e.target.value })
              }
            />
          </AdminField>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Applies to">
              <AdminSelect
                value={form.applies_to}
                onChange={(e) =>
                  setForm({
                    ...form,
                    applies_to: e.target.value as TaxRule["applies_to"],
                  })
                }
              >
                {["both", "materials", "services"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Rounding">
              <AdminSelect
                value={form.rounding_method}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rounding_method: e.target
                      .value as TaxRule["rounding_method"],
                  })
                }
              >
                {["half_up", "half_even", "down"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Effective from">
              <AdminInput
                type="date"
                value={form.effective_from}
                onChange={(e) =>
                  setForm({ ...form, effective_from: e.target.value })
                }
              />
            </AdminField>
            <AdminField label="Effective to" hint="Leave blank while current">
              <AdminInput
                type="date"
                value={form.effective_to}
                onChange={(e) =>
                  setForm({ ...form, effective_to: e.target.value })
                }
              />
            </AdminField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField
              label="Source title"
              hint="The act or guidance being cited"
            >
              <AdminInput
                value={form.source_title}
                onChange={(e) =>
                  setForm({ ...form, source_title: e.target.value })
                }
              />
            </AdminField>
            <AdminField
              label="Source URL"
              hint="Link to the authority's own page"
            >
              <AdminInput
                value={form.source_url}
                onChange={(e) =>
                  setForm({ ...form, source_url: e.target.value })
                }
              />
            </AdminField>
            <AdminField label="Publisher">
              <AdminInput
                value={form.source_publisher}
                onChange={(e) =>
                  setForm({ ...form, source_publisher: e.target.value })
                }
              />
            </AdminField>
            <AdminField
              label="Reviewer"
              hint="Who checked it against the source"
            >
              <AdminInput
                value={form.reviewer_name}
                onChange={(e) =>
                  setForm({ ...form, reviewer_name: e.target.value })
                }
              />
            </AdminField>
            <AdminField label="Next review date">
              <AdminInput
                type="date"
                value={form.next_review_date}
                onChange={(e) =>
                  setForm({ ...form, next_review_date: e.target.value })
                }
              />
            </AdminField>
            <div className="flex items-end pb-2">
              <Toggle
                checked={form.is_active}
                onChange={(v) => setForm({ ...form, is_active: v })}
                label="Use this rule on quotes"
              />
            </div>
          </div>

          {form.is_active &&
            (!form.reviewer_name.trim() || !form.next_review_date) && (
              <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Add the reviewer and review date, or this rule cannot be
                activated.
              </p>
            )}

          <div className="flex justify-end gap-2 pt-1">
            <AdminButton
              type="button"
              onClick={() => setEditing(null)}
              className="min-h-9 rounded-lg border border-border px-3 text-sm dark:border-white/10"
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="min-h-9 rounded-lg bg-primary px-3 text-sm text-primary-foreground"
            >
              Save rule
            </AdminButton>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
