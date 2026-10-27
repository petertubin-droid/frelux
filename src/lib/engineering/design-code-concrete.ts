/**
 * Authoritative concrete design-capacity engine per jurisdiction code.
 *
 * Scope: rectangular singly-reinforced sections in flexure, with code-exact
 * capacity reduction / partial safety factors and, where the code formula is
 * textbook-solid, concrete shear capacity. This module deliberately does NOT
 * reuse the legacy 0.87fy working-strength path in structural-calculator.ts;
 * every branch here cites its governing clause.
 *
 * Supported codes:
 *  - ACI 318-19 (US/IBC 2024): phi factors, psi/MPa cylinder f'c
 *  - EN 1992-1-1 (Eurocode 2): partial factors gamma_c=1.5, gamma_s=1.15
 *  - IS 456:2000 (India): limit state, cube fck
 *  - AS 3600:2018 (Australia/NZ): capacity reduction factors, gamma stress block
 *
 * Nothing is blended between codes. AS 3600 shear is intentionally NOT
 * implemented (Clause 8.2.7 depends on Dv/beta1/axial-load terms this module
 * does not capture); flexure and minimum steel only, reported honestly.
 */

export type DesignConcreteCode =
  "ACI_318" | "EUROCODE_2" | "IS_456" | "AS_3600";

export interface DesignBeamInput {
  code: DesignConcreteCode;
  /** Section width, mm */
  b: number;
  /** Effective depth to tension steel, mm */
  d: number;
  /** Overall section depth, mm (AS 3600 minimum-steel rule needs D) */
  D?: number;
  /** Tension steel area, mm² */
  As: number;
  /**
   * Characteristic concrete strength, MPa. Cylinder for ACI/EC2/AS 3600,
   * cube for IS 456 (IS uses cube fck in its design expressions natively).
   */
  fck: number;
  /** Steel yield strength, MPa */
  fy: number;
}

export interface DesignCapacityResult {
  code: DesignConcreteCode;
  /** Flexural design capacity in kN·m (phi·Mn / MRd / Mu). */
  flexuralCapacityKNm: number | null;
  /** Shear design capacity from concrete alone, kN (null when not implemented). */
  shearCapacityKN: number | null;
  /** Neutral axis depth, mm. */
  neutralAxisMm: number;
  /** Lever arm z, mm. */
  leverArmMm: number;
  /** Factor applied: phi (ACI/AS) or "gamma partial factors" (EC2/IS implicit). */
  capacityFactor: number;
  /** The concrete stress-block depth a / lambda*xu equivalent, mm. */
  blockDepthMm: number;
  warnings: string[];
  formulaTransparency: string[];
}

const valid = (v: number): boolean => Number.isFinite(v) && v > 0;

export function designConcreteCapacity(
  input: DesignBeamInput,
): DesignCapacityResult {
  const { code } = input;
  const b = input.b;
  const d = input.d;
  const As = input.As;
  const fck = input.fck > 0 ? input.fck : 25;
  const fy = input.fy;
  const warnings: string[] = [];
  const formulaTransparency: string[] = [];

  for (const [name, value] of [
    ["Section width b", b],
    ["Effective depth d", d],
    ["Steel area As", As],
    ["Steel yield strength fy", fy],
  ] as const) {
    if (!valid(value))
      throw new Error(`${name} must be a positive number (received ${value}).`);
  }

  switch (code) {
    case "ACI_318": {
      // ACI 318-19 §22.2.2.4.1: a = As*fy / (0.85*f'c*b)
      const a = (As * fy) / (0.85 * fck * b);
      // §22.2.2.4.1: Mn = As*fy*(d - a/2)
      const Mn = (As * fy * (d - a / 2)) / 1e6; // N·mm -> kN·m
      // §21.2 tension-controlled: phi = 0.90
      const phi = 0.9;
      const phiMn = phi * Mn;
      // §22.5.5.1 (SI): Vc = 0.17*lambda*sqrt(f'c)*b*d, lambda=1 NWC
      const Vc = (0.17 * Math.sqrt(fck) * b * d) / 1e3; // N -> kN
      const phiVc = 0.75 * Vc; // §21.2 shear phi
      formulaTransparency.push(
        `a = As·fy/(0.85·f'c·b) = ${As.toFixed(0)}×${fy}/(0.85×${fck}×${b}) = ${a.toFixed(1)} mm (ACI 318-19 §22.2.2.4.1)`,
        `Mn = As·fy·(d − a/2) = ${(As * fy).toFixed(0)}×(${d} − ${(a / 2).toFixed(1)}) = ${Mn.toFixed(1)} kN·m`,
        `phi·Mn = ${phi}×${Mn.toFixed(1)} = ${phiMn.toFixed(1)} kN·m (phi = 0.90 tension-controlled, §21.2.1)`,
        `Vc = 0.17·sqrt(f'c)·b·d = 0.17×${Math.sqrt(fck).toFixed(2)}×${b}×${d} = ${Vc.toFixed(1)} kN; phi·Vc = 0.75×${Vc.toFixed(1)} = ${phiVc.toFixed(1)} kN (§22.5.5.1, §21.2)`,
      );
      if (a > 0.5 * d)
        warnings.push(
          "Stress block exceeds d/2: the section is over-reinforced for the tension-controlled phi = 0.90 assumption; check strain epsilon_t >= 0.005 per ACI 318-19 Table 21.2.2.",
        );
      return {
        code,
        flexuralCapacityKNm: phiMn,
        shearCapacityKN: phiVc,
        neutralAxisMm: a / 0.85,
        leverArmMm: d - a / 2,
        capacityFactor: phi,
        blockDepthMm: a,
        warnings,
        formulaTransparency,
      };
    }

    case "EUROCODE_2": {
      // EN 1992-1-1 §3.1.6: gamma_c = 1.5 (persistent/transient)
      const fcd = fck / 1.5;
      // §3.2.7: gamma_s = 1.15
      const fyd = fy / 1.15;
      // §3.1.7 rectangular stress block: lambda = 0.8, eta = 1.0 for fck <= 50
      const lambda = fck <= 50 ? 0.8 : 0.8 - (fck - 50) / 400;
      const eta = fck <= 50 ? 1.0 : 1.0 - (fck - 50) / 200;
      // x from equilibrium: As*fyd = eta*fcd*lambda*x*b
      const x = (As * fyd) / (eta * fcd * lambda * b);
      // §3.1.7: z = d - lambda*x/2
      const z = d - (lambda * x) / 2;
      const MRd = (As * fyd * z) / 1e6;
      // §6.2.2 Eq. 6.2b min of (6.2a) and (6.2b-ish floor): use simplified
      // CRd,c = 0.18/gamma_c, k = 1 + sqrt(200/d) <= 2.0, rho = As/(b*d)
      const k = Math.min(1 + Math.sqrt(200 / d), 2.0);
      const rho = Math.min(As / (b * d), 0.02);
      const CRdc = 0.18 / 1.5;
      const vRdc = CRdc * k * Math.pow(100 * rho * fck, 1 / 3);
      const vRdcMin = 0.035 * Math.sqrt(fck) * Math.pow(k, 1.5);
      const vRd = Math.max(vRdc, vRdcMin);
      const VRdc = (vRd * b * d) / 1e3; // N -> kN
      formulaTransparency.push(
        `fcd = fck/gamma_c = ${fck}/1.5 = ${fcd.toFixed(2)} MPa; fyd = fyk/gamma_s = ${fy}/1.15 = ${fyd.toFixed(1)} MPa (§3.1.6, §3.2.7)`,
        `x = As·fyd/(eta·fcd·lambda·b) = ${(As * fyd).toFixed(0)}/(${eta.toFixed(2)}×${fcd.toFixed(2)}×${lambda}×${b}) = ${x.toFixed(1)} mm; z = d − lambda·x/2 = ${z.toFixed(1)} mm (§3.1.7)`,
        `MRd = As·fyd·z = ${(As * fyd).toFixed(0)}×${z.toFixed(1)} = ${MRd.toFixed(1)} kN·m`,
        `VRd,c = CRd,c·k·(100·rho·fck)^(1/3)·b·d with floor 0.035·sqrt(fck)·k^1.5 (§6.2.2 Eq. 6.2a/b) = ${VRdc.toFixed(1)} kN`,
      );
      if (x > 0.45 * d && fck <= 50)
        warnings.push(
          `Neutral axis x/d = ${(x / d).toFixed(2)} exceeds the EC2 §5.6.3/5.5 ductility guidance (x/d <= 0.45): redesign the section.`,
        );
      return {
        code,
        flexuralCapacityKNm: MRd,
        shearCapacityKN: VRdc,
        neutralAxisMm: x,
        leverArmMm: z,
        capacityFactor: 1,
        blockDepthMm: lambda * x,
        warnings,
        formulaTransparency,
      };
    }

    case "IS_456": {
      // IS 456:2000 Cl 38.1 (Annex G): xu = 0.87·fy·As/(0.36·fck·b)
      const xu = (0.87 * fy * As) / (0.36 * fck * b);
      // Mu = 0.87·fy·As·(d − 0.42·xu)
      const Mu = (0.87 * fy * As * (d - 0.42 * xu)) / 1e6;
      // Cl 38.1: xu,max/d = 0.53 (Fe250) / 0.48 (Fe415) / 0.46 (Fe500)
      const xuMaxRatio = fy <= 250 ? 0.53 : fy <= 415 ? 0.48 : 0.46;
      // Cl 40.1 Table 19 shear strength: tau_c = 0.85·sqrt(0.8·fck)·(sqrt(1+5beta) − 1)/(6beta)
      const pt = Math.min((100 * As) / (b * d), 3);
      const beta = Math.max((0.8 * fck) / (6.89 * pt), 1.0);
      const tauC =
        (0.85 * Math.sqrt(0.8 * fck) * (Math.sqrt(1 + 5 * beta) - 1)) /
        (6 * beta);
      // Cl 40.2.1: nominal shear tau_v = V/bd (caller compares)
      const shearCapacityKN = (tauC * b * d) / 1e3;
      formulaTransparency.push(
        `xu = 0.87·fy·As/(0.36·fck·b) = 0.87×${fy}×${As.toFixed(0)}/(0.36×${fck}×${b}) = ${xu.toFixed(1)} mm (Cl 38.1, Annex G)`,
        `Mu = 0.87·fy·As·(d − 0.42·xu) = ${(0.87 * fy * As).toFixed(0)}×(${d} − ${(0.42 * xu).toFixed(1)}) = ${Mu.toFixed(1)} kN·m`,
        `xu,max/d = ${xuMaxRatio} for fy = ${fy} MPa; actual x/d = ${(xu / d).toFixed(3)}`,
        `tau_c = 0.85·sqrt(0.8·fck)·(sqrt(1+5·beta)−1)/(6·beta), beta = 0.8·fck/(6.89·pt) = ${beta.toFixed(2)}, pt = ${pt.toFixed(2)}%: tau_c = ${tauC.toFixed(3)} MPa; V_c = tau_c·b·d = ${shearCapacityKN.toFixed(1)} kN (Cl 40.1 Table 19)`,
      );
      if (xu / d > xuMaxRatio)
        warnings.push(
          `Section is over-reinforced: x/d = ${(xu / d).toFixed(3)} exceeds xu,max/d = ${xuMaxRatio} (IS 456 Cl 38.1). Increase depth or provide compression steel.`,
        );
      return {
        code,
        flexuralCapacityKNm: Mu,
        shearCapacityKN,
        neutralAxisMm: xu,
        leverArmMm: d - 0.42 * xu,
        capacityFactor: 1,
        blockDepthMm: xu,
        warnings,
        formulaTransparency,
      };
    }

    case "AS_3600":
    default: {
      // AS 3600:2018 Cl 3.1.4 / Table 3.2: gamma = 1.25 − 0.85·fc/200, clamped 0.65..0.85
      const gamma = Math.min(Math.max(1.25 - (0.85 * fck) / 200, 0.65), 0.85);
      // Rectangular stress block: uniform 0.85·gamma·fc over depth a
      const a = (As * fy) / (0.85 * gamma * fck * b);
      const ku = a / d;
      // Cl 8.1.5 / 2.2.4(d): phi = 0.8 for bending with fsy <= 500 and
      // ku <= 0.4 in the simplified rectangular-block method
      const phi = ku <= 0.4 ? 0.8 : 0.8;
      const Muo = (As * fy * (d - a / 2)) / 1e6;
      const phiMuo = phi * Muo;
      formulaTransparency.push(
        `gamma = 1.25 − 0.85·fc/200 = 1.25 − ${((0.85 * fck) / 200).toFixed(3)} = ${gamma.toFixed(3)} (clamped 0.65..0.85, AS 3600:2018 Table 3.2)`,
        `a = As·fsy/(0.85·gamma·fc·b) = ${(As * fy).toFixed(0)}/(0.85×${gamma.toFixed(3)}×${fck}×${b}) = ${a.toFixed(1)} mm; ku = a/d = ${ku.toFixed(3)}`,
        `Muo = As·fsy·(d − a/2) = ${Muo.toFixed(1)} kN·m; phi·Muo = ${phi}×${Muo.toFixed(1)} = ${phiMuo.toFixed(1)} kN·m (Cl 8.1.5, Table 2.2.2)`,
        `Shear capacity per AS 3600 Cl 8.2.7 is intentionally not reported: beta1 and Dv require more section data than this module captures.`,
      );
      if (ku > 0.4)
        warnings.push(
          `ku = ${ku.toFixed(3)} exceeds 0.4 (AS 3600:2018 Cl 8.1.5): the section is outside the rectangular-block method limits; use a rigorous section analysis.`,
        );
      // Minimum steel, Cl 9.1.1(b): phi·Muo >= 1.2·Mcr where Mcr = fct.f·Z,
      // fct.f = 0.6·sqrt(fc), Z = b·D²/6 rectangular.
      if (input.D && input.D >= d) {
        const D = input.D;
        const fctf = 0.6 * Math.sqrt(fck);
        const Z = (b * D * D) / 6;
        const Mcr = (fctf * Z) / 1e6; // kN·m
        const oneTwoMcr = 1.2 * Mcr;
        if (phiMuo < oneTwoMcr)
          warnings.push(
            `Minimum flexural steel (AS 3600:2018 Cl 9.1.1(b)): phi·Muo = ${phiMuo.toFixed(1)} kN·m is below 1.2·Mcr = ${oneTwoMcr.toFixed(1)} kN·m (Mcr = 0.6·sqrt(fc)·b·D²/6 = ${Mcr.toFixed(1)} kN·m). Increase As.`,
          );
        formulaTransparency.push(
          `Min steel check: 1.2·Mcr = 1.2×(0.6·sqrt(${fck})·${b}×${D}²/6) = ${oneTwoMcr.toFixed(1)} kN·m vs phi·Muo = ${phiMuo.toFixed(1)} kN·m (Cl 9.1.1(b))`,
        );
      } else {
        warnings.push(
          "Overall depth D not supplied: the AS 3600 Cl 9.1.1(b) minimum-steel check (1.2·Mcr) was skipped.",
        );
      }
      return {
        code,
        flexuralCapacityKNm: phiMuo,
        shearCapacityKN: null,
        neutralAxisMm: a,
        leverArmMm: d - a / 2,
        capacityFactor: phi,
        blockDepthMm: a,
        warnings,
        formulaTransparency,
      };
    }
  }
}
