import { describe, expect, it } from "vitest";
import { demoNurseAccessEnabled } from "@/server/security/nursing-session-policy";

describe("demo nurse access policy", () => {
  it("permits the configured demonstration mode only", () => {
    expect(demoNurseAccessEnabled("demo")).toBe(true);
    expect(demoNurseAccessEnabled("production")).toBe(false);
    expect(demoNurseAccessEnabled(undefined)).toBe(false);
  });
});
