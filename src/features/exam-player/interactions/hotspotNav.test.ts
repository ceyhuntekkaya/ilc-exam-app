import { describe, expect, it } from "vitest";
import { nextFocusIndex } from "./hotspotNav";

describe("nextFocusIndex", () => {
  it("moves forward and wraps past the last region", () => {
    expect(nextFocusIndex(0, 3, 1)).toBe(1);
    expect(nextFocusIndex(1, 3, 1)).toBe(2);
    expect(nextFocusIndex(2, 3, 1)).toBe(0);
  });

  it("moves backward and wraps past the first region", () => {
    expect(nextFocusIndex(2, 3, -1)).toBe(1);
    expect(nextFocusIndex(1, 3, -1)).toBe(0);
    expect(nextFocusIndex(0, 3, -1)).toBe(2);
  });

  it("stays put when there is only one region", () => {
    expect(nextFocusIndex(0, 1, 1)).toBe(0);
    expect(nextFocusIndex(0, 1, -1)).toBe(0);
  });

  it("returns the current index when there are no regions", () => {
    expect(nextFocusIndex(0, 0, 1)).toBe(0);
  });
});
