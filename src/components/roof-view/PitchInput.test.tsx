import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PitchInput,
  pitchRatioToDegrees,
  degreesToPitchRatio,
  PITCH_RATIOS,
} from "./PitchInput";

describe("pitchRatioToDegrees", () => {
  it("converts valid ratios", () => {
    expect(pitchRatioToDegrees("4:12")).toBeCloseTo(18.43, 1);
    expect(pitchRatioToDegrees("12:12")).toBeCloseTo(45, 1);
  });

  it("returns null for invalid input", () => {
    expect(pitchRatioToDegrees("invalid")).toBeNull();
    expect(pitchRatioToDegrees("1:0")).toBeNull();
  });
});

describe("degreesToPitchRatio", () => {
  it("finds nearest ratio", () => {
    expect(degreesToPitchRatio(18)).toBe("4:12");
    expect(degreesToPitchRatio(45)).toBe("12:12");
  });

  it("returns null for out of range", () => {
    expect(degreesToPitchRatio(-5)).toBeNull();
    expect(degreesToPitchRatio(90)).toBeNull();
  });
});

describe("PitchInput", () => {
  it("renders flat roof message without pitch input", () => {
    render(
      <PitchInput pitchDegrees={null} onChange={() => {}} roofType="flat" sectionName="Section A" />,
    );
    expect(screen.getByText(/Flat roof — no pitch required/)).toBeTruthy();
  });

  it("renders degree input when pitch is set", () => {
    render(
      <PitchInput pitchDegrees={25} onChange={() => {}} roofType="gable" sectionName="Section A" />,
    );
    expect(screen.getByDisplayValue("25")).toBeTruthy();
    expect(screen.getByText("degrees")).toBeTruthy();
  });

  it("shows PITCH REQUIRED when unknown and not AI-estimated", () => {
    render(
      <PitchInput pitchDegrees={null} onChange={() => {}} roofType="gable" sectionName="Section A" />,
    );
    expect(screen.getByText("PITCH REQUIRED")).toBeTruthy();
  });

  it("shows AI estimation warning when aiEstimated is true", () => {
    render(
      <PitchInput pitchDegrees={null} onChange={() => {}} roofType="gable" sectionName="Section A" aiEstimated />,
    );
    expect(screen.getByText(/PITCH ESTIMATION/)).toBeTruthy();
    expect(screen.getByText(/USER VERIFICATION REQUIRED/)).toBeTruthy();
  });

  it("calls onChange when switching to unknown mode", () => {
    const onChange = vi.fn();
    render(
      <PitchInput pitchDegrees={25} onChange={onChange} roofType="gable" sectionName="Section A" />,
    );
    fireEvent.click(screen.getByText("Unknown"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows surface area formula when pitch is set", () => {
    render(
      <PitchInput pitchDegrees={25} onChange={() => {}} roofType="gable" sectionName="Section A" />,
    );
    expect(screen.getByText(/Surface area = plan area/)).toBeTruthy();
  });

  it("renders ratio select in ratio mode", () => {
    render(
      <PitchInput pitchDegrees={25} onChange={() => {}} roofType="gable" sectionName="Section A" />,
    );
    fireEvent.click(screen.getByText("Ratio"));
    expect(screen.getByRole("option", { name: /Select a pitch ratio/ })).toBeTruthy();
  });

  it("PITCH_RATIOS has 11 entries", () => {
    expect(PITCH_RATIOS).toHaveLength(11);
  });
});
