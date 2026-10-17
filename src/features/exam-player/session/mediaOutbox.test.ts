import { describe, expect, it } from "vitest";
import { jobsToPersist } from "./mediaOutboxQueue";

describe("media outbox", () => {
  it("does not keep a recording that could not be stored", () => {
    const stored = [{ id: "old", applicationId: "app", durable: true }];
    const live = [
      { id: "old", applicationId: "app", durable: true },
      { id: "fresh", applicationId: "app", durable: false },
    ];

    expect(jobsToPersist(stored, live).map((job) => job.id)).toEqual(["old"]);
  });

  it("keeps another exam's queue when this exam drops a failed box write", () => {
    const stored = [{ id: "other", applicationId: "other-app", durable: true }];
    const live = [{ id: "fresh", applicationId: "app", durable: false }];

    expect(jobsToPersist(stored, live).map((job) => job.id)).toEqual(["other"]);
  });
});
