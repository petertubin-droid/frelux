// =========================================================
// FRELUX ARCHIE STAGE 1, LEARNING
//
// The ARCHIE learning pipeline, made visible: every ingestion
// with its real pipeline state and candidate count. Promotion
// is ALWAYS a human Owner action (RLS-enforced); ARCHIE never
// approves its own learning.
// =========================================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const PIPELINE = [
  "INPUT",
  "EXTRACT",
  "UNDERSTAND",
  "STRUCTURE",
  "VALIDATE",
  "EVALUATE",
  "SHOW OWNER",
  "OWNER APPROVAL",
  "VERSION",
  "KNOWLEDGE",
];

interface Ingestion {
  id: string;
  title: string;
  domain: string;
  input_type: string;
  pipeline_state: string;
  candidate_count: number;
  created_date: string;
}

export default function ArchieLearning() {
  const [ingestions, setIngestions] = useState<Ingestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("frelux_archie_ingestions")
          .select(
            "id,title,domain,input_type,pipeline_state,candidate_count,created_date",
          )
          .order("created_date", { ascending: false })
          .limit(30);
        if (error) setError(error.message);
        else setIngestions((data ?? []) as Ingestion[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6" data-testid="archie-learning">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">
          Learning
        </h1>
        <p className="text-sm text-muted-foreground">
          How ARCHIE learns. ARCHIE shows you what it believes it learned before
          anything becomes knowledge. You are the approval step.
        </p>
      </div>

      <section
        aria-label="Learning pipeline"
        className="rounded-xl border border-border bg-card p-4"
      >
        <h2 className="mb-2 font-display text-base font-bold text-foreground">
          Pipeline
        </h2>
        <ol className="flex flex-wrap gap-1.5">
          {PIPELINE.map((step, i) => (
            <li key={step} className="flex items-center gap-1.5">
              <span
                className={
                  i >= 6
                    ? "rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
                    : "rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground"
                }
              >
                {step}
              </span>
              {i < PIPELINE.length - 1 && (
                <span aria-hidden="true" className="text-muted-foreground">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          The highlighted steps are the Owner gates: ARCHIE can never approve
          its own learning.
        </p>
      </section>

      <section aria-label="Ingestions">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">
            Recent ingestions
          </h2>
          <Link
            to="/admin/archie-training"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Review and approve candidates{" "}
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        {loading ? (
          <p
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
            Loading ingestions…
          </p>
        ) : error ? (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
          </p>
        ) : ingestions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nothing has been taught to ARCHIE yet. Use Teach ARCHIE in a
            conversation to start.
          </p>
        ) : (
          <ul className="space-y-2">
            {ingestions.map((i) => (
              <li
                key={i.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground line-clamp-1">
                    {i.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {i.domain} · {i.input_type} ·{" "}
                    {new Date(i.created_date).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {i.pipeline_state}
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {i.candidate_count} candidate(s)
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
