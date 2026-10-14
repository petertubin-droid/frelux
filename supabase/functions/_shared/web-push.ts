// =========================================================
// FRELUX EDGE SHARED: WEB PUSH CRYPTO (RFC 8030 / 8291 / 8292)
//
// Minimal, dependency-free Web Push over standard WebCrypto:
//   * encryptPayload() — RFC 8291 aes128gcm content coding
//     (ECDH P-256 + HKDF + AES-128-GCM), validated against the
//     official RFC 8291 test vector in web-push.test.ts.
//   * vapidHeader() — RFC 8292 ES256 JWT signed with the VAPID
//     private key; aud = origin of the push endpoint.
//   * deadEndpoint() — 404/410 means the subscription is gone
//     and its row must be pruned.
//
// Key imports use JWK (no hand-rolled DER for key material);
// the only DER emitted is the small ES256 signature wrapper.
// =========================================================

const encoder = new TextEncoder();

// ---------- base64url helpers (unpadded, RFC 7515) ----------

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Splits a raw 65-byte P-256 public key (04 || X || Y) into JWK parts. */
function rawToJwkXY(raw: Uint8Array): { x: string; y: string } {
  if (raw.length !== 65 || raw[0] !== 0x04) {
    throw new Error("p256dh must be a 65-byte uncompressed P-256 point");
  }
  return {
    x: base64UrlEncode(raw.slice(1, 33)),
    y: base64UrlEncode(raw.slice(33, 65)),
  };
}

// ---------- HMAC / HKDF (RFC 5869) as explicit primitives ----------
// RFC 8291's pseudocode mixes HKDF-Extract and HKDF-Expand in
// the SAME key schedule, so they are implemented separately
// (WebCrypto HKDF always fuses them, which is wrong here).

async function hmac(
  keyBytes: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, toArrayBuffer(data)),
  );
}

/** HKDF-Extract: PRK = HMAC-SHA-256(salt, IKM). */
function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmac(salt, ikm);
}

/** HKDF-Expand (single-block lengths used by RFC 8291). */
async function hkdfExpand(
  prk: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const t = await hmac(prk, concat(info, new Uint8Array([1])));
  return t.slice(0, length);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(view.byteLength);
  new Uint8Array(out).set(view);
  return out;
}

// ---------- RFC 8291 payload encryption ----------

/** Keys/salt overrides so the RFC 8291 test vector is replayable. */
export interface EncryptOverrides {
  salt?: Uint8Array;
  asPrivateKeyJwk?: JsonWebKey;
  asPublicKeyRaw?: Uint8Array;
}

/**
 * RFC 8291 §3: encrypt `plaintext` for the subscription keys
 * using the aes128gcm content coding:
 *   PRK_key = HKDF-Extract(salt = auth_secret, IKM = ECDH secret)
 *   IKM     = HKDF-Expand(PRK_key, "WebPush: info"||0||ua||as, 32)
 *   PRK     = HKDF-Extract(salt, IKM)
 *   CEK     = HKDF-Expand(PRK, "Content-Encoding: aes128gcm"||0, 16)
 *   NONCE   = HKDF-Expand(PRK, "Content-Encoding: nonce"||0, 12)
 * Plaintext gets the RFC 8188 0x02 padding delimiter appended.
 * Returns: salt(16) || rs(4) || idlen(1) || as_public || ciphertext.
 */
export async function encryptPayload(
  plaintext: string,
  p256dhB64: string,
  authB64: string,
  overrides?: EncryptOverrides,
): Promise<Uint8Array> {
  const uaPublicRaw = base64UrlDecode(p256dhB64);
  const authSecret = base64UrlDecode(authB64);
  const { x, y } = rawToJwkXY(uaPublicRaw);
  const uaPublic = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y },
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // as_key: ephemeral application-server key pair (or the RFC
  // test vector's fixed pair when provided).
  let asPrivateKey: CryptoKey;
  let asPublicRaw: Uint8Array;
  if (overrides?.asPrivateKeyJwk && overrides.asPublicKeyRaw) {
    asPrivateKey = await crypto.subtle.importKey(
      "jwk",
      overrides.asPrivateKeyJwk,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveBits"],
    );
    asPublicRaw = overrides.asPublicKeyRaw;
  } else {
    const asPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    );
    asPrivateKey = asPair.privateKey;
    asPublicRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", asPair.publicKey),
    );
  }

  // ecdh_secret = ECDH(as_private, ua_public)
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", namedCurve: "P-256", public: uaPublic },
      asPrivateKey,
      256,
    ),
  );

  // Combine the ECDH and authentication secrets (RFC 8291 §3.2):
  // PRK_key = HKDF-Extract(salt = auth_secret, IKM = ecdh_secret)
  // IKM     = HKDF-Expand(PRK_key, "WebPush: info"||0||ua||as, 32)
  const prkKey = await hkdfExtract(authSecret, ecdhSecret);
  const keyInfo = concat(
    encoder.encode("WebPush: info"),
    new Uint8Array([0]),
    uaPublicRaw,
    asPublicRaw,
  );
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  // RFC 8188 content-encryption derivation with the header salt:
  // PRK   = HKDF-Extract(salt, IKM)
  // CEK   = HKDF-Expand(PRK, "Content-Encoding: aes128gcm"||0, 16)
  // NONCE = HKDF-Expand(PRK, "Content-Encoding: nonce"||0, 12)
  const salt = overrides?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(
    prk,
    concat(encoder.encode("Content-Encoding: aes128gcm"), new Uint8Array([0])),
    16,
  );
  const nonce = await hkdfExpand(
    prk,
    concat(encoder.encode("Content-Encoding: nonce"), new Uint8Array([0])),
    12,
  );

  const aesKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(cek),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  // RFC 8188 §2: padding = delimiter 0x02 (no extra padding).
  const padded = concat(encoder.encode(plaintext), new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(nonce), tagLength: 128 },
      aesKey,
      toArrayBuffer(padded),
    ),
  );

  // aes128gcm header: salt(16) || rs(4, big endian 4096) || idlen(1)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  return concat(
    salt,
    rs,
    new Uint8Array([asPublicRaw.length]),
    asPublicRaw,
    ciphertext,
  );
}

// ---------- RFC 8292 VAPID authorization ----------

/**
 * Builds the Authorization header for the push POST:
 * `vapid t=<jwt>, k=<base64url-unpadded public key>`.
 * Both key params are base64url (unpadded) P-256 values; the
 * private key is the 32-byte scalar, the public key is the
 * 65-byte uncompressed point.
 */
export async function vapidHeader(
  endpoint: string,
  publicKeyB64: string,
  privateKeyB64: string,
  subject: string,
): Promise<string> {
  // aud = scheme://origin of the endpoint (RFC 8292 §2.2).
  const origin = new URL(endpoint).origin;

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const claims = { aud: origin, exp: now + 12 * 60 * 60, sub: subject };
  const unsigned =
    `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.` +
    `${base64UrlEncode(encoder.encode(JSON.stringify(claims)))}`;

  const { x, y } = rawToJwkXY(base64UrlDecode(publicKeyB64));
  const d = base64UrlEncode(base64UrlDecode(privateKeyB64));
  const privKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privKey,
      toArrayBuffer(encoder.encode(unsigned)),
    ),
  );
  // ES256 JWT signatures are DER. V8/Deno WebCrypto already
  // emits DER (0x30 SEQUENCE first byte); Node emits the raw
  // P1363 r||s instead — normalize so both runtimes produce a
  // valid ES256 JWT.
  const der = sig[0] === 0x30 ? sig : derSignature(sig);

  const jwt = `${unsigned}.${base64UrlEncode(der)}`;
  return `vapid t=${jwt}, k=${publicKeyB64.replace(/=+$/, "")}`;
}

/** DER: SEQUENCE { INTEGER(r), INTEGER(s) } for a 64-byte ECDSA signature. */
export function derSignature(rs: Uint8Array): Uint8Array {
  if (rs.length !== 64) throw new Error("expected 64-byte r||s signature");
  const encInt = (v: Uint8Array): Uint8Array => {
    let start = 0;
    while (start < v.length - 1 && v[start] === 0 && v[start + 1] < 0x80)
      start++;
    const body = v.slice(start);
    const pad = body[0] > 0x7f ? 1 : 0;
    const out = new Uint8Array(2 + pad + body.length);
    out[0] = 0x02;
    out[1] = body.length + pad;
    if (pad) out[2] = 0;
    out.set(body, 2 + pad);
    return out;
  };
  const body = concat(encInt(rs.slice(0, 32)), encInt(rs.slice(32, 64)));
  const out = new Uint8Array(2 + body.length);
  out[0] = 0x30;
  out[1] = body.length;
  out.set(body, 2);
  return out;
}

/** A push endpoint response that means the subscription is dead. */
export function deadEndpoint(status: number): boolean {
  return status === 404 || status === 410;
}
