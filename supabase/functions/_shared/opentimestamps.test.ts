import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { upgradeOtsProof } from "./opentimestamps.ts";
import { read } from "./vendor/ots/read.ts";
import { write } from "./vendor/ots/write.ts";
import { treeToPaths } from "./vendor/ots/internals.ts";
import { uint8ArrayToBase64, uint8ArrayToHex } from "./vendor/ots/utils.ts";

async function loadProof(name: string): Promise<Uint8Array> {
  return await Deno.readFile(new URL(`./vendor/ots/fixtures/${name}`, import.meta.url));
}

Deno.test("parses a standards-compliant OpenTimestamps Bitcoin fixture", async () => {
  const timestamp = read(await loadProof("hello-world.txt.ots"));
  assertEquals(timestamp.fileHash.algorithm, "sha256");
  assertEquals(uint8ArrayToHex(timestamp.fileHash.value), "03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340");
  assertEquals(treeToPaths(timestamp.tree).some(({ leaf }) => leaf.type === "bitcoin"), true);
});

Deno.test("rejects a proof whose committed hash differs from the document record", async () => {
  const proof = uint8ArrayToBase64(await loadProof("hello-world.txt.ots"));
  await assertRejects(
    () => upgradeOtsProof(proof, "0".repeat(64)),
    Error,
    "does not match the registered document hash",
  );
});

Deno.test("rejects pending calendar URLs outside the configured OpenTimestamps pool", async () => {
  const timestamp = read(await loadProof("incomplete.txt.ots"));
  const pending = treeToPaths(timestamp.tree).find(({ leaf }) => leaf.type === "pending")?.leaf;
  if (!pending || pending.type !== "pending") throw new Error("fixture is missing pending calendar leaf");
  pending.url = new URL("https://evil.example/internal");
  const proof = uint8ArrayToBase64(write(timestamp));
  await assertRejects(
    () => upgradeOtsProof(proof, "05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9"),
    Error,
    "untrusted calendar endpoint",
  );
});
