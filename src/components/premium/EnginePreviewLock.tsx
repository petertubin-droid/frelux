/**
 * The panel a free visitor sees where the rest of a gated takeoff would be.
 *
 * It names the engine, counts the rows that are withheld and lists what the plan
 * adds in the trade's own language. It is deliberately not a wall: the visitor
 * has already seen the inputs and the first lines, so the ask is for the rest of
 * an answer they can already judge.
 */

import { Link } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import type { PremiumEngine } from "@/config/premium-engines";

interface Props {
  engine: PremiumEngine;
  hiddenLines: number;
}

export function EnginePreviewLock({ engine, hiddenLines }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-5">
      <div className="flex items-start gap-3">
        <Lock
          className="mt-0.5 h-5 w-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-semibold">
            {hiddenLines > 0
              ? `${hiddenLines} more ${hiddenLines === 1 ? "line" : "lines"} on a plan`
              : "The rest of this takeoff is on a plan"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The preview shows how {engine.name.toLowerCase()} works on your
            numbers. A subscription shows the full answer and lets you take it
            away.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {engine.unlocks.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="text-primary">
                  +
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/pricing"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            See the plans
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
