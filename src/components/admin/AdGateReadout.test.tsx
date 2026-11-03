import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AdGateReadout from "./AdGateReadout";
import { markAdGate } from "@/lib/ad-gate";

describe("AdGateReadout", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("shows why the last public page did not load ads", () => {
    markAdGate("no-consent");
    render(<AdGateReadout />);
    expect(
      screen.getByText("The visitor has not answered the cookie banner"),
    ).toBeInTheDocument();
    expect(screen.getByText("no consent")).toBeInTheDocument();
    expect(screen.getByText(/unanswered/)).toBeInTheDocument();
  });

  it("confirms a working injection instead of guessing", () => {
    markAdGate("injected");
    render(<AdGateReadout />);
    expect(
      screen.getByText("AdSense library injected and page-level ads pushed"),
    ).toBeInTheDocument();
  });
});
