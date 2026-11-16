import { describe, expect, it } from "vitest";
import {
  ENGINEERING_DOMAINS,
  PUBLIC_ENGINE_METADATA,
  findPublicEngine,
} from "@/config/engineering-standards";

describe("public engineering methodology metadata", () => {
  it("contains only unique public tool ids and route paths", () => {
    expect(new Set(PUBLIC_ENGINE_METADATA.map((item) => item.id)).size).toBe(
      PUBLIC_ENGINE_METADATA.length,
    );
    expect(new Set(PUBLIC_ENGINE_METADATA.map((item) => item.route)).size).toBe(
      PUBLIC_ENGINE_METADATA.length,
    );
    for (const item of PUBLIC_ENGINE_METADATA) {
      expect(item.route.startsWith("/")).toBe(true);
      expect(
        ENGINEERING_DOMAINS.some((domain) => domain.key === item.domain),
      ).toBe(true);
    }
  });

  it("does not publish standards that aren't tied to the implementation metadata", () => {
    const referenced = PUBLIC_ENGINE_METADATA.flatMap((item) => item.standards);
    expect(referenced).toEqual(["BS 8666:2020", "EN 1992-1-1"]);
  });

  it("finds entries by id or exact route", () => {
    expect(findPublicEngine("reinforcement")?.route).toBe("/reinforcement");
    expect(findPublicEngine("/reinforcement")?.id).toBe("reinforcement");
    expect(findPublicEngine("missing-tool")).toBeUndefined();
  });
});
