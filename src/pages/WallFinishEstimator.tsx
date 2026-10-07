/**
 * FRELUX Wall Finish Estimator - country-aware wall finishing.
 *
 * Plans a wall from structure to decorative finish, worldwide:
 * country → construction method → rooms → walls → openings →
 * layer-by-layer finishing assembly → quantities with full
 * transparency → labour + material costs in the local currency.
 *
 * Starting templates per market are RESEARCH, not a building
 * code. Every layer, coverage and price is editable, and
 * prices come from the market price book with provenance -
 * never invented.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import { useMarket } from "@/lib/international/market-context";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import { EstimateDisclaimer } from "@/components/calculators";
import { resolveWallFinCountry } from "@/lib/wallfinishing/resolver";
import { getWallSystemsForCountry } from "@/lib/wallfinishing/wall-systems";
import {
  WALLFIN_ASSEMBLIES,
  getAssembly,
} from "@/lib/wallfinishing/assemblies";
import {
  estimateWallFinishingProject,
  type WallOverridesByWall,
} from "@/lib/wallfinishing";
import {
  resolveLayerPrice,
  resolveLabourRate,
} from "@/lib/wallfinishing/prices";
import type {
  LayerQuantityResult,
  OpeningInput,
  RoomSpec,
  WallFinProjectSpec,
  WallResult,
  WallSpec,
  WallSpecOverrides,
} from "@/types/wallfinishing";
import { QC_STATUS_LABELS } from "@/lib/wallfinishing/checklists";
import {
  exportWallFinExcel,
  exportWallFinPdf,
} from "@/lib/wallfinishing/report-export";
import {
  deleteLocalProject,
  getLocalProjectsByType,
  saveLocalProject,
  type LocalProject,
} from "@/lib/local-projects";
import type { WallFinProjectResult } from "@/types/wallfinishing";

/* ── helpers ─────────────────────────────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 9);
const n = (v: string | number) => Number(v) || 0;
const fmt = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined
    ? "N/A"
    : v.toLocaleString(undefined, { maximumFractionDigits: d });

const OPENING_DEFAULTS: Record<string, { w: number; h: number }> = {
  door: { w: 0.9, h: 2.1 },
  window: { w: 1.2, h: 1.2 },
  archway: { w: 1.2, h: 2.1 },
  vent: { w: 0.3, h: 0.3 },
  custom: { w: 1, h: 1 },
};

function makeOpenings(type: string, quantity: number): OpeningInput[] {
  const d = OPENING_DEFAULTS[type] ?? OPENING_DEFAULTS.custom;
  return [
    {
      id: uid(),
      type: type as OpeningInput["type"],
      widthM: d.w,
      heightM: d.h,
      quantity,
      revealDepthM: 0,
      deduct: true,
    },
  ];
}

interface DraftRoom {
  id: string;
  name: string;
  lengthM: string;
  widthM: string;
  heightM: string;
  isWetArea: boolean;
  exteriorWalls: number;
  doors: number;
  windows: number;
  /** per-wall assembly overrides: A, B, C, D - null = country default */
  assemblies: (string | null)[];
}

/** localStorage payload for a saved wall finishing estimate */
interface SavedWallFinData {
  spec: WallFinProjectSpec;
  overrides: WallOverridesByWall;
  result: WallFinProjectResult;
  savedAt: string;
}

function makeRoom(name: string): DraftRoom {
  return {
    id: uid(),
    name,
    lengthM: "4",
    widthM: "3.5",
    heightM: "3",
    isWetArea: false,
    exteriorWalls: 1,
    doors: 1,
    windows: 1,
    assemblies: [null, null, null, null],
  };
}

/* ── page ────────────────────────────────────────────────── */

export default function WallFinishEstimator() {
  useBreadcrumbJsonLd([
    { name: "Construction Tools", path: "/construction-tools" },
    { name: "Wall Finish Estimator", path: "/wall-finish-estimator" },
  ]);
  useSeo({
    title:
      "Wall Finish Estimator: country-aware wall finishing quantities & costs",
    description:
      "Plan walls from structure to finish anywhere in the world: pick your country's construction method, add rooms and openings, and get layer-by-layer material quantities, labour and costs with full calculation transparency.",
  });

  const { marketCode } = useMarket();
  const [country, setCountry] = useState(marketCode);
  const [buildingType, setBuildingType] = useState("residential");
  const [region, setRegion] = useState("");
  const [rooms, setRooms] = useState<DraftRoom[]>([makeRoom("Living room")]);
  const [contingency, setContingency] = useState(10);
  const [equipmentCost, setEquipmentCost] = useState("");
  const [overrides, setOverrides] = useState<WallOverridesByWall>({});
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof estimateWallFinishingProject>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepsFor, setStepsFor] = useState<{
    title: string;
    steps: { label: string; detail: string }[];
  } | null>(null);
  const [savedList, setSavedList] = useState<LocalProject[]>([]);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const location = useLocation();

  const resolved = useMemo(() => resolveWallFinCountry(country), [country]);
  const wallSystems = useMemo(
    () => getWallSystemsForCountry(resolved.profile.code),
    [resolved],
  );
  const assemblies = useMemo(
    () =>
      WALLFIN_ASSEMBLIES.filter((a) =>
        a.id.startsWith(`${resolved.profile.code.toLowerCase()}-`),
      ),
    [resolved],
  );

  useEffect(() => {
    setCountry(marketCode);
  }, [marketCode]);

  /* restore a saved estimate: draft rooms, overrides and result */
  const hydrate = useCallback((d: SavedWallFinData) => {
    const spec = d.spec;
    setRegion(spec.region ?? "");
    setBuildingType(spec.buildingType || "residential");
    setContingency(spec.contingencyPercent ?? 10);
    setCountry(spec.countryCode);
    const eq = spec.extraCosts?.find((x) => x.id === "eq");
    setEquipmentCost(eq ? String(eq.amount) : "");
    setRooms(
      spec.rooms.map((r) => {
        const countType = (t: OpeningInput["type"]) =>
          r.walls.reduce(
            (sum, w) =>
              sum +
              w.openings
                .filter((o) => o.type === t)
                .reduce((q, o) => q + o.quantity, 0),
            0,
          );
        return {
          id: uid(),
          name: r.name,
          lengthM: String(r.lengthM),
          widthM: String(r.widthM),
          heightM: String(r.heightM),
          isWetArea: !!r.isWetArea,
          exteriorWalls: r.walls.filter((w) => w.surface === "exterior").length,
          doors: countType("door"),
          windows: countType("window"),
          assemblies: r.walls.map((w) => w.assemblyId ?? null),
        };
      }),
    );
    setOverrides(d.overrides ?? {});
    setResult(d.result ?? null);
    setSaveNote(`Loaded “${spec.name}”.`);
  }, []);

  /* refresh the on-device saved list */
  const refreshSaved = useCallback(
    () => setSavedList(getLocalProjectsByType("wall_finishing")),
    [],
  );

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  /* opened from My Projects - restore estimate carried in router state */
  useEffect(() => {
    const st = location.state as unknown as {
      projectData?: SavedWallFinData;
    } | null;
    if (st?.projectData?.spec) hydrate(st.projectData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* build the calculation spec from the draft rooms */
  const buildSpec = useCallback((): WallFinProjectSpec => {
    const specRooms: RoomSpec[] = rooms.map((r, ri) => {
      const L = n(r.lengthM);
      const W = n(r.widthM);
      const H = n(r.heightM);
      const doors = makeOpenings("door", r.doors);
      const windows = makeOpenings("window", r.windows);
      const wallDefs: {
        label: string;
        length: number;
        surface: "interior" | "exterior";
      }[] = [
        {
          label: `${r.name} wall A`,
          length: L,
          surface: r.exteriorWalls > 0 ? "exterior" : "interior",
        },
        {
          label: `${r.name} wall B`,
          length: W,
          surface: r.exteriorWalls > 1 ? "exterior" : "interior",
        },
        {
          label: `${r.name} wall C`,
          length: L,
          surface: r.exteriorWalls > 2 ? "exterior" : "interior",
        },
        {
          label: `${r.name} wall D`,
          length: W,
          surface: r.exteriorWalls > 3 ? "exterior" : "interior",
        },
      ];
      const walls: WallSpec[] = wallDefs.map((wd, wi) => {
        const system = wallSystems[0];
        const assemblyId =
          r.assemblies[wi] ??
          (wd.surface === "exterior"
            ? (system?.exteriorFinishAssemblyId ?? assemblies[1]?.id)
            : (system?.interiorFinishAssemblyId ?? assemblies[0]?.id)) ??
          assemblies[0]?.id ??
          "ng-interior-block-paint";
        // openings land on wall A/B of the room (the first two)
        const openings = wi === 0 ? [...doors, ...windows] : [];
        return {
          id: `r${ri}-w${wi}`,
          label: wd.label,
          lengthM: wd.length,
          heightM: H,
          surface: wd.surface,
          wallSystemId: system?.id ?? "ng-sandcrete-block",
          assemblyId,
          openings,
          excludedAreaM2: 0,
        };
      });
      return {
        id: r.id,
        name: r.name || `Room ${ri + 1}`,
        lengthM: L,
        widthM: W,
        heightM: H,
        isWetArea: r.isWetArea,
        walls,
      };
    });
    return {
      name: `${resolved.profile.name} wall finishing estimate`,
      countryCode: resolved.profile.code,
      region,
      buildingType,
      rooms: specRooms,
      extraCosts: equipmentCost
        ? [
            {
              id: "eq",
              label: "Equipment / scaffolding",
              amount: n(equipmentCost),
            },
          ]
        : [],
      contingencyPercent: contingency,
    };
  }, [
    rooms,
    region,
    buildingType,
    contingency,
    equipmentCost,
    resolved,
    wallSystems,
    assemblies,
  ]);

  const calculate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const spec = buildSpec();
      const ctx = {
        currency: resolved.profile.currency,
        resolvePrice: (role: string) =>
          resolveLayerPrice(role, country, resolved.profile.currency),
        resolveLabour: (taskKey: string) =>
          resolveLabourRate(taskKey, country, resolved.profile.currency),
      };
      const r = await estimateWallFinishingProject(spec, ctx, overrides);
      setResult(r);
      track("wall_finish_estimated", { country, rooms: spec.rooms.length });
    } catch (e) {
      setError(getSafeError(e));
    } finally {
      setBusy(false);
    }
  }, [buildSpec, country, resolved, overrides]);
  const saveEstimate = useCallback(() => {
    if (!result) return;
    const spec = buildSpec();
    const saved = saveLocalProject(spec.name, "wall_finishing", {
      spec,
      overrides,
      result,
      savedAt: new Date().toISOString(),
    } satisfies SavedWallFinData);
    if (saved) {
      refreshSaved();
      setSaveNote(`Saved “${saved.name}” on this device.`);
    } else {
      setError("Could not save the estimate on this device (storage full?).");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, overrides, buildSpec, refreshSaved]);

  const loadEstimate = useCallback(
    (p: LocalProject) => {
      const d = p.data as unknown as SavedWallFinData;
      if (!d?.spec || !d?.result) {
        setError("This saved estimate is missing data and cannot be loaded.");
        return;
      }
      hydrate(d);
    },
    [hydrate],
  );

  const deleteEstimate = useCallback(
    (id: string) => {
      deleteLocalProject(id);
      refreshSaved();
    },
    [refreshSaved],
  );

  const setRoom = (id: string, patch: Partial<DraftRoom>) =>
    setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeLayer = (wallId: string, layerId: string) =>
    setOverrides((o) => {
      const cur: WallSpecOverrides = o[wallId] ?? {
        layers: {},
        removedLayers: [],
        addedLayers: [],
      };
      return {
        ...o,
        [wallId]: {
          ...cur,
          removedLayers: [...(cur.removedLayers ?? []), layerId],
        },
      };
    });

  const addLayerBack = (wallId: string, layerId: string) =>
    setOverrides((o) => {
      const cur: WallSpecOverrides = o[wallId] ?? {
        layers: {},
        removedLayers: [],
        addedLayers: [],
      };
      return {
        ...o,
        [wallId]: {
          ...cur,
          removedLayers: (cur.removedLayers ?? []).filter((x) => x !== layerId),
          layerOrder: (cur.layerOrder ?? []).filter((x) => x !== layerId),
        },
      };
    });

  const moveLayer = (wallId: string, layerId: string, dir: -1 | 1) => {
    const wall = result?.rooms
      .flatMap((r) => r.walls)
      .find((w) => w.wallSpecId === wallId);
    if (!wall) return;
    const ids = wall.layers.map((l) => l.layerTemplateId);
    const i = ids.indexOf(layerId);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setOverrides((o) => {
      const cur: WallSpecOverrides = o[wallId] ?? {
        layers: {},
        removedLayers: [],
        addedLayers: [],
      };
      return { ...o, [wallId]: { ...cur, layerOrder: ids } };
    });
  };

  const patchLayerOverride = (
    wallId: string,
    layerId: string,
    patch: Record<string, number | undefined>,
  ) =>
    setOverrides((o) => {
      const cur: WallSpecOverrides = o[wallId] ?? {
        layers: {},
        removedLayers: [],
        addedLayers: [],
      };
      const layer = cur.layers[layerId] ?? {};
      return {
        ...o,
        [wallId]: {
          ...cur,
          layers: { ...cur.layers, [layerId]: { ...layer, ...patch } },
        },
      };
    });

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageHeader
        title="Wall Finish Estimator"
        subtitle="Plan any wall worldwide: from structure to the final coat."
      />
      <Container className="max-w-6xl space-y-8">
        <AdSlot slotKey="wall-finish-top" />

        <p className="text-sm text-muted-foreground">
          {resolved.profile.flag} Starting from the {resolved.profile.name}{" "}
          finishing template.{" "}
          {resolved.inheritedNotice ?? resolved.profile.templateNotice}
        </p>

        {/* ── Project ── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">1. Project</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Country / market
              </span>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input-field"
              >
                {COUNTRY_OPTIONS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.currency})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Region / city
              </span>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="optional"
                className="input-field"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Building type
              </span>
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
                className="input-field"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="renovation">Renovation</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contingency
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={contingency}
                  onChange={(e) => setContingency(n(e.target.value))}
                  className="input-field"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </label>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Common {resolved.profile.name} construction methods:{" "}
            {wallSystems.map((s) => s.name).join(" · ")}
          </div>
        </section>

        {/* ── Rooms ── */}
        <section className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">2. Rooms</h2>
            <button
              type="button"
              onClick={() =>
                setRooms((rs) => [...rs, makeRoom(`Room ${rs.length + 1}`)])
              }
              className="btn-secondary text-sm"
            >
              + Add room
            </button>
          </div>
          {rooms.map((r, i) => (
            <div
              key={r.id}
              className="rounded-xl border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  value={r.name}
                  onChange={(e) => setRoom(r.id, { name: e.target.value })}
                  className="input-field max-w-56 font-medium"
                  aria-label="Room name"
                />
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setRooms((rs) => rs.filter((x) => x.id !== r.id))
                    }
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {(["lengthM", "widthM", "heightM"] as const).map((f) => (
                  <label key={f} className="space-y-1">
                    <span className="text-[11px] uppercase text-muted-foreground">
                      {f === "lengthM"
                        ? "Length (m)"
                        : f === "widthM"
                          ? "Width (m)"
                          : "Height (m)"}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={r[f]}
                      onChange={(e) => setRoom(r.id, { [f]: e.target.value })}
                      className="input-field"
                    />
                  </label>
                ))}
                <label className="space-y-1">
                  <span className="text-[11px] uppercase text-muted-foreground">
                    Doors
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={r.doors}
                    onChange={(e) =>
                      setRoom(r.id, { doors: Math.max(0, n(e.target.value)) })
                    }
                    className="input-field"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] uppercase text-muted-foreground">
                    Windows
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={r.windows}
                    onChange={(e) =>
                      setRoom(r.id, { windows: Math.max(0, n(e.target.value)) })
                    }
                    className="input-field"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] uppercase text-muted-foreground">
                    Exterior walls
                  </span>
                  <select
                    value={r.exteriorWalls}
                    onChange={(e) =>
                      setRoom(r.id, { exteriorWalls: n(e.target.value) })
                    }
                    className="input-field"
                  >
                    {[0, 1, 2, 3, 4].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={r.isWetArea}
                    onChange={(e) =>
                      setRoom(r.id, { isWetArea: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Wet area (bathroom / kitchen)
                </label>
              </div>
              {/* per-wall finishing assemblies */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {r.assemblies.map((a, wi) => (
                  <label key={wi} className="space-y-1">
                    <span className="text-[11px] uppercase text-muted-foreground">
                      Wall {String.fromCharCode(65 + wi)} finish
                    </span>
                    <select
                      value={a ?? ""}
                      onChange={(e) => {
                        const next = [...r.assemblies];
                        next[wi] = e.target.value || null;
                        setRoom(r.id, { assemblies: next });
                      }}
                      className="input-field"
                    >
                      <option value="">Country default</option>
                      {assemblies.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.surface === "interior" ? "Interior" : "Exterior"}{" "}
                          : {opt.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {rooms.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Doors and windows deduct from wall A. Wall A is the first length
              wall; exterior walls finish with the country's exterior template.
            </p>
          )}
        </section>

        {/* ── Other costs ── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">3. Equipment & other costs</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Scaffolding / tools / transport ({resolved.profile.currency})
              </span>
              <input
                type="number"
                min={0}
                value={equipmentCost}
                onChange={(e) => setEquipmentCost(e.target.value)}
                placeholder="0"
                className="input-field"
              />
            </label>
          </div>
        </section>

        <button
          type="button"
          onClick={calculate}
          disabled={busy}
          className="btn-primary w-full text-base"
        >
          {busy ? "Calculating…" : "Calculate finishing estimate"}
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* ── Results ── */}
        {result && (
          <section className="space-y-6">
            {result.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {result.errors.map((e, i) => (
                  <p key={i}>• {e}</p>
                ))}
              </div>
            )}
            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
                {result.warnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </div>
            )}

            {result.rooms.map((room) =>
              room.walls.map((wall) => (
                <div key={wall.wallSpecId} className="card p-6 space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{wall.label}</h3>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline"
                      onClick={() =>
                        setStepsFor({
                          title: `${wall.label}: how the area was calculated`,
                          steps: wall.steps,
                        })
                      }
                    >
                      {wall.grossAreaM2} m² gross → {wall.netAreaM2} m² net
                      {wall.revealAreaM2 > 0
                        ? ` + ${wall.revealAreaM2} m² reveals`
                        : ""}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                          <th className="py-2 pr-3">Layer</th>
                          <th className="py-2 pr-3">Material</th>
                          <th className="py-2 pr-3">Quantity</th>
                          <th className="py-2 pr-3 text-right">Material</th>
                          <th className="py-2 pr-3 text-right">Labour</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wall.layers.map((layer) => (
                          <tr
                            key={layer.layerTemplateId}
                            className="border-b border-border/50 align-top"
                          >
                            <td className="py-2.5 pr-3">
                              <p className="font-medium">{layer.layerName}</p>
                              {layer.overridden.length > 0 && (
                                <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                                  edited: {layer.overridden.join(", ")}
                                </p>
                              )}
                              <button
                                type="button"
                                className="mt-1 text-[11px] text-muted-foreground underline"
                                onClick={() =>
                                  setStepsFor({
                                    title: `${layer.layerName}: how this was calculated`,
                                    steps: layer.labourSteps,
                                  })
                                }
                              >
                                how?
                              </button>
                              {" · "}
                              <button
                                type="button"
                                className="text-[11px] text-muted-foreground underline"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Remove the '${layer.layerName}' layer from this wall? You can recalculate to restore defaults.`,
                                    )
                                  ) {
                                    removeLayer(
                                      wall.wallSpecId,
                                      layer.layerTemplateId,
                                    );
                                  }
                                }}
                              >
                                remove
                              </button>
                              {" · "}
                              <button
                                type="button"
                                className="text-[11px] text-muted-foreground underline"
                                aria-label={`Move ${layer.layerName} up`}
                                onClick={() =>
                                  moveLayer(
                                    wall.wallSpecId,
                                    layer.layerTemplateId,
                                    -1,
                                  )
                                }
                              >
                                move up
                              </button>
                              {" · "}
                              <button
                                type="button"
                                className="text-[11px] text-muted-foreground underline"
                                aria-label={`Move ${layer.layerName} down`}
                                onClick={() =>
                                  moveLayer(
                                    wall.wallSpecId,
                                    layer.layerTemplateId,
                                    1,
                                  )
                                }
                              >
                                move down
                              </button>
                              {" · "}
                              <button
                                type="button"
                                className="text-[11px] text-muted-foreground underline"
                                onClick={() => {
                                  const v = window.prompt(
                                    `Coats for '${layer.layerName}' (current ${layer.baseQuantity > 0 ? "default" : "N/A"}):`,
                                    "2",
                                  );
                                  if (v !== null) {
                                    patchLayerOverride(
                                      wall.wallSpecId,
                                      layer.layerTemplateId,
                                      {
                                        coats: Math.max(1, n(v)),
                                      },
                                    );
                                  }
                                }}
                              >
                                set coats
                              </button>
                            </td>
                            <td className="py-2.5 pr-3 text-muted-foreground">
                              {layer.materialName}
                            </td>
                            <td className="py-2.5 pr-3">
                              <p>
                                {fmt(layer.purchaseQuantity)}{" "}
                                {layer.purchaseUnit}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                incl. {layer.wastePercent}% waste
                              </p>
                            </td>
                            <td className="py-2.5 pr-3 text-right">
                              {layer.materialCost !== null
                                ? fmt(layer.materialCost)
                                : "N/A"}
                            </td>
                            <td className="py-2.5 pr-3 text-right">
                              {layer.labourCost !== null
                                ? fmt(layer.labourCost)
                                : "N/A"}
                            </td>
                            <td className="py-2.5 text-right font-medium">
                              {fmt(
                                (layer.materialCost ?? 0) +
                                  (layer.labourCost ?? 0),
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(overrides[wall.wallSpecId]?.removedLayers ?? []).length >
                    0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        Removed layers:
                      </span>
                      {(overrides[wall.wallSpecId]?.removedLayers ?? []).map(
                        (id) => {
                          const name =
                            WALLFIN_ASSEMBLIES.flatMap((a) => a.layers).find(
                              (l) => l.id === id,
                            )?.name ?? id;
                          return (
                            <span
                              key={id}
                              className="rounded-full border border-border bg-muted/40 px-2 py-0.5"
                            >
                              {name}{" "}
                              <button
                                type="button"
                                className="text-primary underline"
                                onClick={() =>
                                  addLayerBack(wall.wallSpecId, id)
                                }
                              >
                                add back
                              </button>
                            </span>
                          );
                        },
                      )}
                    </div>
                  )}
                  <p className="text-sm font-medium">
                    Wall finishing total: {fmt(wall.wallCost)} {result.currency}
                  </p>
                  {/* quality checklist */}
                  <details className="rounded-lg bg-muted/40 p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Quality checklist ({wall.checklists.length} layers)
                    </summary>
                    <div className="mt-3 space-y-3 text-sm">
                      {wall.checklists.map((c) => (
                        <div key={c.layerTemplateId}>
                          <p className="font-medium text-muted-foreground">
                            {c.layerName}
                          </p>
                          <ul className="mt-1 space-y-1">
                            {c.items.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center gap-2 text-muted-foreground"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                {item.label}
                                <span className="text-xs text-muted-foreground/70">
                                  : {QC_STATUS_LABELS[item.status]}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )),
            )}

            {/* cost summary */}
            <div className="card p-6 space-y-3">
              <h3 className="text-lg font-semibold">Estimated cost summary</h3>
              <dl className="grid gap-2 sm:grid-cols-2">
                {[
                  ["Materials", result.cost.materials],
                  ["Labour", result.cost.labour],
                  ["Equipment / other", result.cost.equipment],
                  ["Subtotal", result.cost.subtotal],
                  [`Contingency (${contingency}%)`, result.cost.contingency],
                ].map(([label, v]) => (
                  <div
                    key={label as string}
                    className="flex justify-between border-b border-border/50 py-1.5"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">
                      {fmt(v as number)} {result.currency}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="flex justify-between pt-2 text-lg font-semibold">
                <span>Total (estimate)</span>
                <span>
                  {fmt(result.cost.total)} {result.currency}
                </span>
              </p>
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() =>
                  setStepsFor({
                    title: "How the total was calculated",
                    steps: result.cost.steps,
                  })
                }
              >
                how was the total calculated?
              </button>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={saveEstimate}
                  className="btn-primary text-sm"
                >
                  Save estimate
                </button>
                <button
                  type="button"
                  onClick={() => exportWallFinPdf(buildSpec(), result)}
                  className="btn-secondary text-sm"
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportWallFinExcel(buildSpec(), result)}
                  className="btn-secondary text-sm"
                >
                  Export Excel
                </button>
              </div>
              {saveNote && (
                <p className="text-xs text-muted-foreground">{saveNote}</p>
              )}
              <EstimateDisclaimer />
            </div>
          </section>
        )}

        {savedList.length > 0 && (
          <section className="card p-6 space-y-3">
            <h3 className="font-semibold">Saved estimates (this device)</h3>
            <ul className="space-y-2 text-sm">
              {savedList.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString()}
                    </span>
                  </span>
                  <span className="flex gap-3">
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() => loadEstimate(p)}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      className="text-xs text-destructive underline"
                      onClick={() => {
                        if (window.confirm(`Delete "${p.name}"?`))
                          deleteEstimate(p.id);
                      }}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <AdSlot slotKey="wall-finish-bottom" />
      </Container>

      {/* transparency modal */}
      {stepsFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setStepsFor(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold">{stepsFor.title}</h3>
              <button
                type="button"
                onClick={() => setStepsFor(null)}
                className="text-muted-foreground"
              >
                Close
              </button>
            </div>
            <ol className="mt-4 space-y-3">
              {stepsFor.steps.map((s, i) => (
                <li key={i} className="rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{s.label}</p>
                  <p className="mt-0.5 text-muted-foreground">{s.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
