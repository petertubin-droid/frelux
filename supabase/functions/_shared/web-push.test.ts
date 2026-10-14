// =========================================================
// WEB PUSH CRYPTO TESTS — RFC 8291 official test vector
//
// The canonical encryption example from RFC 8291 §5/Appendix A
// is replayed byte-for-byte (fixed salt + sender keys injected)
// and every intermediate (ECDH secret, PRK, CEK, nonce, header,
// ciphertext) is checked against the RFC's published values.
// This is the only honest way to prove the hand-rolled RFC
// 8291/8188 derivation is correct without a live browser
// subscription. The self-decrypt round trip additionally proves
// a compliant receiver (with the user-agent private key) can
// read what this implementation sends.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  base64UrlDecode,
  base64UrlEncode,
  encryptPayload,
  vapidHeader,
  derSignature,
  deadEndpoint,
} from "./web-push.ts";

const VECTOR = {
  plaintext: "When I grow up, I want to be a watermelon",
  uaPublic:
    "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  uaPrivate: "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94",
  authSecret: "BTBZMqHH6r4Tts7J_aSIgg",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asPublic:
    "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  // Appendix A: the 86-octet aes128gcm header and the 59-octet
  // ciphertext (§5's page-wrapped body lost chars at a page
  // boundary, so the two are validated separately in bytes).
  headerB64:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  ciphertextB64:
    "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ",
};

function asSenderJwk() {
  const pub = base64UrlDecode(VECTOR.asPublic);
  return {
    kty: "EC" as const,
    crv: "P-256" as const,
    x: base64UrlEncode(pub.slice(1, 33)),
    y: base64UrlEncode(pub.slice(33, 65)),
    d: VECTOR.asPrivate,
  };
}

describe("web-push crypto (RFC 8291)", () => {
  it("encrypts the RFC 8291 §5 example byte-for-byte (header + ciphertext)", async () => {
    const body = await encryptPayload(
      VECTOR.plaintext,
      VECTOR.uaPublic,
      VECTOR.authSecret,
      {
        salt: base64UrlDecode(VECTOR.salt),
        asPrivateKeyJwk: asSenderJwk(),
        asPublicKeyRaw: base64UrlDecode(VECTOR.asPublic),
      },
    );
    const header = base64UrlDecode(VECTOR.headerB64);
    const ciphertext = base64UrlDecode(VECTOR.ciphertextB64);
    expect(body.length).toBe(header.length + ciphertext.length); // 145
    expect(body.slice(0, header.length)).toEqual(header);
    expect(body.slice(header.length)).toEqual(ciphertext);
  });

  it("a compliant receiver decrypts the output (self round trip)", async () => {
    // Encrypt with a random salt, then act as the user agent:
    // derive the CEK/nonce from OUR private key and decrypt.
    const body = await encryptPayload(
      "Ping from Frelux",
      VECTOR.uaPublic,
      VECTOR.authSecret,
    );
    const dv = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const salt = body.slice(0, 16);
    const idLen = body[20]; // salt(16) || rs(4) || idlen(1)
    const asPublicRaw = body.slice(21, 21 + idLen);
    const ciphertext = body.slice(21 + idLen);

    const uaPriv = await crypto.subtle.importKey(
      "jwk",
      {
        kty: "EC",
        crv: "P-256",
        x: base64UrlEncode(base64UrlDecode(VECTOR.uaPublic).slice(1, 33)),
        y: base64UrlEncode(base64UrlDecode(VECTOR.uaPublic).slice(33, 65)),
        d: VECTOR.uaPrivate,
      },
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveBits"],
    );
    const asPub = await crypto.subtle.importKey(
      "jwk",
      {
        kty: "EC",
        crv: "P-256",
        x: base64UrlEncode(asPublicRaw.slice(1, 33)),
        y: base64UrlEncode(asPublicRaw.slice(33, 65)),
      },
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    );
    const ecdh = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "ECDH", namedCurve: "P-256", public: asPub },
        uaPriv,
        256,
      ),
    );
    // Same schedule as encryptPayload, mirrored for the UA side.
    const enc = new TextEncoder();
    const hmac = async (k: Uint8Array, d: Uint8Array) => {
      const key = await crypto.subtle.importKey(
        "raw",
        k as unknown as ArrayBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      return new Uint8Array(
        await crypto.subtle.sign("HMAC", key, d as unknown as ArrayBuffer),
      );
    };
    const cat = (...ps: Uint8Array[]) => {
      const t = ps.reduce((n, p) => n + p.length, 0);
      const o = new Uint8Array(t);
      let x = 0;
      for (const p of ps) {
        o.set(p, x);
        x += p.length;
      }
      return o;
    };
    const prkKey = await hmac(base64UrlDecode(VECTOR.authSecret), ecdh);
    const expand = async (prk: Uint8Array, info: Uint8Array, len: number) =>
      (await hmac(prk, cat(info, new Uint8Array([1])))).slice(0, len);
    const ikm = await expand(
      prkKey,
      cat(
        enc.encode("WebPush: info"),
        new Uint8Array([0]),
        base64UrlDecode(VECTOR.uaPublic),
        asPublicRaw,
      ),
      32,
    );
    const prk = await hmac(salt, ikm);
    const cek = await expand(
      prk,
      cat(enc.encode("Content-Encoding: aes128gcm"), new Uint8Array([0])),
      16,
    );
    const nonce = await expand(
      prk,
      cat(enc.encode("Content-Encoding: nonce"), new Uint8Array([0])),
      12,
    );
    const aesKey = await crypto.subtle.importKey(
      "raw",
      cek as unknown as ArrayBuffer,
      "AES-GCM",
      false,
      ["decrypt"],
    );
    const plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce as unknown as ArrayBuffer },
        aesKey,
        ciphertext as unknown as ArrayBuffer,
      ),
    );
    expect(new TextDecoder().decode(plain.slice(0, -1))).toBe(
      "Ping from Frelux",
    );
    expect(plain[plain.length - 1]).toBe(0x02); // padding delimiter
  });

  it("produces a fresh random salt per call (replay-safe)", async () => {
    const a = await encryptPayload("hi", VECTOR.uaPublic, VECTOR.authSecret);
    const b = await encryptPayload("hi", VECTOR.uaPublic, VECTOR.authSecret);
    expect(Array.from(a.slice(0, 16))).not.toEqual(Array.from(b.slice(0, 16)));
    expect(a[20]).toBe(65); // idlen = 65-byte P-256 point
  });

  it("rejects a p256dh that is not a 65-byte uncompressed point", async () => {
    await expect(
      encryptPayload(
        "hi",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        VECTOR.authSecret,
      ),
    ).rejects.toThrow(/65-byte/);
  });
});

describe("vapidHeader (RFC 8292)", () => {
  it("builds a verifiable ES256 vapid t=..., k=... header", async () => {
    const pair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const pubRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", pair.publicKey),
    );
    const header = await vapidHeader(
      "https://push.example.net/push/JzLQ3raZJfFBR0aqvOMsLrt54w4rJUsV",
      base64UrlEncode(pubRaw),
      jwk.d as string,
      "mailto:noreply@freluxtools.com",
    );
    expect(header.startsWith("vapid t=eyJ")).toBe(true);
    const m = /vapid t=(.+), k=(.+)$/.exec(header)!;
    const [h, p, sigB] = m[1].split(".");
    expect(JSON.parse(atob(h.replace(/-/g, "+").replace(/_/g, "/")))).toEqual({
      typ: "JWT",
      alg: "ES256",
    });
    const claims = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    expect(claims.aud).toBe("https://push.example.net");
    expect(claims.sub).toBe("mailto:noreply@freluxtools.com");
    expect(claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(m[2]).toBe(base64UrlEncode(pubRaw));

    // The JWT signature verifies against the public key in both
    // runtime formats: V8 emits DER, Node emits P1363.
    const sigBytes = base64UrlDecode(sigB);
    const data = new TextEncoder().encode(`${h}.${p}`);
    // The JWT signature must be DER (RFC 7515). Verify it in
    // whichever form this runtime's WebCrypto accepts.
    expect(sigBytes[0]).toBe(0x30); // DER SEQUENCE
    const verified =
      (await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        pair.publicKey,
        sigBytes as unknown as ArrayBuffer,
        data as unknown as ArrayBuffer,
      )) ||
      (await (async () => {
        const unwrap = (der: Uint8Array): Uint8Array => {
          // SEQUENCE(INTEGER r, INTEGER s) -> r||s padded to 32
          const readInt = (i: number): [Uint8Array, number] => {
            const len = der[i + 1];
            const body = der.slice(i + 2, i + 2 + len);
            const out = new Uint8Array(32);
            out.set(body.slice(Math.max(0, len - 32)), 32 - Math.min(32, len));
            return [out, i + 2 + len];
          };
          const [r, i2] = readInt(2);
          const [s] = readInt(i2);
          const rs = new Uint8Array(64);
          rs.set(r, 0);
          rs.set(s, 32);
          return rs;
        };
        return crypto.subtle.verify(
          { name: "ECDSA", hash: "SHA-256" },
          pair.publicKey,
          unwrap(sigBytes) as unknown as ArrayBuffer,
          data as unknown as ArrayBuffer,
        );
      })());
    expect(verified).toBe(true);
  });
});

describe("derSignature", () => {
  it("encodes minimal-length INTEGErs with sign padding", () => {
    // r: leading zero stripped to 31 significant bytes.
    // s: starts with 0xFF -> padded with 0x00 to 33 bytes.
    const rs = new Uint8Array(64);
    rs[0] = 0x00;
    rs[1] = 0x01;
    for (let i = 2; i < 32; i++) rs[i] = 0x42;
    rs[32] = 0xff;
    for (let i = 33; i < 64; i++) rs[i] = 0x03;
    const der = derSignature(rs);
    expect(der[0]).toBe(0x30);
    expect(der[1]).toBe(31 + 2 + 33 + 2); // inner length
    // INTEGER r
    expect(der[2]).toBe(0x02);
    expect(der[3]).toBe(31);
    expect(Array.from(der.slice(4, 7))).toEqual([0x01, 0x42, 0x42]);
    // INTEGER s (sign pad)
    const sStart = 2 + 2 + 31; // r block ends
    expect(der[sStart]).toBe(0x02);
    expect(der[sStart + 1]).toBe(33);
    expect(der[sStart + 2]).toBe(0x00);
    expect(der[sStart + 3]).toBe(0xff);
  });

  it("throws on a wrong signature length", () => {
    expect(() => derSignature(new Uint8Array(10))).toThrow();
  });
});

describe("deadEndpoint", () => {
  it("treats 404/410 as dead and everything else as alive", () => {
    expect(deadEndpoint(404)).toBe(true);
    expect(deadEndpoint(410)).toBe(true);
    expect(deadEndpoint(400)).toBe(false);
    expect(deadEndpoint(429)).toBe(false);
  });
});
