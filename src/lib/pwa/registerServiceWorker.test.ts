import { afterEach, describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "@/src/lib/pwa/registerServiceWorker";

/**
 * F3-01/Adım 4: "sınav sırasında güncelleme uygulanmaz" kuralının testi. `public/sw.js`'in
 * kendisi jsdom'da çalışmaz (gerçek bir worker thread'i gerekir) — burada doğrulanan,
 * `registerServiceWorker`'ın bekleyen bir sürümü NE ZAMAN `SKIP_WAITING` ile uyandırdığı.
 */
function stubServiceWorkerWithWaitingRegistration() {
  const postMessage = vi.fn();
  const registration = {
    waiting: { postMessage },
    installing: null,
    addEventListener: vi.fn(),
  };
  const serviceWorker = {
    register: vi.fn().mockResolvedValue(registration),
    addEventListener: vi.fn(),
  };
  vi.stubGlobal("navigator", { serviceWorker });
  return { postMessage, registration, serviceWorker };
}

describe("registerServiceWorker — sınav sırasında güncelleme ertelemesi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("wakes a waiting worker when no exam is running", async () => {
    const { postMessage } = stubServiceWorkerWithWaitingRegistration();
    vi.spyOn(window, "location", "get").mockReturnValue({ pathname: "/staff" } as Location);

    registerServiceWorker();
    window.dispatchEvent(new Event("load"));
    await Promise.resolve();
    await Promise.resolve();

    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("does NOT wake a waiting worker while the student is running the exam", async () => {
    const { postMessage } = stubServiceWorkerWithWaitingRegistration();
    vi.spyOn(window, "location", "get").mockReturnValue({
      pathname: "/student/exams/abc-123/run",
    } as Location);

    registerServiceWorker();
    window.dispatchEvent(new Event("load"));
    await Promise.resolve();
    await Promise.resolve();

    expect(postMessage).not.toHaveBeenCalled();
  });
});
