import { describe, expect, it } from "vitest";
import { parseDimensionalInput } from "../dimensional-parser";
describe("shared dimensional parser",()=>{
 const parse=(value:string,defaultUnit:"meters"|"inches"="meters")=>parseDimensionalInput(value,{defaultUnit});
 it.each([["2.5 m",2500],["250 cm",2500],["2500 mm",2500],["2.5",2500],["10' 5 7/8\"",3197.225],["10ft 5in",3175],["5 7/8 in",149.225],["5.875 in",149.225],["125 in",3175],["10 ft",3048]] as const)("normalizes %s",(value,expected)=>{const r=parse(value);expect(r.ok).toBe(true);if(r.ok)expect(r.millimeters).toBeCloseTo(expected,8)});
 it("uses default units only without explicit units",()=>{const r=parse("12.5","inches");expect(r.ok).toBe(true);if(r.ok){expect(r.millimeters).toBeCloseTo(317.5);expect(r.usedDefaultUnit).toBe(true)}});
 it.each(["","2,5","5 9/8 in","5/0 in","2m 3m","5 xyz","-2 m","Infinity m","12 m @"])("rejects malformed or ambiguous %s",value=>expect(parse(value).ok).toBe(false));
 it("flags incomplete fractions and enforces bounds",()=>{const r=parse("3/");expect(r.ok).toBe(false);if(!r.ok)expect(r.incomplete).toBe(true);expect(parseDimensionalInput("10 m",{defaultUnit:"meters",maxMm:5000}).ok).toBe(false)});
});
