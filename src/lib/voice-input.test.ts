import { describe, it, expect } from "vitest";
import { parseSpokenNumber } from "@/lib/voice-input";

describe("voice-input — parseSpokenNumber", () => {
  it("parses direct numeric strings", () => {
    expect(parseSpokenNumber("3.5")).toBe(3.5);
    expect(parseSpokenNumber("12")).toBe(12);
    expect(parseSpokenNumber("0.8")).toBe(0.8);
  });

  it("parses plain integers from mixed text", () => {
    expect(parseSpokenNumber("the room is 25 meters")).toBe(25);
  });

  it("parses decimals from mixed text", () => {
    expect(parseSpokenNumber("width is 4.2")).toBe(4.2);
  });

  it("parses single word numbers", () => {
    expect(parseSpokenNumber("five")).toBe(5);
    expect(parseSpokenNumber("ten")).toBe(10);
    expect(parseSpokenNumber("twenty")).toBe(20);
  });

  it("parses compound word numbers", () => {
    expect(parseSpokenNumber("twenty five")).toBe(25);
    expect(parseSpokenNumber("thirty two")).toBe(32);
    expect(parseSpokenNumber("ninety nine")).toBe(99);
  });

  it("parses hundred combinations", () => {
    expect(parseSpokenNumber("one hundred")).toBe(100);
    expect(parseSpokenNumber("two hundred")).toBe(200);
  });

  it("parses hundred + tens + units", () => {
    expect(parseSpokenNumber("one hundred twenty five")).toBe(125);
  });

  it('parses "point" decimal patterns', () => {
    expect(parseSpokenNumber("three point five")).toBe(3.5);
    expect(parseSpokenNumber("two point eight")).toBe(2.8);
  });

  it("returns null for empty string", () => {
    expect(parseSpokenNumber("")).toBeNull();
  });

  it("returns null for non-numeric text", () => {
    expect(parseSpokenNumber("hello world")).toBeNull();
  });

  it("handles uppercase input", () => {
    expect(parseSpokenNumber("FIVE")).toBe(5);
    expect(parseSpokenNumber("TWENTY TWO")).toBe(22);
  });

  it("handles whitespace gracefully", () => {
    expect(parseSpokenNumber("  42  ")).toBe(42);
  });
});
