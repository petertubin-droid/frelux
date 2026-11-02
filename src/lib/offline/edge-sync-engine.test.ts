import { describe, it, expect, beforeEach } from 'vitest';
import {
  isEdgeOnline,
  setSimulatedOffline,
  enqueueMutation,
  getQueuedMutations,
  resolveStructuralConflict,
  processQueuedMutations,
  preCacheJobsitePackage,
  getCachedJobsitePrices,
  estimateOfflineStorageBytes,
} from './edge-sync-engine';

describe('Offline-First Edge Compute Sync Engine', () => {
  beforeEach(() => {
    setSimulatedOffline(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('detects online and simulated offline jobsite environments', () => {
    expect(isEdgeOnline()).toBe(true);
    setSimulatedOffline(true);
    expect(isEdgeOnline()).toBe(false);
    setSimulatedOffline(false);
    expect(isEdgeOnline()).toBe(true);
  });

  it('enqueues mutations with logical Lamport timestamps while offline', () => {
    setSimulatedOffline(true);
    const m1 = enqueueMutation('project_log', 'proj_101', 'update', { notes: 'Foundation poured' });
    expect(m1.status).toBe('offline_queued');
    expect(m1.lamportClock).toBeGreaterThan(0);

    const queue = getQueuedMutations();
    expect(queue.length).toBe(1);
    expect(queue[0].entityId).toBe('proj_101');
  });

  it('performs three-way structural merge for list entities without data loss', () => {
    const localMut = {
      id: 'm1',
      entityType: 'boq_item' as const,
      entityId: 'boq_1',
      action: 'update' as const,
      payload: {
        items: [
          { id: 'item_1', name: 'Cement 50kg', qty: 100 },
          { id: 'item_3', name: 'Sand 20t', qty: 2 },
        ],
      },
      clientTimestamp: '2026-10-15T12:00:00Z',
      lamportClock: 2,
      status: 'offline_queued' as const,
      retryCount: 0,
    };

    const remoteState = {
      updatedAt: '2026-10-15T12:05:00Z',
      data: {
        items: [
          { id: 'item_1', name: 'Cement 50kg', qty: 100 },
          { id: 'item_2', name: 'Rebar 12mm', qty: 50 },
        ],
      },
    };

    const resolved = resolveStructuralConflict(localMut, remoteState);
    expect(resolved.resolution).toBe('three_way_merge');
    expect(resolved.mergedData.items.length).toBe(3);
  });

  it('resolves scalar conflicts using Last-Write-Wins with clear audit notes', () => {
    const localNewer = {
      id: 'm2',
      entityType: 'field_measurement' as const,
      entityId: 'meas_1',
      action: 'update' as const,
      payload: { wallHeightM: 3.2 },
      clientTimestamp: '2026-10-15T14:00:00Z',
      lamportClock: 5,
      status: 'offline_queued' as const,
      retryCount: 0,
    };

    const remoteOlder = {
      updatedAt: '2026-10-15T13:30:00Z',
      data: { wallHeightM: 3.0 },
    };

    const res = resolveStructuralConflict(localNewer, remoteOlder);
    expect(res.resolution).toBe('local_win');
    expect(res.mergedData.wallHeightM).toBe(3.2);
  });

  it('pre-caches and retrieves complete jobsite regional price packages', () => {
    preCacheJobsitePackage('NG');
    const cached = getCachedJobsitePrices('NG');
    expect(cached).not.toBeNull();
    expect(cached?.materials.cement_50kg.price).toBe(9200);
    expect(cached?.currency).toBe('NGN');
  });

  it('flushes queued mutations cleanly when network is restored', () => {
    setSimulatedOffline(true);
    enqueueMutation('project_log', 'p1', 'create', { stage: 'Slab casting' });
    enqueueMutation('field_measurement', 'm1', 'create', { length: 15.5 });
    expect(getQueuedMutations().length).toBe(2);

    // Network drops prevent flushing
    const dryRun = processQueuedMutations();
    expect(dryRun.synced).toBe(0);
    expect(dryRun.stillQueued).toBe(2);

    // Network restored
    setSimulatedOffline(false);
    const liveRun = processQueuedMutations();
    expect(liveRun.synced).toBe(2);
    expect(liveRun.stillQueued).toBe(0);
    expect(getQueuedMutations().length).toBe(0);
  });

  it('calculates estimated offline storage footprint in bytes', () => {
    preCacheJobsitePackage('NG');
    const bytes = estimateOfflineStorageBytes();
    expect(bytes).toBeGreaterThan(0);
  });
});
