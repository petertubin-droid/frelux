/**
 * FRELUX market bundles - the composed view of all 32 markets.
 *
 * The electrical and plumbing registries are BUILT from these bundles, so
 * the bundle is the single authoring surface: edit a market's data here
 * (or add a new market file) and every engine registry follows. The CI
 * completeness gate fails the build if a bundle is missing or incomplete.
 */
import type { MarketBundle } from "./types";
import { NG } from "./ng";
import { US } from "./us";
import { GB } from "./gb";
import { CA } from "./ca";
import { AU } from "./au";
import { DE } from "./de";
import { IN } from "./in";
import { GH } from "./gh";
import { KE } from "./ke";
import { ZA } from "./za";
import { JP } from "./jp";
import { FR } from "./fr";
import { BR } from "./br";
import { SA } from "./sa";
import { AE } from "./ae";
import { CN } from "./cn";
import { ID } from "./id";
import { MX } from "./mx";
import { KR } from "./kr";
import { IT } from "./it";
import { ET } from "./et";
import { EG } from "./eg";
import { TZ } from "./tz";
import { CI } from "./ci";
import { ES } from "./es";
import { NL } from "./nl";
import { PL } from "./pl";
import { SE } from "./se";
import { CH } from "./ch";
import { SG } from "./sg";
import { TR } from "./tr";
import { NZ } from "./nz";

export type { MarketBundle };

export const MARKET_BUNDLES: Record<string, MarketBundle> = {
  NG,
  US,
  GB,
  CA,
  AU,
  DE,
  IN,
  GH,
  KE,
  ZA,
  JP,
  FR,
  BR,
  SA,
  AE,
  CN,
  ID,
  MX,
  KR,
  IT,
  ET,
  EG,
  TZ,
  CI,
  ES,
  NL,
  PL,
  SE,
  CH,
  SG,
  TR,
  NZ,
};

/** Honest lookup: returns null for unknown markets - never a fallback bundle. */
export function getMarketBundle(code: string): MarketBundle | null {
  const upper = code.toUpperCase();
  return MARKET_BUNDLES[upper] ?? null;
}
