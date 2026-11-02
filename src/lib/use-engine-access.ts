/**
 * Reads the gated-engine allowance for a route, re-rendering when the account
 * state changes. One hook so every gated surface asks the same question.
 */

import { useSyncExternalStore } from "react";
import { readEntitlement, subscribeEntitlement } from "@/lib/entitlement-store";
import {
  engineAccessFor,
  type EngineAccess,
} from "@/lib/premium-engine-access";

export function useEngineAccess(route: string): EngineAccess {
  const viewer = useSyncExternalStore(
    subscribeEntitlement,
    readEntitlement,
    readEntitlement,
  );
  return engineAccessFor(route, viewer);
}
