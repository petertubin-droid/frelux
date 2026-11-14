import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { lazyWithRetry } from "./lazy-retry";

describe("lazyWithRetry", () => {
  it("renders the component when dynamic import succeeds", async () => {
    const Component = lazyWithRetry(
      async () => ({
        default: () => <div>Loaded Widget Content</div>,
      }),
      "TestWidget",
    );

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <Component />
      </Suspense>,
    );

    expect(await screen.findByText("Loaded Widget Content")).toBeTruthy();
  });

  it("retries after a transient failure and succeeds on retry", async () => {
    let attempts = 0;
    const Component = lazyWithRetry(
      async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("Temporary network glitch");
        }
        return {
          default: () => <div>Recovered After Retry</div>,
        };
      },
      "RetryWidget",
    );

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <Component />
      </Suspense>,
    );

    expect(await screen.findByText("Recovered After Retry")).toBeTruthy();
    expect(attempts).toBe(2);
  });
});
