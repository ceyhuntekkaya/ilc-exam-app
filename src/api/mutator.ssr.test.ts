// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const incoming = new Headers({
  "x-forwarded-for": "203.0.113.7",
  "x-forwarded-proto": "https",
  "user-agent": "Mozilla/5.0 test",
});

vi.mock("next/headers", () => ({
  headers: async () => incoming,
  cookies: async () => ({ get: () => undefined }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("customInstance — sunucu tarafı (SSR) çağrısı", () => {
  it("nginx'ten gelen istemci başlıklarını backend'e iletir (R-04: /verify hız sınırı ziyaretçi başına)", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { customInstance } = await import("@/src/api/mutator");

    await customInstance("/public/verify/ABC");

    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const sent = new Headers(init.headers);
    expect(sent.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(sent.get("x-forwarded-proto")).toBe("https");
    expect(sent.get("user-agent")).toBe("Mozilla/5.0 test");
  });

  it("çağıranın açıkça verdiği başlık iletilen değeri ezer", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { customInstance } = await import("@/src/api/mutator");

    await customInstance("/x", { headers: { "user-agent": "özel" } });

    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(new Headers(init.headers).get("user-agent")).toBe("özel");
  });
});
