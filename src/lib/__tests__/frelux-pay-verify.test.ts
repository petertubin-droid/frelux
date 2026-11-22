// =========================================================
// Tests for FRELUX PAY & FRELUX VERIFY
// =========================================================

import { describe, it, expect } from "vitest";
import { formatBtc, formatSats } from "@/lib/payments/btcpay";
import {
  calculateBytesSha256,
  generateVerificationCertificateJson,
  type VerificationLookupResult,
} from "@/lib/blockchain/opentimestamps";
import { PAYMENT_GATEWAYS, parseGateway } from "@/lib/payments/gateway";

describe("FRELUX PAY — Bitcoin Client Helpers", () => {
  it("formats BTC to 8 decimal places accurately", () => {
    expect(formatBtc(0)).toBe("0.00000000");
    expect(formatBtc(0.00030526)).toBe("0.00030526");
    expect(formatBtc("0.00030526")).toBe("0.00030526");
    expect(formatBtc(1.5)).toBe("1.50000000");
    expect(formatBtc(undefined)).toBe("0.00000000");
    expect(formatBtc(null)).toBe("0.00000000");
  });

  it("formats Satoshis with localized thousands separators", () => {
    expect(formatSats(0)).toBe("0");
    expect(formatSats(30526)).toBe("30,526");
    expect(formatSats(100000000)).toBe("100,000,000");
  });

  it("registers btcpay as an official payment gateway rail", () => {
    expect(PAYMENT_GATEWAYS).toContain("btcpay");
    expect(parseGateway("btcpay")).toBe("btcpay");
  });
});

describe("FRELUX VERIFY — Blockchain Document Verification", () => {
  it("calculates exact SHA-256 fingerprint from bytes", async () => {
    const encoder = new TextEncoder();
    const testBytes = encoder.encode("FRELUX Sealed BOQ Document 2026");
    const hash = await calculateBytesSha256(testBytes);

    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);

    // Deterministic: same input produces exact same hash
    const hash2 = await calculateBytesSha256(testBytes);
    expect(hash2).toBe(hash);
  });

  it("generates a well-structured cryptographic certificate JSON", () => {
    const mockResult: VerificationLookupResult = {
      success: true,
      verified: true,
      result: "verified_confirmed",
      document: {
        verification_id: "FRX-VER-2026-X8K2M9",
        document_title: "Commercial Complex BOQ Rev 2",
        document_reference: "BOQ-2026-004",
        document_type: "boq",
        document_hash:
          "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        byte_size: 1048576,
        created_at: "2026-11-22T08:00:00Z",
        status: "Blockchain Verified",
      },
      proof: {
        bitcoin_block_height: 924512,
        bitcoin_block_hash:
          "00000000000000000002a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
        calendar_urls: [
          "https://a.pool.opentimestamps.org",
          "https://alice.btc.calendar.opentimestamps.org",
        ],
        ots_proof_base64: "AQVPcGVuVGltZXN0YW1wcwA=",
        is_blockchain_confirmed: true,
      },
    };

    const certJson = generateVerificationCertificateJson(mockResult);
    const parsed = JSON.parse(certJson);

    expect(parsed.certificate_issuer).toContain("FRELUXTOOLS");
    expect(parsed.document.verification_id).toBe("FRX-VER-2026-X8K2M9");
    expect(parsed.blockchain_proof.is_confirmed).toBe(true);
    expect(parsed.blockchain_proof.bitcoin_block_height).toBe(924512);
    expect(parsed.authenticity_statement).toContain(
      "cryptographically anchored in the Bitcoin blockchain",
    );
  });

  it("honest pending certification when proof is not yet confirmed in a block", () => {
    const mockPendingResult: VerificationLookupResult = {
      success: true,
      verified: true,
      result: "verified_pending_block",
      document: {
        verification_id: "FRX-VER-2026-Pending9",
        document_title: "Draft BOQ",
        document_type: "boq",
        document_hash:
          "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5",
        created_at: "2026-11-22T09:00:00Z",
        status: "Bitcoin Confirmation Pending",
      },
      proof: {
        calendar_urls: ["https://a.pool.opentimestamps.org"],
        ots_proof_base64: "AQVPcGVuVGltZXN0YW1wcwA=",
        is_blockchain_confirmed: false,
      },
    };

    const certJson = generateVerificationCertificateJson(mockPendingResult);
    const parsed = JSON.parse(certJson);

    expect(parsed.blockchain_proof.is_confirmed).toBe(false);
    expect(parsed.blockchain_proof.bitcoin_block_height).toBe(
      "Pending Block Mining",
    );
    expect(parsed.authenticity_statement).toContain(
      "Blockchain confirmation is pending Bitcoin block inclusion",
    );
  });
});
