// =========================================================
// OpenTimestamps Bitcoin Blockchain Timestamping Engine
// FRELUX VERIFY
//
// Supports:
// - Multi-calendar pool submission (Alice, Bob, Pool A, Pool B)
// - Cryptographic SHA-256 fingerprint submission (32-byte binary digest)
// - Binary OTS proof serialization & Base64 storage
// - Calendar commitment parsing & Bitcoin block attestation extraction
// - Zero demo fallbacks: fails honestly if calendar servers are unreachable
// - Proof upgrading & status transition:
//     "Awaiting Timestamp" -> "Timestamp Submitted" -> "Bitcoin Confirmation Pending" -> "Blockchain Verified"
// =========================================================

export const DEFAULT_CALENDAR_POOLS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://alice.btc.calendar.opentimestamps.org",
  "https://bob.btc.calendar.opentimestamps.org",
];

export interface OtsSubmissionResult {
  success: boolean;
  documentHash: string;
  calendarsSubmitted: string[];
  proofBase64: string;
  initialStatus:
    | "Awaiting Timestamp"
    | "Timestamp Submitted"
    | "Bitcoin Confirmation Pending"
    | "Blockchain Verified";
  error?: string;
}

export interface OtsVerificationDetails {
  documentHash: string;
  status:
    | "Awaiting Timestamp"
    | "Timestamp Submitted"
    | "Bitcoin Confirmation Pending"
    | "Blockchain Verified"
    | "Verification Failed";
  isConfirmed: boolean;
  bitcoinBlockHeight?: number;
  bitcoinBlockHash?: string;
  bitcoinBlockTime?: string;
  calendarUrls: string[];
  proofMatured: boolean;
  message: string;
}

/** Convert hex string to Uint8Array */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, "");
  if (clean.length % 2 !== 0) {
    throw new Error("Invalid hex length");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/** Convert Uint8Array to hex string */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Check connectivity to OpenTimestamps calendar servers */
export async function pingCalendarPools(
  calendarPools: string[] = DEFAULT_CALENDAR_POOLS,
): Promise<Array<{ url: string; online: boolean; latencyMs?: number }>> {
  const results = await Promise.all(
    calendarPools.map(async (url) => {
      const start = Date.now();
      try {
        const res = await fetch(`${url.replace(/\/+$/, "")}/`, {
          method: "GET",
          signal: AbortSignal.timeout(4000),
        });
        return {
          url,
          online: res.status < 500,
          latencyMs: Date.now() - start,
        };
      } catch {
        return { url, online: false };
      }
    }),
  );
  return results;
}

/** Submit 32-byte SHA-256 document hash to OpenTimestamps calendar pools */
export async function submitHashToOpenTimestamps(
  documentHashHex: string,
  calendarPools: string[] = DEFAULT_CALENDAR_POOLS,
): Promise<OtsSubmissionResult> {
  const hashBytes = hexToBytes(documentHashHex);
  if (hashBytes.length !== 32) {
    throw new Error(
      `SHA-256 hash must be 32 bytes (64 hex characters), got ${hashBytes.length}`,
    );
  }

  const successfulCalendars: string[] = [];
  const proofChunks: Uint8Array[] = [];

  for (const calendar of calendarPools) {
    try {
      const url = `${calendar.replace(/\/+$/, "")}/digest`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/vnd.opentimestamps.v1",
        },
        body: new Blob([hashBytes.buffer.slice(hashBytes.byteOffset, hashBytes.byteOffset + hashBytes.byteLength) as ArrayBuffer]),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 0) {
          successfulCalendars.push(calendar);
          proofChunks.push(new Uint8Array(buffer));
        }
      }
    } catch {
      // Continue to next calendar server for redundancy
    }
  }

  if (successfulCalendars.length === 0) {
    // If external calendars are unreachable, report honest status — do NOT synthesize fake proof
    return {
      success: false,
      documentHash: documentHashHex.toLowerCase(),
      calendarsSubmitted: [],
      proofBase64: "",
      initialStatus: "Awaiting Timestamp",
      error:
        "OpenTimestamps calendar servers unreachable. Stored in queue awaiting timestamping.",
    };
  }

  // Combine primary proof chunk
  const primaryProof = proofChunks[0];
  const proofBase64 = btoa(String.fromCharCode(...primaryProof));

  return {
    success: true,
    documentHash: documentHashHex.toLowerCase(),
    calendarsSubmitted: successfulCalendars,
    proofBase64,
    initialStatus: "Timestamp Submitted",
  };
}

import { read as readOts } from "./vendor/ots/read.ts";
import { write as writeOts } from "./vendor/ots/write.ts";
import { upgrade as upgradeOts } from "./vendor/ots/upgrade.ts";
import { verify as verifyOts } from "./vendor/ots/verify.ts";
import { treeToPaths } from "./vendor/ots/internals.ts";
import verifiers from "./vendor/ots/verifiers/index.ts";
import { uint8ArrayToBase64, uint8ArrayFromBase64, uint8ArrayToHex } from "./vendor/ots/utils.ts";

function findBitcoinHeight(timestamp: ReturnType<typeof readOts>): number | undefined {
  return treeToPaths(timestamp.tree)
    .map(({ leaf }) => leaf)
    .find((leaf) => leaf.type === "bitcoin")?.height;
}

/**
 * Parse, calendar-upgrade, and cryptographically verify an OpenTimestamps proof.
 * A Bitcoin leaf in the serialized proof is not itself a verified attestation:
 * confirmation is reported only when two independent block explorers agree on
 * the timestamp for the block's merkle root.
 */
export async function upgradeOtsProof(
  proofBase64: string,
  expectedDocumentHash: string,
): Promise<{
  upgradedProofBase64: string;
  status:
    | "Awaiting Timestamp"
    | "Timestamp Submitted"
    | "Bitcoin Confirmation Pending"
    | "Blockchain Verified";
  bitcoinBlockHeight?: number;
  bitcoinBlockHash?: string;
  bitcoinBlockTime?: string;
}> {
  if (!proofBase64) {
    return { upgradedProofBase64: "", status: "Awaiting Timestamp" };
  }

  const initialTimestamp = readOts(uint8ArrayFromBase64(proofBase64));
  const allowedCalendarOrigins = new Set(DEFAULT_CALENDAR_POOLS.map((url) => new URL(url).origin));
  for (const { leaf } of treeToPaths(initialTimestamp.tree)) {
    if (leaf.type === "pending" && !allowedCalendarOrigins.has(leaf.url.origin)) {
      throw new Error("OpenTimestamps proof references an untrusted calendar endpoint");
    }
  }
  if (initialTimestamp.fileHash.algorithm !== "sha256" ||
      uint8ArrayToHex(initialTimestamp.fileHash.value) !== expectedDocumentHash.toLowerCase()) {
    throw new Error("OpenTimestamps proof does not match the registered document hash");
  }
  const upgraded = await upgradeOts(initialTimestamp);
  const serialized = writeOts(upgraded.timestamp);
  const upgradedProofBase64 = uint8ArrayToBase64(serialized);
  const bitcoinBlockHeight = findBitcoinHeight(upgraded.timestamp);

  if (bitcoinBlockHeight === undefined) {
    return { upgradedProofBase64, status: "Timestamp Submitted" };
  }

  // The upstream verifiers each recompute the OTS operation chain and compare
  // its result to the block's actual merkle root. Require both providers to
  // independently confirm the same block time before asserting verification.
  const verification = await verifyOts(upgraded.timestamp, verifiers);
  const agreeingTime = Object.entries(verification.attestations).find(
    ([, names]) => names.length >= 2,
  )?.[0];

  if (!agreeingTime) {
    return {
      upgradedProofBase64,
      status: "Bitcoin Confirmation Pending",
      bitcoinBlockHeight,
    };
  }

  let bitcoinBlockHash: string | undefined;
  try {
    const hashResponse = await fetch(
      `https://blockstream.info/api/block-height/${bitcoinBlockHeight}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (hashResponse.ok) {
      const candidate = (await hashResponse.text()).trim();
      if (/^[0-9a-f]{64}$/i.test(candidate)) bitcoinBlockHash = candidate;
    }
  } catch {
    // A block hash is useful display metadata, but not required for the proof verdict.
  }

  return {
    upgradedProofBase64,
    status: "Blockchain Verified",
    bitcoinBlockHeight,
    bitcoinBlockHash,
    bitcoinBlockTime: new Date(Number(agreeingTime) * 1000).toISOString(),
  };
}
