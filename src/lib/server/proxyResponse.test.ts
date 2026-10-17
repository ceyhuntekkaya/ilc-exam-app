import { describe, expect, it } from "vitest";
import { proxyResponse } from "./proxyResponse";

describe("proxyResponse", () => {
  it("returns 204 without a body", () => {
    const res = proxyResponse(204, new ArrayBuffer(0), new Headers({ "content-type": "application/json" }));
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  it("keeps a 200 body", async () => {
    const body = new TextEncoder().encode("ok");
    const res = proxyResponse(200, body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength), new Headers());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
});
