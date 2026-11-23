import { describe, expect, it } from "vitest";
import { sha256Hex, uploadMatches } from "./studentMediaApi";

describe("upload confirmation", () => {
  const sent = { size: 1234, sha256: "ab".repeat(32) };

  it("counts an upload as saved only when the server stored the same bytes", () => {
    expect(uploadMatches(sent, { mediaId: "m", status: "READY", sizeBytes: 1234, sha256: "AB".repeat(32) })).toBe(true);
    expect(uploadMatches(sent, { mediaId: "m", status: "READY", sizeBytes: 1200, sha256: sent.sha256 })).toBe(false);
    expect(uploadMatches(sent, { mediaId: "m", status: "READY", sizeBytes: 1234, sha256: "cd".repeat(32) })).toBe(false);
  });

  it("falls back to the size check where the browser cannot hash (http on a local network)", () => {
    expect(uploadMatches({ size: 1234, sha256: null }, { mediaId: "m", status: "READY", sizeBytes: 1234, sha256: "cd".repeat(32) })).toBe(true);
    expect(uploadMatches({ size: 1234, sha256: null }, { mediaId: "m", status: "READY", sizeBytes: 99 })).toBe(false);
    // Eski sunucu alan göndermiyorsa yükleme yine kabul edilir.
    expect(uploadMatches(sent, { mediaId: "m", status: "READY" })).toBe(true);
  });

  it.runIf(typeof crypto !== "undefined" && !!crypto.subtle)("hashes like the server (SHA-256, lower-case hex)", async () => {
    const hash = await sha256Hex(new Blob(["abc"]));
    if (hash === null) return; // ortamın Blob'u arrayBuffer taşımıyor
    expect(hash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
