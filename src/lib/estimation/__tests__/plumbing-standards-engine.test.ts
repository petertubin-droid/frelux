import { describe, expect, it } from "vitest";
import {
  calculateEn12056Drainage,
  calculateUpcIpcDrainage,
} from "../plumbing-standards-engine";

describe("International plumbing reference sizing", () => {
  it("sums UPC/IPC drainage fixture units and selects a preliminary drain", () => {
    const result = calculateUpcIpcDrainage({
      water_closets: 2,
      lavatories: 2,
      showers: 2,
    });
    expect(result.total_dfu).toBe(12);
    expect(result.recommended_drain_size_inches).toBe('2-1/2"');
    expect(result.standards_reference).toContain("IPC 2024");
  });

  it("uses the requested slope class for IPC/UPC drain size", () => {
    expect(
      calculateUpcIpcDrainage({ water_closets: 4 }, "1/8")
        .recommended_drain_size_inches,
    ).toBe('3"');
  });

  it("applies EN 12056-2 simultaneity factor to discharge units", () => {
    const residential = calculateEn12056Drainage({
      wash_basins: 4,
      showers: 2,
      wcs_6l: 2,
    });
    const commercial = calculateEn12056Drainage(
      { wash_basins: 4, showers: 2, wcs_6l: 2 },
      "commercial_regular",
    );
    expect(residential.waste_water_flow_qww_lps).toBeLessThan(
      commercial.waste_water_flow_qww_lps,
    );
    expect(residential.standards_reference).toContain("EN 12056-2");
  });
});
