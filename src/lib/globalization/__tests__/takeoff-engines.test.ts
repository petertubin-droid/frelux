import { describe, expect, it } from "vitest";
import { calculateConcreteVolume, calculateMasonryTakeoff } from "../takeoff-engines";
describe("concrete volume",()=>{
 it("normalizes mm and applies default waste once",()=>{const r=calculateConcreteVolume({lengthMm:5000,widthMm:4000,depthMm:150});expect(r.status).toBe("valid");expect(r.outputs?.baseVolumeM3).toBe(3);expect(r.outputs?.requiredVolumeM3).toBeCloseTo(3.15);expect(r.outputs?.requiredVolumeYd3).toBeCloseTo(3.15*1.30795062)});
 it("rejects bad dimensions and waste",()=>{expect(calculateConcreteVolume({lengthMm:0,widthMm:4000,depthMm:150}).status).toBe("invalid");expect(calculateConcreteVolume({lengthMm:1,widthMm:1,depthMm:1,wastagePercent:101}).status).toBe("invalid")});
});
describe("masonry modular takeoff",()=>{
 const unit={name:"Approved sample block",lengthMm:400,widthMm:200,heightMm:200,status:"verified" as const,source:"approved material record"};
 it("deducts openings, applies explicit modules and rounds whole units",()=>{const r=calculateMasonryTakeoff({wallLengthMm:5000,wallHeightMm:3000,unit,openings:[{widthMm:1000,heightMm:2000}]});expect(r.status).toBe("valid");expect(r.outputs?.grossWallAreaM2).toBe(15);expect(r.outputs?.openingDeductionM2).toBe(2);expect(r.outputs?.jointsMm).toEqual({vertical:10,horizontal:10});expect(r.outputs?.requiredWholeUnits).toBe(Math.ceil((13/(.41*.21))*1.1))});
 it("requires verified material or explicit generic selection",()=>{expect(calculateMasonryTakeoff({wallLengthMm:1000,wallHeightMm:1000,unit:{...unit,status:"unverified"}}).status).toBe("invalid");expect(calculateMasonryTakeoff({wallLengthMm:1000,wallHeightMm:1000,unit:{...unit,status:"unverified",explicitlySelectedGeneric:true}}).status).toBe("valid")});
 it("rejects oversized openings",()=>expect(calculateMasonryTakeoff({wallLengthMm:1000,wallHeightMm:1000,unit,openings:[{widthMm:2000,heightMm:1000}]}).status).toBe("invalid"));
});
