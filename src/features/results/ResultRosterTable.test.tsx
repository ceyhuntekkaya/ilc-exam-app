import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResultRoster } from "@/src/api/generated/models";

const publishMutate = vi.fn();
vi.mock("@/src/api/generated/result-action-controller/result-action-controller", () => ({
  usePublishOne: () => ({ mutate: publishMutate, isPending: false, variables: undefined }),
}));

const { ResultRosterTable } = await import("./ResultRosterTable");

const ROSTER: ResultRoster = {
  examTitle: "APEX",
  examTotal: 100,
  students: [
    {
      studentId: "s1",
      firstName: "Ada",
      lastName: "Bal",
      progress: {
        applicationId: "app-1",
        attendance: "TAKEN",
        status: "SUBMITTED",
        finishedReason: "STUDENT_FINISHED",
        gradingState: "READY",
        evaluationComplete: true,
        resultId: "res-1",
        published: false,
      },
      score: 7,
      maxScore: 10,
    },
    {
      studentId: "s2",
      firstName: "Cem",
      lastName: "Can",
      progress: { attendance: "NOT_STARTED" },
    },
    {
      studentId: "s3",
      firstName: "Ece",
      lastName: "Dal",
      progress: {
        applicationId: "app-3",
        attendance: "TAKEN",
        status: "AUTO_SUBMITTED",
        finishedReason: "EXAM_TIME_UP",
        gradingState: "AWAITING_MANUAL",
        manualTotal: 2,
        manualPending: 2,
        evaluationComplete: false,
      },
      score: 3,
      maxScore: 10,
    },
  ],
};

function render(onOpen = vi.fn()) {
  renderWithProviders(
    <ResultRosterTable
      companyId="c1"
      roster={ROSTER}
      onOpen={onOpen}
      onChanged={vi.fn()}
      creatingReport={false}
      onCreateReport={vi.fn()}
    />,
  );
  return onOpen;
}

describe("ResultRosterTable", () => {
  afterEach(() => vi.clearAllMocks());

  it("şubedeki herkesi listeler; girmeyen öğrenci tıklanamaz", async () => {
    const user = userEvent.setup();
    const onOpen = render();

    expect(screen.getByText("Cem Can").tagName).not.toBe("BUTTON");
    expect(screen.queryByRole("button", { name: "Cem Can" })).toBeNull();
    expect(screen.getByText("Sınavı hiç açmadı")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ada Bal" }));
    expect(onOpen).toHaveBeenCalledWith("app-1");
  });

  it("değerlendirme durumu ve eksik elle değerlendirme sayısı görünür", () => {
    render();

    expect(screen.getByText("Değerlendirme tamam")).toBeInTheDocument();
    expect(screen.getByText("Otomatik tamam · elle değerlendirme 2 eksik (0/2)")).toBeInTheDocument();
    expect(screen.getByText("70/100")).toBeInTheDocument();
    expect(screen.getByTestId("roster-counts")).toHaveTextContent("2 girdi · 1 girmedi");
  });

  it("yayınla ve karne yalnız değerlendirmesi tamam olan satırda çıkar", async () => {
    const user = userEvent.setup();
    render();

    expect(screen.getAllByRole("button", { name: "Yayınla" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Karne" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Yayınla" }));
    expect(publishMutate).toHaveBeenCalledWith({ companyId: "c1", applicationId: "app-1" });
  });
});
