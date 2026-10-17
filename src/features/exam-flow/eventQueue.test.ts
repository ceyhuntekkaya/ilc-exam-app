import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueEvent, readQueue } from "./eventQueue";

const store = new Map<string, string>();

function installStorage(setItem?: (key: string, value: string) => void) {
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: setItem ?? ((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
});

describe("eventQueue", () => {
  it("parks a corrupt box instead of deleting it", () => {
    installStorage();
    store.set("ilc-events:app", "{");
    enqueueEvent("app", "FOCUS_LOST");
    expect(store.get("ilc-events-corrupt:app")).toBe("{");
    expect(readQueue("app")).toHaveLength(1);
  });

  it("asks for a send before dropping the oldest event", () => {
    installStorage();
    for (let i = 0; i < 200; i += 1) enqueueEvent("app", "FOCUS_LOST");
    enqueueEvent("app", "PAGE_LOAD");
    expect(store.get("ilc-events-flush:app")).toBe("1");
    expect(readQueue("app")).toHaveLength(201);
    enqueueEvent("app", "PAGE_LOAD");
    expect(readQueue("app")).toHaveLength(200);
  });

  it("swallows a quota error", () => {
    installStorage(() => {
      throw new Error("quota");
    });
    expect(() => enqueueEvent("app", "FOCUS_LOST")).not.toThrow();
  });
});
