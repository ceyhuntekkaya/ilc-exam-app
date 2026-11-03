import { ExamSessionProvider } from "@/src/features/exam-player/session/ExamSessionContext";
import { dropAnswerOutbox, getAnswerOutbox } from "@/src/features/exam-player/session/answerOutbox";
import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HotspotSelectView } from "@/src/features/exam-player/interactions/HotspotViews";

/**
 * F3-00 referans testi 2: bir HOTSPOT_SELECT maddesi yalnız Tab/ok/Enter ile çözülür.
 * `hotspotNav.ts` (F2-04) zaten saf fonksiyon seviyesinde test edilmişti (hotspotNav.test.ts);
 * bu test onu BİLEŞEN seviyesinde doğrular — F2-04'ün elle yapılamayan doğrulamasının
 * (DURUM.md: "manuel tarayıcı testi hâlâ yapılmadı") otomatik karşılığı.
 */
describe("HOTSPOT_SELECT keyboard-only navigation", () => {
  const applicationId = "app-hotspot";
  const itemId = "part-hotspot";

  afterEach(() => {
    dropAnswerOutbox(applicationId);
  });

  it("moves focus with arrow keys and selects with Enter — no mouse", async () => {
    const outbox = getAnswerOutbox(applicationId);
    const user = userEvent.setup();
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
        }}
      >
        <HotspotSelectView
          itemId={itemId}
          interaction={{
            mediaId: null,
            regions: [
              { id: "region-a", shape: { kind: "RECT", x: 0, y: 0, w: 0.2, h: 0.2 }, label: "A" },
              { id: "region-b", shape: { kind: "RECT", x: 0.5, y: 0.5, w: 0.2, h: 0.2 }, label: "B" },
            ],
          }}
        />
      </ExamSessionProvider>,
    );

    const regionA = screen.getByRole("button", { name: /^A$/ });
    const regionB = screen.getByRole("button", { name: /^B$/ });

    await user.tab();
    expect(regionA).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(regionB).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(outbox.getAnswer(itemId)).toEqual({ regionIds: ["region-b"] });
  });
});
