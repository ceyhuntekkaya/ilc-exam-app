import { describe, expect, it } from "vitest";
import { jobsToPersist } from "./mediaOutboxQueue";
import { enqueueRecording, mediaUploadAgeMs } from "./mediaOutbox";

describe("media outbox", () => {
  // F3-10/Adım 3: IndexedDB şemasına yeni bir alan eklemeden (Dokunulmayacaklar), job.id'nin
  // KENDİSİNE gömülü zaman damgasından yaş hesaplanır — enqueueRecording'in gerçek id biçimini kanıtlar.
  it("reports how long a job has been queued, read back from the job id's own timestamp", async () => {
    const itemId = `age-${Date.now()}`;
    expect(mediaUploadAgeMs(itemId)).toBeNull();

    const file = new File([new Blob(["x"])], "clip.webm", { type: "audio/webm" });
    // Oturum yok -> yükleme hep 401 ile reddedilir (non-fatal), iş kuyrukta kalır — "yaş" ölçülebilir.
    void enqueueRecording({
      applicationId: "app-age", recipientId: "rec-age", itemId, intentId: "intent-age", file, durationMs: 1000,
    }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const age = mediaUploadAgeMs(itemId);
    expect(age).not.toBeNull();
    expect(age!).toBeGreaterThanOrEqual(0);
    expect(age!).toBeLessThan(5000);
  });

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
