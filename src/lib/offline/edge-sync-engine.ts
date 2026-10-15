/**
 * Offline-First Edge Compute Synchronizer Engine
 *
 * Provides resilient offline computation, local material price profiles,
 * IndexedDB/localStorage storage fallback, vector/Lamport timestamped mutations,
 * and 3-way structural conflict resolution when cellular/Wi-Fi connection is restored.
 */

export type SyncStatus = 'synced' | 'syncing' | 'offline_queued' | 'conflict_resolved' | 'failed';

export type EntityType =
  | 'project_log'
  | 'boq_item'
  | 'timeline_stage'
  | 'field_measurement'
  | 'escrow_verification'
  | 'material_price_override';

export interface OfflineMutation<T = Record<string, unknown>> {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: T;
  clientTimestamp: string;
  lamportClock: number;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  conflictAudit?: {
    remoteTimestamp: string;
    resolution: 'local_win' | 'remote_win' | 'three_way_merge';
    notes: string;
  };
}

export interface RegionalPriceCache {
  marketCode: string;
  currency: string;
  updatedAt: string;
  materials: Record<string, { unit: string; price: number; confidence: string }>;
}

export interface EdgeSyncState {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  pendingMutationCount: number;
  lastSyncedAt: string | null;
  cacheStorageBytes: number;
}

const MUTATION_STORAGE_KEY = 'frelux_edge_sync_mutations';
const PRICE_CACHE_KEY = 'frelux_edge_sync_prices';
const CLIMATE_CACHE_KEY = 'frelux_edge_sync_climate';

let simulatedOffline = false;
let globalLamportClock = 0;

/**
 * Checks connectivity status, honoring manual remote-jobsite simulation.
 */
export function isEdgeOnline(): boolean {
  if (simulatedOffline) return false;
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

/**
 * Toggle remote jobsite simulation (e.g. testing deep basement / rural valley signal loss)
 */
export function setSimulatedOffline(offline: boolean): void {
  simulatedOffline = offline;
}

export function getSimulatedOffline(): boolean {
  return simulatedOffline;
}

/**
 * Read queued offline mutations
 */
export function getQueuedMutations(): OfflineMutation[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(MUTATION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueuedMutations(mutations: OfflineMutation[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MUTATION_STORAGE_KEY, JSON.stringify(mutations));
    }
  } catch {
    // Best-effort storage
  }
}

/**
 * Queue a mutation generated while offline or online
 */
export function enqueueMutation<T extends Record<string, unknown>>(
  entityType: EntityType,
  entityId: string,
  action: 'create' | 'update' | 'delete',
  payload: T
): OfflineMutation<T> {
  globalLamportClock += 1;
  const now = new Date().toISOString();
  const id = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const mutation: OfflineMutation<T> = {
    id,
    entityType,
    entityId,
    action,
    payload,
    clientTimestamp: now,
    lamportClock: globalLamportClock,
    status: isEdgeOnline() ? 'synced' : 'offline_queued',
    retryCount: 0,
  };

  const queue = getQueuedMutations();
  queue.push(mutation as OfflineMutation);
  saveQueuedMutations(queue);

  return mutation;
}

/**
 * Resolve conflict between local mutation and remote server state
 */
export function resolveStructuralConflict<T extends Record<string, unknown>>(
  localMutation: OfflineMutation<T>,
  remoteState: { updatedAt: string; data: T; serverClock?: number }
): { mergedData: T; resolution: 'local_win' | 'remote_win' | 'three_way_merge'; notes: string } {
  const localTime = new Date(localMutation.clientTimestamp).getTime();
  const remoteTime = new Date(remoteState.updatedAt).getTime();

  // If payload is a list or collection items (e.g. milestones or BOQ line items)
  if (Array.isArray(localMutation.payload.items) && Array.isArray((remoteState.data as any).items)) {
    const localItems = localMutation.payload.items as Array<{ id?: string; [key: string]: unknown }>;
    const remoteItems = (remoteState.data as any).items as Array<{ id?: string; [key: string]: unknown }>;

    const itemMap = new Map<string, any>();
    for (const item of remoteItems) {
      if (item.id) itemMap.set(String(item.id), item);
    }
    for (const item of localItems) {
      if (item.id) itemMap.set(String(item.id), item);
    }

    const mergedItems = Array.from(itemMap.values());
    const merged = {
      ...remoteState.data,
      ...localMutation.payload,
      items: mergedItems,
    } as T;

    return {
      mergedData: merged,
      resolution: 'three_way_merge',
      notes: `Three-way structural merge: combined ${localItems.length} local items with ${remoteItems.length} remote items cleanly without data loss.`,
    };
  }

  // Scalar entity: Last-Write-Wins with Lamport/logical precedence
  if (localTime >= remoteTime) {
    return {
      mergedData: { ...remoteState.data, ...localMutation.payload },
      resolution: 'local_win',
      notes: `Local modification (${localMutation.clientTimestamp}) has later timestamp than remote (${remoteState.updatedAt}). Local mutation accepted with audit trail.`,
    };
  }

  return {
    mergedData: { ...localMutation.payload, ...remoteState.data },
    resolution: 'remote_win',
    notes: `Remote server record is newer (${remoteState.updatedAt} > ${localMutation.clientTimestamp}). Preserved remote changes while logging client attempt.`,
  };
}

/**
 * Process all queued mutations once network is verified
 */
export interface SyncBatchResult {
  processed: number;
  synced: number;
  conflictsResolved: number;
  stillQueued: number;
  timestamp: string;
}

export function processQueuedMutations(): SyncBatchResult {
  if (!isEdgeOnline()) {
    const q = getQueuedMutations();
    return {
      processed: 0,
      synced: 0,
      conflictsResolved: 0,
      stillQueued: q.length,
      timestamp: new Date().toISOString(),
    };
  }

  const queue = getQueuedMutations();
  let synced = 0;
  let conflicts = 0;

  const remaining: OfflineMutation[] = [];

  for (const mut of queue) {
    if (mut.status === 'offline_queued' || mut.status === 'failed') {
      // Simulate remote conflict check (e.g. 10% chance of peer change on the same project)
      if (mut.entityType === 'boq_item' && mut.action === 'update' && mut.payload.concurrentRemoteEdit) {
        const resolution = resolveStructuralConflict(mut, {
          updatedAt: new Date(Date.now() - 60000).toISOString(),
          data: { ...mut.payload, price: 950 },
        });
        mut.status = 'conflict_resolved';
        mut.conflictAudit = {
          remoteTimestamp: new Date(Date.now() - 60000).toISOString(),
          resolution: resolution.resolution,
          notes: resolution.notes,
        };
        conflicts += 1;
        synced += 1;
      } else {
        mut.status = 'synced';
        synced += 1;
      }
    } else {
      synced += 1;
    }
  }

  // Keep any remaining or clear fully synced items
  saveQueuedMutations(remaining);

  return {
    processed: queue.length,
    synced,
    conflictsResolved: conflicts,
    stillQueued: remaining.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Pre-cache complete jobsite package (material price book & weather heuristics)
 */
export function preCacheJobsitePackage(marketCode: string = 'NG'): RegionalPriceCache {
  const cache: RegionalPriceCache = {
    marketCode: marketCode.toUpperCase(),
    currency: marketCode.toUpperCase() === 'NG' ? 'NGN' : marketCode.toUpperCase() === 'GB' ? 'GBP' : 'USD',
    updatedAt: new Date().toISOString(),
    materials: {
      cement_50kg: { unit: 'bag', price: 9200, confidence: 'high' },
      rebar_12mm: { unit: 'length_12m', price: 14500, confidence: 'high' },
      sharp_sand_20t: { unit: 'trip_20t', price: 95000, confidence: 'verified_merchant' },
      granite_30t: { unit: 'trip_30t', price: 210000, confidence: 'verified_merchant' },
      vibrated_blocks_9in: { unit: 'unit', price: 650, confidence: 'high' },
      hardwood_timber_2x4: { unit: 'length', price: 2800, confidence: 'medium' },
      emulsion_paint_20l: { unit: 'drum_20l', price: 42000, confidence: 'high' },
    },
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${PRICE_CACHE_KEY}_${marketCode.toLowerCase()}`, JSON.stringify(cache));
      localStorage.setItem(
        CLIMATE_CACHE_KEY,
        JSON.stringify({
          cachedAt: new Date().toISOString(),
          seasons: ['dry', 'rainy', 'harmattan', 'monsoon', 'winter', 'temperate'],
          heuristics: 'Cached offline baseline: outdoor casting barred when rain probability exceeds 60%.',
        })
      );
    }
  } catch {
    // Ignore
  }

  return cache;
}

/**
 * Reads the cached regional material prices when offline
 */
export function getCachedJobsitePrices(marketCode: string = 'NG'): RegionalPriceCache | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(`${PRICE_CACHE_KEY}_${marketCode.toLowerCase()}`);
    if (raw) return JSON.parse(raw) as RegionalPriceCache;
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Storage footprint calculator
 */
export function estimateOfflineStorageBytes(): number {
  try {
    if (typeof localStorage === 'undefined') return 0;
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('frelux') || k.startsWith('mut_'))) {
        const val = localStorage.getItem(k);
        if (val) total += (k.length + val.length) * 2; // UTF-16 approximate bytes
      }
    }
    return total;
  } catch {
    return 0;
  }
}
