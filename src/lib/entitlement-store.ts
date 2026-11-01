/**
 * The viewer's entitlement, readable without an auth context.
 *
 * Paywalls are rendered deep inside calculators, and asking each of them for the
 * auth context meant every test that mounted a calculator had to provide one. A
 * tiny store keeps the rule where it belongs: the provider publishes what the
 * account is, the components subscribe, and anything that never publishes stays
 * "unknown", which never hides work.
 */

export interface ViewerEntitlement {
  isPaid?: boolean;
  isAdmin?: boolean;
}

let current: ViewerEntitlement = {};
const listeners = new Set<() => void>();

export function publishEntitlement(next: ViewerEntitlement): void {
  if (next.isPaid === current.isPaid && next.isAdmin === current.isAdmin)
    return;
  current = { ...next };
  for (const listener of listeners) listener();
}

export function readEntitlement(): ViewerEntitlement {
  return current;
}

export function subscribeEntitlement(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Only for tests: forget whatever a previous case published. */
export function resetEntitlement(): void {
  current = {};
  for (const listener of listeners) listener();
}
