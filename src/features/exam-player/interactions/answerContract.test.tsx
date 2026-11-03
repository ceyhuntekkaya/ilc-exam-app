import { ExamSessionProvider, type ExamSessionContextValue } from "@/src/features/exam-player/session/ExamSessionContext";
import { dropAnswerOutbox, getAnswerOutbox } from "@/src/features/exam-player/session/answerOutbox";
import { renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InteractionRenderer } from "@/src/features/exam-player/interactions/InteractionRenderer";
import {
  fillInTheBlanksFixture,
  groupingFixture,
  hotspotPlaceFixture,
  hotspotSelectFixture,
  imageResponseFixture,
  matchingFixture,
  multipleChoiceFixture,
  multipleResponseFixture,
  openEndedFixture,
  orderingFixture,
  shortAnswerFixture,
  trueFalseFixture,
  videoResponseFixture,
} from "@/src/test/fixtures/items";

// VIDEO_RESPONSE/IMAGE_RESPONSE'ın dosya yükleme yolu `studentMediaApi`'ye (gerçek ağ çağrısı) ve
// AudioResponseView/VideoResponseView'ın `useParams()`'a (Next App Router bağlamı, bu testlerde yok)
// bağımlı — ikisi de burada sahnenin DIŞI, cevap sözleşmesinin değil. İçerideki asıl üretim kodu
// (`saveMediaAnswer`, `useUploader`) GERÇEK çalışır; mock yalnız bu iki sınır noktasında.
vi.mock("next/navigation", () => ({ useParams: () => ({}) }));
vi.mock("@/src/features/exam-player/session/studentMediaApi", () => ({
  openMediaIntent: async () => "intent-1",
  openAnswerContentTicket: async () => "ticket-1",
  applicationMediaContentUrl: () => "blob://test",
}));

/**
 * F3-02: 14 madde tipinin cevap sözleşmesi — her tip TEK test, gerçek kullanıcı etkileşimiyle
 * (tıklama/klavye/dosya seçimi) tetiklenir, gerçek `AnswerOutbox`'a yazılan `answer_json`
 * backend `ObjectiveScorer.compare()` switch'indeki anahtar adlarıyla karşılaştırılır (mock yok —
 * F3-00'ın kurduğu desen: `ExamSessionProvider.saveAnswer` → gerçek `outbox.put`).
 *
 * AUDIO_RESPONSE bilerek YOK (bkz. altta `it.todo`): tek kayıt yolu `MediaRecorder`/
 * `getUserMedia`/`AudioContext` — jsdom'da hiçbiri yok, taklidi "mock'un mock'u test etmesi"
 * olurdu. Şekli (`{mediaId, mediaIds}`) VIDEO/IMAGE_RESPONSE ile aynı `saveMediaAnswer`
 * fonksiyonundan geçtiği için zaten statik olarak doğrulandı (DURUM.md).
 */
describe("answerContract — 14 madde tipi", () => {
  const itemId = "item-1";
  // Her test kendi applicationId'sini alır: AnswerOutbox localStorage'da durur (gerçek üretim
  // davranışı, bkz. answerOutbox.ts), paylaşılan bir id önceki testin cevabını hydrate eder.
  const usedAppIds: string[] = [];

  afterEach(() => {
    for (const id of usedAppIds.splice(0)) dropAnswerOutbox(id);
  });

  function renderItem(type: string, interaction: Record<string, unknown>, extra?: Partial<ExamSessionContextValue>) {
    // crypto.randomUUID (setup.ts stub'u), ORDERING testindeki Math.random sahteciliğinden bağımsız.
    const applicationId = `app-${type.toLowerCase()}-${crypto.randomUUID()}`;
    usedAppIds.push(applicationId);
    const outbox = getAnswerOutbox(applicationId);
    renderWithProviders(
      <ExamSessionProvider
        value={{
          applicationId,
          sessionToken: "token",
          hydrated: true,
          answersRevision: 0,
          uploadMedia: async () => ({ mediaId: "" }),
          saveAnswer: (id, answer) => {
            outbox.put(id, answer);
            return Promise.resolve();
          },
          ...extra,
        }}
      >
        <InteractionRenderer type={type} itemId={itemId} interaction={interaction} />
      </ExamSessionProvider>,
    );
    return outbox;
  }

  it("MULTIPLE_CHOICE: bir seçenek tıklanır → {optionId}", async () => {
    const outbox = renderItem("MULTIPLE_CHOICE", multipleChoiceFixture);

    await userEvent.click(screen.getByText("Paris"));

    expect(outbox.getAnswer(itemId)).toEqual({ optionId: "opt-paris" });
  });

  it("MULTIPLE_RESPONSE: iki seçenek tıklanır → {optionIds}", async () => {
    const outbox = renderItem("MULTIPLE_RESPONSE", multipleResponseFixture);

    await userEvent.click(screen.getByText("Red"));
    await userEvent.click(screen.getByText("Blue"));

    expect(outbox.getAnswer(itemId)).toEqual({ optionIds: ["opt-red", "opt-blue"] });
  });

  it("TRUE_FALSE: 'True' tıklanır → {answers}", async () => {
    const outbox = renderItem("TRUE_FALSE", trueFalseFixture);

    await userEvent.click(screen.getByRole("button", { name: "True" }));

    expect(outbox.getAnswer(itemId)).toEqual({ answers: { s1: "TRUE" } });
  });

  it("FILL_IN_THE_BLANKS (PER_BLANK): boşluk açılır, kelime seçilir → {choiceIds}", async () => {
    const outbox = renderItem("FILL_IN_THE_BLANKS", fillInTheBlanksFixture);

    await userEvent.click(screen.getByRole("button", { name: /Gap 1/ }));
    await userEvent.click(screen.getByRole("option", { name: "Paris" }));

    expect(outbox.getAnswer(itemId)).toEqual({ choiceIds: { b1: "c-paris" } });
  });

  it("SHORT_ANSWER: boşluğa yazılır → {answers}", async () => {
    const outbox = renderItem("SHORT_ANSWER", shortAnswerFixture);

    await userEvent.type(screen.getByLabelText("Gap 1"), "Paris");

    expect(outbox.getAnswer(itemId)).toEqual({ answers: { b1: "Paris" } });
  });

  it("MATCHING: cevap seçilir, kutuya dokunulur → {pairs}", async () => {
    const outbox = renderItem("MATCHING", matchingFixture);

    await userEvent.click(screen.getByRole("button", { name: "Paris" }));
    await userEvent.click(screen.getByRole("button", { name: "Put the card in box 1" }));

    expect(outbox.getAnswer(itemId)).toEqual({ pairs: { l1: "r-paris" } });
  });

  it("ORDERING: bir kart 'Move down' ile taşınır → {order}", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const outbox = renderItem("ORDERING", orderingFixture);
      // Karıştırma Math.random=0 ile ["i2","i1"] üretir (Fisher–Yates, bilinçli determinizm).
      const moveDownButtons = screen.getAllByRole("button", { name: "Move down" });

      await userEvent.click(moveDownButtons[0]);

      expect(outbox.getAnswer(itemId)).toEqual({ order: ["i1", "i2"] });
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("GROUPING: kart seçilir, gruba dokunulur → {groupOf}", async () => {
    const outbox = renderItem("GROUPING", groupingFixture);

    await userEvent.click(screen.getByRole("button", { name: "Apple" }));
    await userEvent.click(screen.getByRole("button", { name: "Put the card in Fruit" }));

    expect(outbox.getAnswer(itemId)).toEqual({ groupOf: { m1: "g-fruit" } });
  });

  it("HOTSPOT_SELECT: bölge tıklanır → {regionIds}", async () => {
    const outbox = renderItem("HOTSPOT_SELECT", hotspotSelectFixture);

    await userEvent.click(screen.getByRole("button", { name: /^A$/ }));

    expect(outbox.getAnswer(itemId)).toEqual({ regionIds: ["region-a"] });
  });

  it("HOTSPOT_PLACE: kart seçilir, alana dokunulur → {zoneOf}", async () => {
    const outbox = renderItem("HOTSPOT_PLACE", hotspotPlaceFixture);

    await userEvent.click(screen.getByRole("button", { name: "Hat" }));
    await userEvent.click(screen.getByRole("button", { name: "Put the card in Head" }));

    expect(outbox.getAnswer(itemId)).toEqual({ zoneOf: { d1: "z-head" } });
  });

  it("OPEN_ENDED: metin yazılır, kaydedilir → {text}", async () => {
    const outbox = renderItem("OPEN_ENDED", openEndedFixture);

    await userEvent.type(screen.getByLabelText("Your answer"), "My essay text");
    await userEvent.click(screen.getByRole("button", { name: "Save answer" }));

    expect(outbox.getAnswer(itemId)).toEqual({ text: "My essay text" });
  });

  it.todo(
    "AUDIO_RESPONSE: tek yol MediaRecorder/getUserMedia/AudioContext kaydı — jsdom'da yok, " +
      "bileşen testiyle taklit edilemez (şekli {mediaId, mediaIds}, VIDEO/IMAGE_RESPONSE ile aynı " +
      "saveMediaAnswer'dan geçtiği için statik doğrulandı; bkz. DURUM.md)",
  );

  it("VIDEO_RESPONSE: dosya yüklenir → {mediaId, mediaIds}", async () => {
    const outbox = renderItem("VIDEO_RESPONSE", videoResponseFixture, {
      uploadMedia: async () => ({ mediaId: "media-v1" }),
    });
    const file = new File(["x"], "clip.mp4", { type: "video/mp4" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => expect(outbox.getAnswer(itemId)).toEqual({ mediaId: "media-v1", mediaIds: ["media-v1"] }));
  });

  it("IMAGE_RESPONSE: dosya yüklenir → {mediaId, mediaIds}", async () => {
    const outbox = renderItem("IMAGE_RESPONSE", imageResponseFixture, {
      uploadMedia: async () => ({ mediaId: "media-i1" }),
    });
    const file = new File(["x"], "pic.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => expect(outbox.getAnswer(itemId)).toEqual({ mediaId: "media-i1", mediaIds: ["media-i1"] }));
  });
});
