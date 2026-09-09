// =========================================================
// FRELUX ARCHIE STAGE 1, KNOWLEDGE
//
// Browse the approved ARCHIE knowledge base and see the
// scope separation the system enforces. Owner private
// knowledge never automatically becomes global FRELUX
// knowledge; scopes are enforced by the learning pipeline.
// =========================================================
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SCOPES: { name: string; detail: string }[] = [
  {
    name: "Owner Private",
    detail: "Visible only to the Owner. Never promoted automatically.",
  },
  {
    name: "Family / Trusted People",
    detail: "Shared with trusted people, scoped and revocable.",
  },
  { name: "Project", detail: "Bound to a specific project." },
  { name: "Property", detail: "Bound to a specific property." },
  {
    name: "Regional",
    detail: "Valid in a defined region (prices, regulations, climate).",
  },
  {
    name: "FRELUX Candidate",
    detail: "Proposed for the public knowledge base; not yet approved.",
  },
  { name: "FRELUX Approved", detail: "Approved public FRELUX knowledge." },
  {
    name: "Public / General",
    detail: "General reference knowledge with provenance.",
  },
];

interface KnowledgeItem {
  id: string;
  topic: string;
  capability: string;
  scope: string;
  confidence: number | null;
  status: string;
}

export default function ArchieKnowledge() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("frelux_knowledge_items")
          .select("id,topic,capability,scope,confidence,status")
          .in("status", ["ACTIVE", "PENDING"])
          .order("created_date", { ascending: false })
          .limit(50);
        if (error) setError(error.message);
        else setItems((data ?? []) as KnowledgeItem[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6" data-testid="archie-knowledge">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">
          Knowledge
        </h1>
        <p className="text-sm text-muted-foreground">
          ARCHIE's knowledge base and the scope boundaries it enforces.
          Knowledge is not authority: knowing something never grants permission
          to act on it.
        </p>
      </div>

      <section
        aria-label="Knowledge scopes"
        className="rounded-xl border border-border bg-card p-4"
      >
        <h2 className="mb-3 font-display text-base font-bold text-foreground">
          Scopes
        </h2>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {SCOPES.map((s) => (
            <li key={s.name}>
              <p className="text-sm font-semibold text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Knowledge items">
        <h2 className="mb-3 font-display text-base font-bold text-foreground">
          Items
        </h2>
        {loading ? (
          <p
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
            Loading knowledge…
          </p>
        ) : error ? (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
          </p>
        ) : items.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            No knowledge items yet. Teach ARCHIE from a conversation or the
            training console.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((k) => (
              <li
                key={k.id}
                className="rounded-xl border border-border bg-card p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {k.topic}
                  </p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {k.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {k.capability} · scope: {k.scope}
                  {k.confidence !== null &&
                    ` · confidence ${Math.round((k.confidence ?? 0) * 100)}%`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
