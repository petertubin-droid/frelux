import { describe, it, expect } from "vitest";
import { resolveNotifyEmail } from "./index.ts";

function env(map: Record<string, string | undefined>) {
  return (name: string) => map[name];
}

describe("resolveNotifyEmail", () => {
  it("prefers the contact-specific address", () => {
    expect(
      resolveNotifyEmail(
        env({
          CONTACT_NOTIFY_EMAIL: "contact@freluxtools.com",
          OWNER_NOTIFY_EMAIL: "owner@freluxtools.com",
        }),
      ),
    ).toBe("contact@freluxtools.com");
  });

  it("falls back to the owner address so one missing name cannot silence the admin email", () => {
    expect(
      resolveNotifyEmail(env({ OWNER_NOTIFY_EMAIL: "owner@freluxtools.com" })),
    ).toBe("owner@freluxtools.com");
  });

  it("falls back to the public inbox when neither is configured", () => {
    // An enquiry that reaches no inbox is lost work, so the default is the
    // address the contact page prints rather than silence.
    expect(
      resolveNotifyEmail(
        env({ CONTACT_NOTIFY_EMAIL: "   ", OWNER_NOTIFY_EMAIL: "" }),
      ),
    ).toBe("freluxtools@gmail.com");
    expect(resolveNotifyEmail(env({}))).toBe("freluxtools@gmail.com");
  });
});
