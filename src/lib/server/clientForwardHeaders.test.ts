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

  it("aşırı uzun X-Forwarded-For SOLDAN kısaltılır: nginx'in yazdığı en sağdaki girdi korunur", () => {
    const attacker = Array.from({ length: 200 }, (_, i) => `6.6.${i % 250}.${i % 250}`).join(", ");
    const out = clientForwardHeaders(new Headers({ "x-forwarded-for": `${attacker}, 203.0.113.7` }));
    const entries = out["x-forwarded-for"]!.split(", ");
    expect(entries.at(-1)).toBe("203.0.113.7");
    expect(entries.length).toBeLessThanOrEqual(10);
  });

  it("tek girdi çok uzunsa o girdi atılır, sağdaki gerçek girdi kalır", () => {
    const out = clientForwardHeaders(new Headers({ "x-forwarded-for": `${"9".repeat(600)}, 203.0.113.7` }));
    expect(out["x-forwarded-for"]).toBe("203.0.113.7");
  });

  it("kontrol karakterini SİLER, başlığı düşürmez (düşerse istek ortak kovaya girerdi)", () => {
    const out = clientForwardHeaders(new Headers({ "x-forwarded-for": "198.51.100.1\t, 203.0.113.7\u007f" }));
    expect(out["x-forwarded-for"]).toBe("198.51.100.1, 203.0.113.7");
    expect(clientForwardHeaders(new Headers({ "user-agent": "iyi\u007fkotu" }))["user-agent"]).toBe("iyikotu");
  });

  it("aşırı uzun User-Agent'ı keser", () => {
    expect(clientForwardHeaders(new Headers({ "user-agent": "a".repeat(5000) }))["user-agent"]).toHaveLength(512);
  });
});
