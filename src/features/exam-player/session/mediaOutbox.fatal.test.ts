import { afterEach, describe, expect, it, vi } from "vitest";

// Ağ sınırı: yükleme ucu ve cevap kutusu. Kuyruğun kendisi (kilit, hata, yeniden deneme) GERÇEK çalışır.
const upload = vi.fn();
const settle = vi.fn(() => Promise.resolve());
vi.mock("./studentMediaApi", () => ({
  uploadApplicationMedia: (...args: unknown[]) => upload(...args),
}));
vi.mock("./answerOutbox", () => ({
  getAnswerOutbox: () => ({ put: () => 1, whenSettled: () => settle() }),
}));

import { writeSession } from "@/src/features/exam-flow/session";
import { mediaHolderOtherThan, resetPlayerGuard } from "./playerGuard";
import { enqueueRecording, isFatalUploadError, mediaUploadError, mediaUploadQueued, retryMediaUpload } from "./mediaOutbox";

function record(itemId: string) {
  writeSession("rec", { applicationId: "app", sessionToken: "token" });
  const file = new File(["voice"], "recording.webm", { type: "audio/webm" });
  return enqueueRecording({ applicationId: "app", recipientId: "rec", itemId, intentId: `intent-${itemId}`, file, durationMs: 18_000 });
}

/** Sayfadaki Break/Next/Back/Finish, kilidi başka biri tutmuyorsa açıktır. */
const pageIsFree = () => mediaHolderOtherThan("someone-else") === null;

describe("media outbox — kayıt öğrenciyi asla kilitli bırakmaz", () => {
  afterEach(() => {
    upload.mockReset();
    settle.mockReset();
    settle.mockImplementation(() => Promise.resolve());
    resetPlayerGuard();
  });

  // Gerçek sınav hatası: sunucu kaydı reddetti, "Try upload again" kaldı; basınca kilit hiç bırakılmadı,
  // Break/Next/Back çalışmadı, Start'a basınca düşünme süresi sayıldı ama kayıt başlamadı.
  it("a recording the server refuses for good leaves no retry button and frees the page", async () => {
    upload.mockRejectedValueOnce(Object.assign(new Error("We could not save your file."), { status: 400 }));

    await expect(record("refused")).rejects.toThrow("We could not save your file.");

    expect(mediaUploadError("refused")).toBeNull();
    expect(mediaUploadQueued("refused")).toBe(false);
    expect(pageIsFree()).toBe(true);

    // Eski ekranda kalmış bir düğmeye yine de basılırsa: bekleyen iş yok, kilit alınmaz.
    retryMediaUpload("refused");
    expect(pageIsFree()).toBe(true);
  });

  it("a closed section stops the retries instead of keeping the page locked", async () => {
    upload.mockRejectedValueOnce(Object.assign(new Error("This part is closed."), { status: 409, code: "ANSWER_LOCKED" }));

    await expect(record("closed")).rejects.toThrow("This part is closed.");

    expect(pageIsFree()).toBe(true);
  });

  it("an answer the server rejects does not loop re-uploading the same recording", async () => {
    upload.mockResolvedValue({ mediaId: "m-rejected", status: "READY" });
    settle.mockImplementationOnce(() => Promise.reject(new Error("This answer was not saved.")));

    await expect(record("rejected-answer")).rejects.toThrow("This answer was not saved.");

    expect(upload).toHaveBeenCalledTimes(1);
    expect(pageIsFree()).toBe(true);
  });

  it(
    "a lost connection keeps the recording, keeps trying and frees the page once saved",
    async () => {
      upload
        .mockRejectedValueOnce(Object.assign(new Error("No internet connection."), { status: 0 }))
        .mockResolvedValueOnce({ mediaId: "m-1", status: "READY", durationMs: 18_000 });

      const saved = record("offline");
      await vi.waitFor(() => expect(mediaUploadError("offline")).toBe("No internet connection."));
      // Beklerken: kayıt kuyrukta, "Try upload again" var, soru geçişi kilitli (yüklenince geçilir).
      expect(mediaUploadQueued("offline")).toBe(true);
      expect(mediaHolderOtherThan("someone-else")).toBe("answer-upload:offline");

      await expect(saved).resolves.toMatchObject({ mediaId: "m-1", durationMs: 18_000 });
      expect(mediaUploadError("offline")).toBeNull();
      expect(pageIsFree()).toBe(true);
    },
    10_000,
  );

  it("only retries what retrying can fix", () => {
    expect(isFatalUploadError(0)).toBe(false);
    expect(isFatalUploadError(500)).toBe(false);
    expect(isFatalUploadError(401)).toBe(false);
    expect(isFatalUploadError(429)).toBe(false);
    expect(isFatalUploadError(409, "SESSION_REPLACED")).toBe(false);
    expect(isFatalUploadError(409)).toBe(false);
    expect(isFatalUploadError(409, "ANSWER_LOCKED")).toBe(true);
    expect(isFatalUploadError(400, "ATTEMPT_LIMIT")).toBe(true);
    expect(isFatalUploadError(422, "ANSWER_REJECTED")).toBe(true);
  });
});
