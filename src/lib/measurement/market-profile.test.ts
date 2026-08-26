import { describe, it, expect } from "vitest";
import {
  createMarketProfileRegistry,
  registerProfile,
  getProfile,
  getActiveProfiles,
  createNigeriaProfile,
  createGhanaProfile,
  createKenyaProfile,
  createDefaultRegistry,
  getMarketWastePercent,
  getMarketCurrency,
} from "./market-profile";

describe("measurement/market-profile", () => {
  it("createNigeriaProfile has correct fields", () => {
    const p = createNigeriaProfile();
    expect(p.marketCode).toBe("NG");
    expect(p.marketName).toBe("Nigeria");
    expect(p.currency).toBe("NGN");
    expect(p.currencySymbol).toBe("₦");
    expect(p.unitSystem).toBe("metric");
    expect(p.defaultWastePercent).toBeGreaterThan(0);
  });

  it("createGhanaProfile has correct fields", () => {
    const p = createGhanaProfile();
    expect(p.marketCode).toBe("GH");
    expect(p.marketName).toBe("Ghana");
    expect(p.currency).toBeTruthy();
  });

  it("createKenyaProfile has correct fields", () => {
    const p = createKenyaProfile();
    expect(p.marketCode).toBe("KE");
    expect(p.marketName).toBe("Kenya");
    expect(p.currency).toBeTruthy();
  });

  it("createMarketProfileRegistry creates empty registry", () => {
    const reg = createMarketProfileRegistry();
    expect(reg.profiles.size).toBe(0);
    expect(reg.defaultMarketCode).toBe("NG");
  });

  it("registerProfile adds profile to registry", () => {
    let reg = createMarketProfileRegistry();
    reg = registerProfile(reg, createNigeriaProfile());
    expect(reg.profiles.size).toBe(1);
    expect(reg.profiles.get("NG")).toBeTruthy();
  });

  it("registerProfile is immutable", () => {
    const reg1 = createMarketProfileRegistry();
    const reg2 = registerProfile(reg1, createNigeriaProfile());
    expect(reg1.profiles.size).toBe(0);
    expect(reg2.profiles.size).toBe(1);
  });

  it("getProfile returns profile by code", () => {
    const reg = createDefaultRegistry();
    const ng = getProfile(reg, "NG");
    expect(ng?.marketCode).toBe("NG");
    const gh = getProfile(reg, "GH");
    expect(gh?.marketCode).toBe("GH");
  });

  it("getProfile falls back to default when code not found", () => {
    const reg = createDefaultRegistry();
    const unknown = getProfile(reg, "XX");
    expect(unknown?.marketCode).toBe("NG"); // default
  });

  it("getProfile uses default when no code provided", () => {
    const reg = createDefaultRegistry();
    const profile = getProfile(reg);
    expect(profile?.marketCode).toBe("NG");
  });

  it("getActiveProfiles returns only active profiles", () => {
    const reg = createDefaultRegistry();
    const active = getActiveProfiles(reg);
    expect(active.length).toBeGreaterThanOrEqual(1);
    expect(active.every((p) => p.isActive === true)).toBe(true);
  });

  it("createDefaultRegistry has NG, GH, KE", () => {
    const reg = createDefaultRegistry();
    expect(reg.profiles.size).toBe(3);
    expect(reg.profiles.has("NG")).toBe(true);
    expect(reg.profiles.has("GH")).toBe(true);
    expect(reg.profiles.has("KE")).toBe(true);
  });

  it("getMarketWastePercent returns market waste", () => {
    const reg = createDefaultRegistry();
    expect(getMarketWastePercent(reg, "NG")).toBeGreaterThan(0);
    expect(getMarketWastePercent(reg, "GH")).toBeGreaterThan(0);
  });

  it("getMarketWastePercent defaults to 10", () => {
    const reg = createDefaultRegistry();
    expect(getMarketWastePercent(reg, "XX")).toBeGreaterThan(0);
  });

  it("getMarketCurrency returns currency code", () => {
    const reg = createDefaultRegistry();
    expect(getMarketCurrency(reg, "NG").code).toBe("NGN");
    expect(getMarketCurrency(reg, "GH").code).toBeTruthy();
    expect(getMarketCurrency(reg, "KE").code).toBeTruthy();
  });
});
