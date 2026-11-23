import { ExamSessionProvider, type ExamSessionContextValue } from "@/src/features/exam-player/session/ExamSessionContext";
import { claimMedia, resetPlayerGuard } from "@/src/features/exam-player/session/playerGuard";
import { act, renderWithProviders, screen } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioResponseView, OpenEndedView } from "./ResponseViews";

// Next App Router bağlamı ve ağ: sahnenin dışı. Kayıt düğmesinin kararları (hak, kilit) GERÇEK çalışır.
vi.mock("next/navigation", () => ({ useParams: () => ({}) }));
vi.mock("@/src/features/exam-player/session/studentMediaApi", () => ({
  openMediaIntent: async () => "intent-1",
  openAnswerContentTicket: async () => "ticket-1",
  applicationMediaContentUrl: () => "blob://test",
}));

const speaking = { maxAttempts: 1, prepTimeSec: 10, maxDurationSec: 25 };

function renderWithSession(ui: React.ReactNode, extra?: Partial<ExamSessionContextValue>) {
  const applicationId = `app-${crypto.randomUUID()}`;
  renderWithProviders(
    <ExamSessionProvider
      value={{
        applicationId,
        sessionToken: "token",
        hydrated: true,
        answersRevision: 0,
        uploadMedia: async () => ({ mediaId: "" }),
        ...extra,
      }}
    >
      {ui}
    </ExamSessionProvider>,
  );
  return applicationId;
}

afterEach(() => {
  resetPlayerGuard();
  sessionStorage.clear();
  vi.useRealTimers();
});

describe("speaking answer — the record button never lies", () => {
  it("hides the button when the only try is used, instead of a 'Record again' that does nothing", () => {
    // Hak sayacı oturumda: aynı sekmede bir kayıt kaydedildi.
    const appId = "app-used";
    sessionStorage.setItem(`ilc-attempts:${appId}:item-1`, "1");
    renderWithProviders(
      <ExamSessionProvider value={{ applicationId: appId, sessionToken: "t", hydrated: true, answersRevision: 0, uploadMedia: async () => ({ mediaId: "" }) }}>
        <AudioResponseView interaction={speaking} itemId="item-1" />
      </ExamSessionProvider>,
    );

    expect(screen.queryByRole("button", { name: /record again|start|record/i })).toBeNull();
    expect(screen.getByText("You have no more tries.")).toBeInTheDocument();
  });

  it("offers another try while tries are left", () => {
    const appId = "app-left";
    sessionStorage.setItem(`ilc-attempts:${appId}:item-1`, "1");
    renderWithProviders(
      <ExamSessionProvider value={{ applicationId: appId, sessionToken: "t", hydrated: true, answersRevision: 0, uploadMedia: async () => ({ mediaId: "" }) }}>
        <AudioResponseView interaction={{ ...speaking, maxAttempts: 2 }} itemId="item-1" />
      </ExamSessionProvider>,
    );

    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
    expect(screen.getByText("Tries left: 1")).toBeInTheDocument();
  });

  // Gerçek sınav hatası: kilit takılıyken Start düşünme süresini saydırıyor, sonra kayıt sessizce başlamıyordu.
  it("says why it cannot start while the last recording is still sending, without a silent think countdown", async () => {
    claimMedia("answer-upload:other-item");
    renderWithSession(<AudioResponseView interaction={speaking} itemId="item-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(screen.getByText("Please wait. Your recording is still being sent.")).toBeInTheDocument();
    expect(screen.queryByText("Think about your answer.")).toBeNull();
  });
});

describe("writing answer — saved without a save button", () => {
  it("saves by itself after the student pauses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const saveAnswer = vi.fn(() => Promise.resolve());
    renderWithSession(<OpenEndedView interaction={{}} itemId="item-w" />, { saveAnswer });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.type(screen.getByLabelText("Your answer"), "My weekend");
    expect(screen.queryByRole("button", { name: "Save answer" })).toBeNull();
    expect(saveAnswer).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(saveAnswer).toHaveBeenCalledWith("item-w", { text: "My weekend" });
    expect(await screen.findByText(/Saved/)).toBeInTheDocument();
  });

  it("saves when the student leaves the box", async () => {
    const saveAnswer = vi.fn(() => Promise.resolve());
    renderWithSession(<OpenEndedView interaction={{}} itemId="item-w" />, { saveAnswer });

    await userEvent.type(screen.getByLabelText("Your answer"), "Hello");
    await userEvent.tab();

    expect(saveAnswer).toHaveBeenCalledWith("item-w", { text: "Hello" });
  });
});
