import type { EngineQuantityLine, EngineCostSummary } from "./types";
import {
  registerEngine,
  requireFiniteNumbers,
  quantityLine,
} from "./engines-registry";
import {
  priceQuantity,
  priceProvenance,
  resolveEnginePrice,
  type EngineResolvedPrice,
} from "./engine-pricing";

// =========================================================
// PHASE 2 ENGINES, added for the AI Copilot. Each wraps the
// EXISTING authoritative calculator functions; no new math.
// Engines that need DB-backed configs/materials fetch them through
// the same queries the manual calculators use, or accept them
// via rawInput (so callers with cached data avoid duplicate fetches).
// =========================================================

export function registerPhase2Engines(): void {
  // ── Painting: full purchasing methodology (classic FRELUX painting
  //    calculator, containers/buckets, openings deduction, waste).
  //    The AI must NOT flatten painting into an m²-only answer: this
  //    engine returns the same containers the manual calculator does.
  registerEngine({
    id: "painting_project",
    domain: "painting",
    title: "FRELUX Painting Engine, Materials & Containers",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX painting calculator",
    async run(rawInput) {
      const {
        calculatePaint,
        DEFAULT_COVERAGE_M2_PER_LITER,
        DEFAULT_CONTAINER_SIZES_LITERS,
        DEFAULT_DOOR_DIMS,
        DEFAULT_WINDOW_DIMS,
      } = await import("@/lib/calc");
      const input = rawInput as {
        length: number;
        width: number;
        wallHeight: number;
        projectType?: "room" | "whole_house" | "exterior";
        unit?: "meters" | "feet";
        doors?: number;
        windows?: number;
        coats?: number;
        paintType?: string;
        includeCeiling?: boolean;
        wasteMargin?: number;
        /** Visitor's market code (NG, US, GB...) for role-based pricing. */
        marketCode?: string;
      };
      const invalid = requireFiniteNumbers({
        length: input.length,
        width: input.width,
        wallHeight: input.wallHeight,
        doors: input.doors ?? 0,
        windows: input.windows ?? 0,
        coats: input.coats ?? 2,
        wasteMargin: input.wasteMargin ?? 10,
      });
      if (invalid) {
        return {
          ok: false,
          engine: "painting_project",
          calculatedAt: new Date().toISOString(),
          quantities: [],
          costs: null,
          raw: null,
          error: invalid,
        };
      }
      // ADMIN-CONFIG PROPAGATION: the coverage rate, container sizes and
      // default coat count come from the SAME DB sources the manual paint
      // calculator page reads (paint_types + estimation_calc_rules), so an
      // admin change propagates identically to page, AI copilot, agent and
      // plan takeoff. The code constants below remain ONLY as the honest
      // fallback when no admin configuration exists, never a silent
      // second opinion. (Same pattern as the screeding/POP engines.)
      let coverageRate = DEFAULT_COVERAGE_M2_PER_LITER;
      let containerSizes: number[] = DEFAULT_CONTAINER_SIZES_LITERS;
      let defaultCoats = 2;
      try {
        const { fetchPaintTypes } = await import("@/lib/queries");
        const { data: paintTypes } = await fetchPaintTypes();
        const standard = paintTypes.find(
          (t) => t.id === "standard" || t.name?.toLowerCase() === "standard",
        );
        const dbCoverage = Number(standard?.coverage_rate);
        if (standard && dbCoverage > 0) coverageRate = dbCoverage;
        const sizes = standard?.container_sizes;
        if (Array.isArray(sizes) && sizes.some((s) => Number(s) > 0)) {
          containerSizes = sizes.filter((s) => Number(s) > 0);
        }
      } catch {
        // DB unavailable → documented code defaults (current behavior).
      }
      try {
        const { fetchCalcRule } = await import("@/lib/estimation/queries");
        const { data: coatRule } = await fetchCalcRule("standard_coat_count");
        const v = (coatRule?.rule_value as Record<string, unknown> | undefined)
          ?.value;
        if (typeof v === "number" && v >= 1) defaultCoats = Math.floor(v);
      } catch {
        // DB unavailable → documented default of 2 coats.
      }
      // The engine's own `unit` convention converts internally, pass through,
      // never convert at this boundary (Phase-2 contract point 6).
      const result = calculatePaint(
        {
          projectType: (input.projectType ?? "room") as never,
          length: input.length,
          width: input.width,
          wallHeight: input.wallHeight,
          doors: input.doors ?? 0,
          doorDims: DEFAULT_DOOR_DIMS,
          windows: input.windows ?? 0,
          windowDims: DEFAULT_WINDOW_DIMS,
          coats: input.coats ?? defaultCoats,
          paintType: input.paintType ?? "standard",
          unit: (input.unit ?? "meters") as never,
          includeCeiling: input.includeCeiling ?? true,
          wasteMargin: input.wasteMargin ?? 10,
        },
        {
          coverageRate,
          containerSizes,
        },
      );

      const quantities: EngineQuantityLine[] = [
        quantityLine("Paintable area", result.paintableArea, "m²"),
        quantityLine(
          "Paint required (with waste)",
          result.adjustedLiters,
          "litres",
        ),
        quantityLine(
          "Total recommended litres",
          result.totalRecommendedLiters,
          "litres",
        ),
      ];
      for (const container of result.recommendedContainers ?? []) {
        quantities.push(
          quantityLine(
            `${container.size} litre containers`,
            container.count,
            "containers",
          ),
        );
      }
      if (result.primerLiters > 0) {
        quantities.push(quantityLine("Primer", result.primerLiters, "litres"));
      }
      // MARKET-AWARE PRICING: with a market code the engine resolves the
      // paint and primer roles through the market's verified price book
      // (market_material_roles → estimation_prices) with provenance —
      // the same source the manual paint calculator prices from. Without
      // a market, or when a role is unpriced, costs stay null and are
      // reported, never invented.
      let costs: EngineCostSummary | null = null;
      const pricing: {
        market: string | null;
        lines: Array<{ role: string; provenance: string }>;
        unpriced: string[];
      } = { market: input.marketCode ?? null, lines: [], unpriced: [] };
      if (input.marketCode) {
        const paintRole =
          input.projectType === "exterior"
            ? ("exterior-paint" as const)
            : ("interior-paint" as const);
        const costLines: Array<{ label: string; amount: number }> = [];
        const paintPrice = await resolveEnginePrice(
          paintRole,
          input.marketCode,
          "NGN",
        );
        if (paintPrice) {
          const line = priceQuantity(result.totalRecommendedLiters, paintPrice);
          costLines.push({
            label: `Paint — ${line.label}`,
            amount: line.amount,
          });
          pricing.lines.push({
            role: paintRole,
            provenance: priceProvenance(paintPrice),
          });
        } else {
          pricing.unpriced.push(paintRole);
        }
        if (result.primerLiters > 0) {
          const primerPrice = await resolveEnginePrice(
            "primer",
            input.marketCode,
            paintPrice?.currency ?? "NGN",
          );
          if (primerPrice) {
            const line = priceQuantity(result.primerLiters, primerPrice);
            costLines.push({
              label: `Primer — ${line.label}`,
              amount: line.amount,
            });
            pricing.lines.push({
              role: "primer",
              provenance: priceProvenance(primerPrice),
            });
          } else {
            pricing.unpriced.push("primer");
          }
        }
        if (costLines.length) {
          costs = {
            total: costLines.reduce((sum, l) => sum + l.amount, 0),
            currency: paintPrice?.currency ?? "NGN",
            lines: costLines,
            regionalDataAvailable: true,
          };
        }
      }
      return {
        ok: true,
        engine: "painting_project",
        calculatedAt: new Date().toISOString(),
        quantities,
        costs,
        // Without a market the raw result stays EXACTLY the manual
        // calculator's output (parity contract); pricing provenance
        // rides along only for market-priced runs.
        raw: input.marketCode ? { ...result, pricing } : result,
      };
    },
  });

  // ── Tile: authoritative tile calculator (quantity + user-supplied
  //    tile/price inputs; materials param is unused by the engine).
  registerEngine({
    id: "tile_estimate",
    domain: "tiling",
    title: "FRELUX Tile Calculator Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX tile calculator",
    async run(rawInput) {
      const { calculateTile } = await import("@/lib/pop-tile-calc");
      const input = rawInput as {
        surfaceType: "floor" | "wall";
        method: "traditional" | "adhesive";
        length: number;
        width: number;
        height?: number;
        unit?: "meters" | "feet";
        tileWidthMm: number;
        tileHeightMm: number;
        tilesPerBox: number;
        tilePricePerBox: number;
        wasteMargin?: number;
        currency?: string;
        currencySymbol?: string;
      };
      const invalid = requireFiniteNumbers({
        length: input.length,
        width: input.width,
        tileWidthMm: input.tileWidthMm,
        tileHeightMm: input.tileHeightMm,
        tilesPerBox: input.tilesPerBox,
        tilePricePerBox: input.tilePricePerBox,
      });
      if (invalid) {
        return {
          ok: false,
          engine: "tile_estimate",
          calculatedAt: new Date().toISOString(),
          quantities: [],
          costs: null,
          raw: null,
          error: invalid,
        };
      }
      const currency = input.currency ?? "NGN";
      const symbol = input.currencySymbol ?? currency;
      const result = calculateTile(
        {
          surfaceType: input.surfaceType,
          method: input.method,
          length: input.length,
          width: input.width,
          height: input.height ?? 0,
          tileWidthMm: input.tileWidthMm,
          tileHeightMm: input.tileHeightMm,
          tilesPerBox: input.tilesPerBox,
          tilePricePerBox: input.tilePricePerBox,
          wasteMargin: input.wasteMargin ?? 10,
          // Installation materials: costs only appear when the user supplied
          // real rates/prices, every field is explicit and zero by default so
          // the engine's own warnings (not NaN) mark what is unconfigured.
          adhesiveCoverageRate: 0,
          adhesivePricePerBag: 0,
          cementCoverageRate: 0,
          cementPricePerBag: 0,
          cementPackageSize: 1,
          sandCoverageRate: 0,
          sandPricePerBag: 0,
          sandPackageSize: 1,
          groutCoverageRate: 0,
          groutPricePerKg: 0,
          spacerCoverageRate: 0,
          spacerPricePerPack: 0,
          spacerPackageSize: 1,
          labourRatePerSqm: 0,
          unit: (input.unit ?? "meters") as never,
        } as never,
        [] as never,
        currency,
        symbol,
      );

      const quantities: EngineQuantityLine[] = [
        quantityLine("Surface area", result.surfaceArea, "m²"),
        quantityLine("Tiles needed", result.tilesNeeded, "tiles"),
        quantityLine("Boxes needed", result.boxesNeeded, "boxes"),
      ];
      const costLines: Array<{ label: string; amount: number }> = [];
      if (result.tileCost > 0)
        costLines.push({ label: "Tiles", amount: result.tileCost });
      if (result.adhesiveCost > 0)
        costLines.push({ label: "Adhesive", amount: result.adhesiveCost });
      if (result.cementCost > 0)
        costLines.push({ label: "Cement", amount: result.cementCost });
      if (result.groutCost > 0)
        costLines.push({ label: "Grout", amount: result.groutCost });
      const costs: EngineCostSummary | null = costLines.length
        ? {
            total: costLines.reduce((s, l) => s + l.amount, 0),
            currency,
            lines: costLines,
            regionalDataAvailable: false,
          }
        : null;
      return {
        ok: true,
        engine: "tile_estimate",
        calculatedAt: new Date().toISOString(),
        quantities,
        costs,
        raw: result,
      };
    },
  });

  // ── POP ceiling: authoritative POP calculator. Materials come from
  //    the pop_materials table via the same query the manual
  //    calculator uses (or rawInput.materials when the caller has
  //    already fetched them, avoids duplicate requests).
  registerEngine({
    id: "pop_ceiling",
    domain: "pop",
    title: "FRELUX POP Ceiling Calculator Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX POP calculator",
    async run(rawInput) {
      const { calculatePopCeiling } = await import("@/lib/pop-tile-calc");
      const input = rawInput as {
        roomLength: number;
        roomWidth: number;
        unit?: "meters" | "feet";
        wasteMargin?: number;
        workflow?: "nigeria" | "international";
        includeDecorative?: boolean;
        includeOptional?: boolean;
        currency?: string;
        currencySymbol?: string;
        materials?: Array<Record<string, unknown>>;
      };
      const invalid = requireFiniteNumbers({
        roomLength: input.roomLength,
        roomWidth: input.roomWidth,
        wasteMargin: input.wasteMargin ?? 10,
      });
      if (invalid) {
        return {
          ok: false,
          engine: "pop_ceiling",
          calculatedAt: new Date().toISOString(),
          quantities: [],
          costs: null,
          raw: null,
          error: invalid,
        };
      }

      let materials = input.materials ?? null;
      if (!materials) {
        const { fetchPopMaterials } = await import("@/lib/queries");
        const { data } = await fetchPopMaterials();
        materials = (data ?? []) as unknown as Array<Record<string, unknown>>;
      }
      if (!materials || materials.length === 0) {
        return {
          ok: false,
          engine: "pop_ceiling",
          calculatedAt: new Date().toISOString(),
          quantities: [],
          costs: null,
          raw: null,
          error:
            "POP materials data is unavailable right now, use the POP Ceiling Calculator directly for this estimate.",
        };
      }

      const currency = input.currency ?? "NGN";
      const symbol = input.currencySymbol ?? currency;
      const result = calculatePopCeiling(
        {
          workflow: input.workflow ?? "nigeria",
          roomLength: input.roomLength,
          roomWidth: input.roomWidth,
          unit: (input.unit ?? "meters") as never,
          wasteMargin: input.wasteMargin ?? 10,
          includeDecorative: input.includeDecorative ?? false,
          includeOptional: input.includeOptional ?? false,
        } as never,
        materials as never,
        currency,
        symbol,
      );

      const quantities: EngineQuantityLine[] = [
        quantityLine("Ceiling area", result.ceilingArea, "m²"),
      ];
      const costLines: Array<{ label: string; amount: number }> = [];
      for (const m of result.materials ?? []) {
        quantities.push(quantityLine(m.name, m.quantity, m.unit));
        if (m.cost > 0) costLines.push({ label: m.name, amount: m.cost });
      }
      const costs: EngineCostSummary | null = costLines.length
        ? {
            total: costLines.reduce((s, l) => s + l.amount, 0),
            currency,
            lines: costLines,
            regionalDataAvailable: false,
          }
        : null;
      return {
        ok: true,
        engine: "pop_ceiling",
        calculatedAt: new Date().toISOString(),
        quantities,
        costs,
        raw: result,
      };
    },
  });

  // ── Screeding: authoritative screeding system engine. Config comes
  //    from screeding_system_config via the same query the manual
  //    Screeding Cost Estimator uses.
  registerEngine({
    id: "screeding_system",
    domain: "screeding",
    title: "FRELUX Screeding System Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX screeding engine",
    async run(rawInput) {
      const { calculateScreedingSystem, dbToSystemConfig } =
        await import("@/lib/calc");
      const input = rawInput as {
        areaM2: number;
        systemType?: "putty" | "white_cement_paint";
        coats?: number;
        config?: unknown; // pre-fetched ScreedingSystemConfig (avoids duplicate fetch)
        /** Visitor's market code (NG, US, GB...) for role-based pricing. */
        marketCode?: string;
      };
      const invalid = requireFiniteNumbers({
        areaM2: input.areaM2,
        coats: input.coats ?? 0,
      });
      if (invalid) {
        return {
          ok: false,
          engine: "screeding_system",
          calculatedAt: new Date().toISOString(),
          quantities: [],
          costs: null,
          raw: null,
          error: invalid,
        };
      }

      let config =
        (input.config as
          Awaited<ReturnType<typeof dbToSystemConfig>> | undefined) ??
        undefined;
      if (!config) {
        const { fetchScreedingSystemConfig } = await import("@/lib/queries");
        const { data, error: cfgError } = await fetchScreedingSystemConfig(
          input.systemType ?? "white_cement_paint",
        );
        if (cfgError || !data) {
          return {
            ok: false,
            engine: "screeding_system",
            calculatedAt: new Date().toISOString(),
            quantities: [],
            costs: null,
            raw: null,
            error:
              "Screeding configuration is unavailable right now, use the Screeding Cost Estimator directly for this estimate.",
          };
        }
        config = dbToSystemConfig(data);
      }

      // MARKET-AWARE PRICING: the same role-based fallback the manual
      // Screeding Cost Estimator uses. Config prices stay authoritative
      // when the admin set them; a missing price resolves through the
      // market's verified price book (joint-filler / interior-paint /
      // concrete-mix roles) with provenance. Unpriced roles stay null —
      // the result reports the gap, never guesses.
      const pricing: {
        market: string | null;
        lines: Array<{ role: string; provenance: string }>;
        unpriced: string[];
      } = { market: input.marketCode ?? null, lines: [], unpriced: [] };
      const screedCfg = config;
      if (input.marketCode && screedCfg) {
        const roleFor = (
          current: number | null,
          role: "joint-filler" | "interior-paint" | "concrete-mix",
        ): Promise<EngineResolvedPrice | null> => {
          if (current != null && current > 0) return Promise.resolve(null);
          return resolveEnginePrice(
            role,
            input.marketCode!,
            screedCfg.currency,
          );
        };
        const puttyPrice = await roleFor(
          config.puttyPricePerUnit,
          "joint-filler",
        );
        const paintPrice = await roleFor(
          config.paintPricePerUnit,
          "interior-paint",
        );
        const cementPrice = await roleFor(
          config.cementPricePerUnit,
          "concrete-mix",
        );
        config = {
          ...config,
          puttyPricePerUnit:
            config.puttyPricePerUnit ?? puttyPrice?.unitPrice ?? null,
          puttyName:
            config.puttyName ?? puttyPrice?.materialName ?? undefined ?? null,
          paintPricePerUnit:
            config.paintPricePerUnit ?? paintPrice?.unitPrice ?? null,
          paintName:
            config.paintName ?? paintPrice?.materialName ?? undefined ?? null,
          cementPricePerUnit:
            config.cementPricePerUnit ?? cementPrice?.unitPrice ?? null,
          cementName:
            config.cementName ?? cementPrice?.materialName ?? undefined ?? null,
        };
        for (const [role, price] of [
          ["joint-filler", puttyPrice],
          ["interior-paint", paintPrice],
          ["concrete-mix", cementPrice],
        ] as const) {
          if (price) {
            pricing.lines.push({ role, provenance: priceProvenance(price) });
          }
        }
      }

      const result = calculateScreedingSystem(
        input.areaM2,
        config,
        input.coats ?? config.defaultCoats,
      );

      const quantities: EngineQuantityLine[] = [
        quantityLine("Net screeding area", result.netScreedingArea, "m²"),
      ];
      const costLines: Array<{ label: string; amount: number }> = [];
      // Contract note (post-Phase-6 audit fix): the authoritative
      // calculateScreedingSystem result exposes each material as
      // { purchaseQuantity, totalCost, unit }, the PURCHASE quantity the
      // manual screeding calculators show. The wrapper previously read
      // stale { quantity, cost } field names, silently reporting 0 units
      // and no costs to every engine consumer. Both spellings are accepted
      // so a future result shape stays traceable, but purchaseQuantity /
      // totalCost are the documented fields.
      const addBreakdown = (
        label: string,
        breakdown: {
          purchaseQuantity?: number;
          totalCost?: number | null;
          quantity?: number;
          cost?: number | null;
          unit?: string;
        } | null,
      ) => {
        if (!breakdown) return;
        const qty = breakdown.purchaseQuantity ?? breakdown.quantity ?? 0;
        quantities.push(
          quantityLine(label, Number(qty), String(breakdown.unit ?? "units")),
        );
        const cost = breakdown.totalCost ?? breakdown.cost ?? null;
        if (typeof cost === "number" && cost > 0) {
          costLines.push({ label, amount: cost });
        }
      };
      if (result.systemType === "putty") {
        addBreakdown(result.putty?.name ?? "Putty", result.putty);
      } else {
        addBreakdown(result.paint?.name ?? "Screeding paint", result.paint);
        addBreakdown(result.cement?.name ?? "Cement", result.cement);
        addBreakdown(result.extra?.name ?? "Extra material", result.extra);
      }
      const costs: EngineCostSummary | null = costLines.length
        ? {
            total:
              result.materialCost ??
              costLines.reduce((s, l) => s + l.amount, 0),
            currency: result.currency,
            lines: costLines,
            regionalDataAvailable: pricing.lines.length > 0,
          }
        : null;
      return {
        ok: true,
        engine: "screeding_system",
        calculatedAt: new Date().toISOString(),
        quantities,
        costs,
        // Without a market the raw result stays EXACTLY the manual
        // calculator's output (parity contract); pricing provenance
        // rides along only for market-priced runs.
        raw: input.marketCode ? { ...result, pricing } : result,
      };
    },
  });
  // ── Tyrolene system: the full authoritative Tyrolene estimate
  //    (equivalent partitions, per-material purchase quantities and
  //    costs) — the same calculateTyroleneProject the manual Tyrolene
  //    Estimator runs, priced through the market's verified price book
  //    with role-based fallback and local brand names. The area-only
  //    tyrolene_partition_area engine stays registered for area
  //    questions; this one answers "how much will it cost".
  registerEngine({
    id: "tyrolene_system",
    domain: "finishing",
    title: "FRELUX Tyrolene Engine, Materials & Cost",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX tyrolene engine",
    async run(rawInput) {
      const input = rawInput as {
        standardPartitionCount?: number;
        partitions?: Array<{
          label?: string;
          quantity: number;
          width: number;
          height: number;
        }>;
        marketCode?: string;
        currency?: string;
        customerLocation?: "owerri" | "outside_owerri" | "unknown";
        projectDescription?: string;
      };
      const marketCode = input.marketCode ?? "NG";
      const invalid = requireFiniteNumbers({
        standardPartitionCount: input.standardPartitionCount ?? 0,
      });
      for (const pt of input.partitions ?? []) {
        const part = requireFiniteNumbers({
          quantity: pt.quantity,
          width: pt.width,
          height: pt.height,
        });
        if (part) {
          return {
            ok: false,
            engine: "tyrolene_system",
            calculatedAt: new Date().toISOString(),
            quantities: [],
            costs: null,
            raw: null,
            error: part,
          };
        }
      }
      if (invalid) {
        return {
          ok: false,
          engine: "tyrolene_system",
          calculatedAt: new Date().toISOString(),
          quantities: [],
          costs: null,
          raw: null,
          error: invalid,
        };
      }
      const hasPartitions = (input.partitions ?? []).some(
        (pt) => pt.quantity > 0,
      );
      if (
        !hasPartitions &&
        !(input.standardPartitionCount && input.standardPartitionCount > 0)
      ) {
        return {
          ok: false,
          engine: "tyrolene_system",
          calculatedAt: new Date().toISOString(),
          quantities: [],
          costs: null,
          raw: null,
          error:
            "Provide either a standard partition count or partition dimensions (quantity, width, height in metres).",
        };
      }

      const { loadTyroleneCalcConfig } =
        await import("@/lib/estimation/tyrolene-config");
      let bundle: Awaited<ReturnType<typeof loadTyroleneCalcConfig>>;
      try {
        bundle = await loadTyroleneCalcConfig(marketCode);
      } catch {
        return {
          ok: false,
          engine: "tyrolene_system",
          calculatedAt: new Date().toISOString(),
          quantities: [],
          costs: null,
          raw: null,
          error:
            "Tyrolene configuration is unavailable right now, use the Tyrolene Estimator directly for this estimate.",
        };
      }

      const { calculateTyroleneProject } =
        await import("@/lib/estimation/tyrolene-engine");
      const result = calculateTyroleneProject(
        {
          partition_types: (input.partitions ?? []).map((pt, i) => ({
            id: `pt${i + 1}`,
            label: pt.label ?? `Partition type ${i + 1}`,
            quantity: pt.quantity,
            width: pt.width,
            height: pt.height,
          })),
          standard_partition_count: hasPartitions
            ? null
            : (input.standardPartitionCount ?? null),
          currency: input.currency ?? "NGN",
          user_id: null,
          client_hash: null,
          project_description: input.projectDescription ?? "Tyrolene Estimate",
          customer_location: input.customerLocation ?? "unknown",
        },
        bundle.config,
      );

      if (!result.valid) {
        return {
          ok: false,
          engine: "tyrolene_system",
          calculatedAt: new Date().toISOString(),
          quantities: [],
          costs: null,
          raw: result,
          error:
            result.errors[0] ??
            "Tyrolene configuration is incomplete, use the Tyrolene Estimator directly for this estimate.",
        };
      }

      const quantities: EngineQuantityLine[] = [
        quantityLine(
          "Equivalent standard partitions",
          result.equivalent_standard_partitions,
          "partitions",
        ),
      ];
      const costLines: Array<{ label: string; amount: number }> = [];
      for (const mat of result.materials) {
        // Local brand name: the market-resolved material when the price
        // came through the role fallback, else the NG material name.
        const resolved = bundle.roleResolutions.get(mat.material_slug);
        const name = resolved?.material.name ?? mat.material_name;
        quantities.push(
          quantityLine(
            name,
            mat.practical_purchase_quantity,
            mat.theoretical_unit,
          ),
        );
        if (mat.total_price > 0) {
          costLines.push({ label: name, amount: mat.total_price });
        }
      }
      const pricing = {
        market: marketCode,
        lines: [...bundle.roleResolutions.entries()].map(
          ([slug, resolved]) => ({
            material: slug,
            resolvedAs: resolved.material.name,
            role: resolved.role,
            resolvedMarket: resolved.resolved_market,
            priceSource: resolved.price.price_source ?? null,
            scanSource: resolved.price.scan_source ?? null,
            priceDate: resolved.price.effective_date ?? null,
          }),
        ),
        unpriced: bundle.unpricedSlugs,
        configWarnings: bundle.warnings,
      };
      const costs: EngineCostSummary | null = costLines.length
        ? {
            total: result.practical_purchase_cost,
            currency: result.currency,
            lines: costLines,
            regionalDataAvailable: bundle.roleResolutions.size > 0,
          }
        : null;
      return {
        ok: true,
        engine: "tyrolene_system",
        calculatedAt: new Date().toISOString(),
        quantities,
        costs,
        raw: { ...result, pricing },
      };
    },
  });
} // registerPhase2Engines
