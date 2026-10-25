// Registry of all per-jurisdiction tax fixtures.
import type { MarketTaxFixture } from "./types";
import { AE } from "./markets/AE";
import { AU } from "./markets/AU";
import { BR } from "./markets/BR";
import { CA } from "./markets/CA";
import { CN } from "./markets/CN";
import { DE } from "./markets/DE";
import { FR } from "./markets/FR";
import { GB } from "./markets/GB";
import { GH } from "./markets/GH";
import { ID } from "./markets/ID";
import { IN } from "./markets/IN";
import { IT } from "./markets/IT";
import { JP } from "./markets/JP";
import { KE } from "./markets/KE";
import { KR } from "./markets/KR";
import { MX } from "./markets/MX";
import { NG } from "./markets/NG";
import { SA } from "./markets/SA";
import { US } from "./markets/US";
import { ZA } from "./markets/ZA";

/** All market fixtures, sorted by market code. */
export const MARKET_TAX_FIXTURES: MarketTaxFixture[] = [
  AE,
  AU,
  BR,
  CA,
  CN,
  DE,
  FR,
  GB,
  GH,
  ID,
  IN,
  IT,
  JP,
  KE,
  KR,
  MX,
  NG,
  SA,
  US,
  ZA,
].sort((a, b) => a.market.localeCompare(b.market));

/** Fixture lookup by market code. */
export function fixtureFor(marketCode: string): MarketTaxFixture | undefined {
  return MARKET_TAX_FIXTURES.find((f) => f.market === marketCode);
}
