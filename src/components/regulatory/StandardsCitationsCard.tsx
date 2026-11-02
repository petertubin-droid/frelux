/**
 * FRELUX Engine #5, M2 UI: standards citations card for a quote/calculation.
 *
 * CITE-AND-FLAG, NEVER CERTIFY: for each engine present in the quote's
 * line items (source_calculator_type), this card shows the exact
 * registry standard(s) that apply, with verbatim citations and the
 * never-certify disclaimer. Engines with no standard on file are
 * disclosed as unknowns — nothing is invented.
 */

import { useEffect, useState } from "react";
import {
  flagStandardsForCalculation,
  type StandardsFlagSet,
} from "@/lib/regulatory/standards-citations";

export interface StandardsCitationsCardProps {
  marketCode: string;
  /** Engine ids used by the quote's line items. */
  engines: string[];
}

export default function StandardsCitationsCard({
  marketCode,
  engines,
}: StandardsCitationsCardProps) {
  const [flags, setFlags] = useState<StandardsFlagSet | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFlags(null);
    setFailed(false);
    if (engines.length === 0) return;
    flagStandardsForCalculation(marketCode, engines)
      .then((f) => alive && setFlags(f))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [marketCode, engines.join(",")]);

  if (engines.length === 0) return null;

  return (
    <details className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm dark:border-white/5">
      <summary className="cursor-pointer font-medium">
        Applicable standards — {marketCode.toUpperCase()}
      </summary>

      {!flags && !failed && (
        <p className="mt-3 text-muted-foreground">
          Resolving applicable standards from the registry…
        </p>
      )}
      {failed && (
        <p className="mt-3 text-muted-foreground">
          The standards registry could not be reached right now. No
          standards are shown rather than guessed ones.
        </p>
      )}

      {flags && (
        <div className="mt-3 grid gap-2">
          {flags.flags.length === 0 && flags.unknownEngines.length > 0 && (
            <p className="text-muted-foreground">
              No standard is on file in the registry for the engines in
              this quote. None is invented: confirm requirements with the
              relevant authority.
            </p>
          )}
          {flags.flags.map((f) => (
            <div key={`${f.engine}-${f.ref}`} data-testid="std-flag">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {f.engine}
              </span>{" "}
              <span className="font-medium">{f.ref}</span> — {f.citation}
              {f.evidenceUrl ? (
                <>
                  {" "}
                  <a
                    href={f.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    evidence
                  </a>
                </>
              ) : null}
              {f.confidence && f.confidence !== "high" ? (
                <span className="ml-1 rounded bg-amber-500/10 px-1 py-0.5 text-xs text-amber-600">
                  pending verification
                </span>
              ) : null}
            </div>
          ))}
          {flags.unknownEngines.length > 0 && (
            <p className="text-xs text-muted-foreground">
              No standard on file for: {flags.unknownEngines.join(", ")}.{" "}
              Those scopes are disclosed as unknowns, never guessed.
            </p>
          )}
          <p className="text-xs text-muted-foreground">{flags.disclaimer}</p>
        </div>
      )}
    </details>
  );
}
