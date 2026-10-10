import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader,
  AdminButton,
  StateMessage,
} from "@/components/admin/AdminUi";

/**
 * Manage homepage testimonials (Track 5, 2026-10-10).
 *
 * The homepage section renders active quotes only, and only from
 * this table. Publish REAL user quotes, with the user's permission;
 * never generated or placeholder content.
 */
interface TestimonialRow {
  id: string;
  quote: string;
  author_name: string;
  author_role: string | null;
  author_location: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const EMPTY_FORM = {
  quote: "",
  author_name: "",
  author_role: "",
  author_location: "",
  sort_order: 0,
};

export default function AdminTestimonials() {
  const [rows, setRows] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("site_testimonials")
      .select("*")
      .order("sort_order", { ascending: true });
    if (err) setError(err.message);
    setRows((data as TestimonialRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (form.quote.trim().length < 10 || !form.author_name.trim()) {
      setError("A quote (10+ characters) and an author name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("site_testimonials").insert({
      quote: form.quote.trim(),
      author_name: form.author_name.trim(),
      author_role: form.author_role.trim() || null,
      author_location: form.author_location.trim() || null,
      sort_order: form.sort_order,
      is_active: true,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setNotice("Testimonial published.");
    setForm(EMPTY_FORM);
    void load();
  };

  const toggle = async (row: TestimonialRow) => {
    setError(null);
    const { error: err } = await supabase
      .from("site_testimonials")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (err) {
      setError(err.message);
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, is_active: !r.is_active } : r,
      ),
    );
  };

  const remove = async (row: TestimonialRow) => {
    if (
      !window.confirm(
        `Delete the testimonial from ${row.author_name}? This cannot be undone.`,
      )
    )
      return;
    const { error: err } = await supabase
      .from("site_testimonials")
      .delete()
      .eq("id", row.id);
    if (err) {
      setError(err.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  return (
    <div>
      <AdminHeader
        title="Testimonials"
        subtitle="Homepage social proof. Publish real user quotes only, with the user's permission. Inactive quotes stay here but never render on the site."
      />

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Add a testimonial
        </h3>
        <textarea
          value={form.quote}
          onChange={(e) => setForm({ ...form, quote: e.target.value })}
          placeholder="The exact quote, as the user wrote it..."
          rows={3}
          className="mb-3 w-full rounded-lg border border-border bg-background p-3 text-sm"
        />
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            value={form.author_name}
            onChange={(e) => setForm({ ...form, author_name: e.target.value })}
            placeholder="Author name"
            className="rounded-lg border border-border bg-background p-2 text-sm"
          />
          <input
            value={form.author_role}
            onChange={(e) => setForm({ ...form, author_role: e.target.value })}
            placeholder="Role (e.g. Homeowner)"
            className="rounded-lg border border-border bg-background p-2 text-sm"
          />
          <input
            value={form.author_location}
            onChange={(e) =>
              setForm({ ...form, author_location: e.target.value })
            }
            placeholder="Location (optional)"
            className="rounded-lg border border-border bg-background p-2 text-sm"
          />
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) =>
              setForm({ ...form, sort_order: parseInt(e.target.value || "0") })
            }
            placeholder="Sort order"
            className="rounded-lg border border-border bg-background p-2 text-sm"
          />
        </div>
        <div className="mt-3">
          <AdminButton onClick={create} disabled={saving}>
            {saving ? "Publishing..." : "Publish testimonial"}
          </AdminButton>
        </div>
      </div>

      {loading && (
        <StateMessage
          type="loading"
          title="Loading testimonials"
          message="Fetching the current homepage quotes."
        />
      )}
      {error && (
        <StateMessage
          type="error"
          title="Something went wrong"
          message={error}
        />
      )}
      {notice && !error && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          {notice}
        </p>
      )}

      {!loading && rows.length === 0 && !error && (
        <StateMessage
          type="empty"
          title="No testimonials yet"
          message="Add real quotes from users above."
        />
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <article
            key={row.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground">
                &ldquo;{row.quote}&rdquo;
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.author_name}
                {row.author_role ? `, ${row.author_role}` : ""}
                {row.author_location ? ` — ${row.author_location}` : ""} · order{" "}
                {row.sort_order}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => toggle(row)}
                className={
                  row.is_active
                    ? "rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                    : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                }
              >
                {row.is_active ? "Active" : "Inactive"}
              </button>
              <button
                onClick={() => remove(row)}
                aria-label={`Delete testimonial from ${row.author_name}`}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
