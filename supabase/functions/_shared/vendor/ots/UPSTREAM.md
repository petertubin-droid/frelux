This directory contains the OpenTimestamps TypeScript implementation from
https://github.com/opentimestamps/typescript-opentimestamps at commit
12ba7b2c4f4cd1b8ce52d2c17be5efedca3bceab. Source modules are vendored under
the LGPL-3.0-or-later terms in LICENSE. Local changes: explicit Deno `.ts`
import suffixes and pinned `npm:@noble/hashes@1.5.0` imports. FRELUX-specific
wrappers live in `../opentimestamps.ts`. The upstream library is used to parse,
upgrade, and verify the standard proof format; the verification wrapper only
reports a confirmed result after independent block explorers agree.
