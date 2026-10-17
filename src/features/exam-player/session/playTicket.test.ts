import { describe, expect, it } from "vitest";
import { applyPlayTicket, limitFromPlayStatus, playbackAsksServer } from "./playTicket";

describe("stimulus play ticket", () => {
  it("asks the server for a student session and skips preview", () => {
    expect(playbackAsksServer(false, false, true)).toBe(true);
    expect(playbackAsksServer(true, false, true)).toBe(false);
    expect(playbackAsksServer(false, true, true)).toBe(false);
    expect(playbackAsksServer(false, false, false)).toBe(false);
  });

  it("keeps the smaller finite limit and treats an empty right as unlimited", () => {
    expect(limitFromPlayStatus({ unlimited: false, maxPlays: 1 })).toBe(1);
    expect(limitFromPlayStatus({ unlimited: true, maxPlays: null })).toBeNull();
    expect(limitFromPlayStatus({ unlimited: false, maxPlays: 0 })).toBeNull();
  });

  it("adds a grant to a limited ticket and leaves an unlimited ticket on the raw url", () => {
    const limited = applyPlayTicket("/api/media/a", { grantId: "g1", playCount: 1, maxPlays: 1, unlimited: false });
    expect(limited.grantId).toBe("g1");
    expect(limited.url).toBe("/api/media/a?playGrant=g1");

    const open = applyPlayTicket("/api/media/a", { grantId: null, playCount: 0, maxPlays: null, unlimited: true });
    expect(open.grantId).toBeNull();
    expect(open.url).toBe("/api/media/a");
  });
});
