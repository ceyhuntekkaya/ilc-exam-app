import { describe, expect, it } from "vitest";
import { clientForwardHeaders } from "@/src/lib/server/clientForwardHeaders";

describe("clientForwardHeaders", () => {
  it("nginx'in X-Forwarded-For, X-Forwarded-Proto ve User-Agent değerlerini aynen iletir", () => {
    const out = clientForwardHeaders(
      new Headers({
        "x-forwarded-for": "203.0.113.7",
        "x-forwarded-proto": "https",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64)",
      }),
    );
    expect(out).toEqual({
      "x-forwarded-for": "203.0.113.7",
      "x-forwarded-proto": "https",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64)",
    });
  });

  it("zincirli X-Forwarded-For'u değiştirmez (güvenilirlik kararı backend'de)", () => {
    const out = clientForwardHeaders(new Headers({ "x-forwarded-for": "198.51.100.1, 203.0.113.7" }));
    expect(out["x-forwarded-for"]).toBe("198.51.100.1, 203.0.113.7");
  });

  it("başlık yoksa hiçbir şey UYDURMAZ (BFF kendi IP'sini eklemez)", () => {
    expect(clientForwardHeaders(new Headers())).toEqual({});
  });

  it("aşırı uzun değeri keser", () => {
    const out = clientForwardHeaders(new Headers({ "user-agent": "a".repeat(5000) }));
    expect(out["user-agent"]).toHaveLength(512);
  });

  it("kontrol karakteri taşıyan değeri iletmez", () => {
    const h = new Headers();
    // Headers API CR/LF'i reddeder; yine de tab/DEL gibi kontrol karakterleri elenmeli.
    h.set("user-agent", "iyi\u007fkotu");
    expect(clientForwardHeaders(h)["user-agent"]).toBeUndefined();
  });
});
