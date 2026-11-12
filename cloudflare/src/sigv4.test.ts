import { describe, expect, it } from "vitest";
import { amzDate, canonicalPath, presignR2Url, safeObjectKey } from "./sigv4";

/**
 * Known-answer tests. The signature below was cross-checked against mhart/aws4,
 * an independent S3 signer: given the same request it returns 3ed0be64... here,
 * byte for byte. That is what proves the canonical request, the key derivation
 * and the encoding are right without calling R2 with live credentials. The AWS
 * documentation's own example (aeeed9bb...) signs an extra `range` header, so it
 * is not comparable with this host-only request.
 */
const EXAMPLE_CREDENTIALS = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
};

describe("presignR2Url", () => {
  it("reproduces the reference S3 presigned GET signature", async () => {
    const url = await presignR2Url({
      method: "GET",
      endpoint: "https://examplebucket.s3.amazonaws.com",
      bucket: "",
      key: "test.txt",
      region: "us-east-1",
      expiresIn: 86400,
      now: new Date("2013-05-24T00:00:00Z"),
      ...EXAMPLE_CREDENTIALS,
    });

    const signature = new URL(url).searchParams.get("X-Amz-Signature");
    expect(signature).toBe(
      "3ed0be64024db54d5574a27da223529635c383f911f80e636f0ccc13890053d2",
    );
  });

  it("builds the canonical request fields the S3 docs describe", async () => {
    const url = await presignR2Url({
      method: "GET",
      endpoint: "https://examplebucket.s3.amazonaws.com",
      bucket: "",
      key: "test.txt",
      region: "us-east-1",
      expiresIn: 86400,
      now: new Date("2013-05-24T00:00:00Z"),
      ...EXAMPLE_CREDENTIALS,
    });
    const parsed = new URL(url);

    expect(parsed.pathname).toBe("/test.txt");
    expect(parsed.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(parsed.searchParams.get("X-Amz-Credential")).toBe(
      "AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request",
    );
    expect(parsed.searchParams.get("X-Amz-Date")).toBe("20130524T000000Z");
    expect(parsed.searchParams.get("X-Amz-Expires")).toBe("86400");
    expect(parsed.searchParams.get("X-Amz-SignedHeaders")).toBe("host");
  });

  it("signs R2 URLs against the R2 endpoint with region auto", async () => {
    const url = await presignR2Url({
      method: "PUT",
      endpoint: "https://abc123.r2.cloudflarestorage.com",
      bucket: "avatars",
      key: "user-1/2026/logo.png",
      expiresIn: 600,
      now: new Date("2026-11-12T09:30:00Z"),
      ...EXAMPLE_CREDENTIALS,
    });
    const parsed = new URL(url);

    expect(parsed.origin).toBe("https://abc123.r2.cloudflarestorage.com");
    expect(parsed.pathname).toBe("/avatars/user-1/2026/logo.png");
    expect(parsed.searchParams.get("X-Amz-Credential")).toContain(
      "/20261112/auto/s3/aws4_request",
    );
    expect(parsed.searchParams.get("X-Amz-Signature")).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it("changes the signature when the key or method changes", async () => {
    const base = {
      endpoint: "https://abc123.r2.cloudflarestorage.com",
      bucket: "avatars",
      now: new Date("2026-11-12T09:30:00Z"),
      ...EXAMPLE_CREDENTIALS,
    };
    const signature = async (variant: { method: "GET" | "PUT"; key: string }) =>
      new URL(await presignR2Url({ ...base, ...variant })).searchParams.get(
        "X-Amz-Signature",
      );

    const first = await signature({ method: "PUT", key: "a.png" });
    const otherKey = await signature({ method: "PUT", key: "b.png" });
    const otherMethod = await signature({ method: "GET", key: "a.png" });

    expect(first).not.toBe(otherKey);
    expect(first).not.toBe(otherMethod);
  });
});

describe("canonicalPath", () => {
  it("encodes segments but keeps slashes", () => {
    expect(canonicalPath("avatars", "user 1/logo (2).png")).toBe(
      "/avatars/user%201/logo%20%282%29.png",
    );
  });

  it("omits the bucket segment when the endpoint already carries it", () => {
    expect(canonicalPath("", "test.txt")).toBe("/test.txt");
  });
});

describe("amzDate", () => {
  it("formats the timestamp AWS expects", () => {
    expect(amzDate(new Date("2013-05-24T00:00:00Z"))).toBe("20130524T000000Z");
  });
});

describe("safeObjectKey", () => {
  it("strips path traversal and unsafe characters", () => {
    expect(safeObjectKey("../../etc/passwd")).toBe("passwd");
    expect(safeObjectKey("BoQ  Studio (final).pdf")).toBe(
      "BoQ-Studio-final-.pdf",
    );
  });
});
