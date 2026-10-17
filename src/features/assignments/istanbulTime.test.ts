import { describe, expect, it } from "vitest";
import { istanbulInstant, istanbulLabel } from "./istanbulTime";

describe("istanbulInstant", () => {
  it("reads 15:00 as Istanbul wall time", () => {
    expect(istanbulInstant("2026-01-15T15:00")).toBe("2026-01-15T12:00:00.000Z");
    expect(istanbulLabel("2026-01-15T12:00:00.000Z")).toContain("15:00");
  });
});
