import { describe, expect, it } from "vitest";
import { AnswerOutbox, memoryStorage, sameAnswer } from "./answerOutbox";

function box() {
  return new AnswerOutbox("app-1", memoryStorage());
}

describe("answer outbox", () => {
  it("does not send before the server list is loaded", () => {
    const out = box();
    out.put("q1", { optionId: "a" });
    expect(out.nextSend()).toBeNull();
    out.hydrate([]);
    expect(out.nextSend()?.answer).toEqual({ optionId: "a" });
  });

  it("keeps a newer version when the in-flight response arrives", () => {
    const out = box();
    out.hydrate([]);
    out.put("q1", { optionId: "a" });
    const first = out.nextSend();
    expect(first?.seq).toBe(1);
    out.put("q1", { optionId: "b" });
    out.applyResult("q1", first!.localVersion, { status: "WRITTEN", serverSeq: 1 });
    const second = out.nextSend();
    expect(second?.answer).toEqual({ optionId: "b" });
    expect(second?.seq).toBe(2);
    expect(second?.localVersion).not.toBe(first?.localVersion);
  });

  it("does not drop another question when an older response arrives", () => {
    const out = box();
    out.hydrate([]);
    out.put("q1", { optionId: "a" });
    const first = out.nextSend();
    out.put("q2", { optionId: "c" });
    out.applyResult("q1", first!.localVersion, { status: "WRITTEN", serverSeq: 1 });
    const second = out.nextSend();
    expect(second?.itemId).toBe("q2");
  });

  it("retries above the server seq when the write is stale", () => {
    const out = box();
    out.hydrate([{ itemId: "q1", answer: { optionId: "a" }, seq: 5 }]);
    out.put("q1", { optionId: "b" });
    const sent = out.nextSend();
    expect(sent?.seq).toBe(6);
    out.applyResult("q1", sent!.localVersion, { status: "STALE", serverSeq: 8 });
    const again = out.nextSend();
    expect(again?.seq).toBe(9);
    expect(again?.answer).toEqual({ optionId: "b" });
  });

  it("keeps a permanently rejected answer visible", () => {
    const out = box();
    out.hydrate([]);
    out.put("q1", { optionId: "a" });
    const sent = out.nextSend();
    out.applyTransportError("q1", sent!.localVersion, { status: 400, message: "bad shape" });
    expect(out.nextSend()).toBeNull();
    const failed = out.getSnapshot().find((row) => row.itemId === "q1");
    expect(failed?.state).toBe("failed");
    expect(out.snapshot()).toHaveLength(1);
  });

  it("pauses on a replaced session without deleting the queue", () => {
    const out = box();
    out.hydrate([]);
    out.put("q1", { optionId: "a" });
    const sent = out.nextSend();
    out.applyTransportError("q1", sent!.localVersion, { status: 409, code: "SESSION_REPLACED", message: "replaced" });
    expect(out.isPaused()).toBe(true);
    expect(out.getSnapshot().find((row) => row.itemId === "q1")?.state).toBe("pending");
    expect(out.nextSend()).toBeNull();
    out.resume();
    expect(out.nextSend()?.itemId).toBe("q1");
  });

  it("starts seq above the saved server seq", () => {
    const out = box();
    out.hydrate([{ itemId: "q1", answer: { optionId: "a" }, seq: 4 }]);
    out.put("q2", { optionId: "b" });
    expect(out.nextSend()?.seq).toBe(5);
  });

  it("treats the same answer as already saved", () => {
    const out = box();
    out.hydrate([]);
    out.put("q1", { optionId: "a" });
    out.hydrate([{ itemId: "q1", answer: { optionId: "a" }, seq: 3 }]);
    expect(out.nextSend()).toBeNull();
    expect(out.getSnapshot().find((row) => row.itemId === "q1")?.state).toBe("confirmed");
  });

  it("compares answers without caring about key order", () => {
    expect(sameAnswer({ b: 1, a: "x" }, { a: "x", b: 1 })).toBe(true);
    expect(sameAnswer({ a: "x" }, { a: "y" })).toBe(false);
  });
});
