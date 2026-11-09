import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StatsView, StudyView } from "@/src/api/generated/models";

const canMock = vi.fn();
const finalizeMock = vi.fn();
const openRoundMock = vi.fn();
let study: StudyView;
let stats: StatsView;

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock(), usePanel: () => ({ basePath: "/staff" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/staff/content/standard-setting/s1", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/src/components/auth-provider", () => ({ useAuth: () => ({ user: { userId: "me" } }) }));
vi.mock("@/src/features/psychometrics/central", async (importActual) => ({
  ...(await importActual<typeof import("@/src/features/psychometrics/central")>()),
  useCentralRequest: () => ({ ready: true, tenantId: "hq", request: undefined }),
}));
vi.mock("@/src/api/generated/standart-belirleme/standart-belirleme", () => {
  const mutation = (fn?: unknown) => () => ({ mutateAsync: fn ?? vi.fn(), isPending: false });
  const query = (get: () => unknown) => () => ({ data: { data: get() }, isLoading: false, isError: false, isSuccess: true });
  return {
    getGetStudyQueryKey: (id: string) => [`/standard-setting/studies/${id}`],
    getListStudiesQueryKey: () => ["/standard-setting/studies"],
    getListCutScoresQueryKey: () => ["cut"],
    useGetStudy: query(() => study),
    useRoundStats: query(() => stats),
    useListCredentials: query(() => []),
    useListCutScores: query(() => []),
    useAddPanelist: mutation(),
    useRemovePanelist: mutation(),
    useOpenRound: () => ({ mutateAsync: openRoundMock, isPending: false }),
    useCloseRound: mutation(),
    useFinalizeStudy: () => ({ mutateAsync: finalizeMock, isPending: false }),
    useProposeCutScore: mutation(),
    useApproveCutScore: mutation(),
  };
});

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { StudyDetailPage } = await import("./StudyDetailPage");
const { RoundStatsView } = await import("./RoundStats");

const BASE: StudyView = {
  id: "s1",
  examCode: "PLC-1",
  examTitle: "Seviye Tespit",
  examVersionNo: 3,
  method: "ANGOFF",
  status: "OPEN",
  itemCount: 20,
  createdAt: "2026-11-01T09:00:00Z",
  panelists: [{ panelistId: "p1", displayName: "Ayşe Y.", credentialStatus: "APPROVED", credentialValidNow: true }],
  rounds: [{ roundNo: 1, open: false, openedAt: "2026-11-02T09:00:00Z", closedAt: "2026-11-03T09:00:00Z" }],
};
const STATS: StatsView = {
  roundNo: 1,
  open: false,
  method: "ANGOFF",
  completeCount: 1,
  consensusReached: true,
  consensusThreshold: 0.5,
  standardError: 0.25,
  distribution: { panelistCount: 1, mean: 12.5, standardDeviation: 0, min: 12.5, max: 12.5 },
  panelists: [{ panelistId: "p1", displayName: "Ayşe Y.", complete: true, ratedCount: 20, totalCount: 20, cutEstimate: 12.5 }],
  itemStats: [{ questionVersionId: "q1", ordinal: 1, mean: 0.6, standardDeviation: 0.1, n: 1 }],
};

describe("StudyDetailPage", () => {
  afterEach(() => {
    canMock.mockReset();
    finalizeMock.mockReset();
    openRoundMock.mockReset();
  });

  it("kapalı turdan sonra yeni tur ve sonlandırma sunar; tur kapatma sunmaz", () => {
    canMock.mockReturnValue(true);
    study = BASE;
    stats = STATS;
    renderWithProviders(<StudyDetailPage studyId="s1" />);
    expect(screen.getByRole("button", { name: "Yeni tur aç" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Çalışmayı sonlandır" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Turu kapat" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Panelist ekle" })).toBeInTheDocument();
  });

  it("yetkisizde yazma düğmeleri gizlidir", () => {
    canMock.mockReturnValue(false);
    study = BASE;
    stats = STATS;
    renderWithProviders(<StudyDetailPage studyId="s1" />);
    for (const name of ["Yeni tur aç", "Çalışmayı sonlandır", "Panelist ekle", "Çıkar"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(screen.getByText("Ayşe Y.", { selector: "span" })).toBeInTheDocument();
  });

  it("açık turda tur kapatılabilir ama sonlandırma ve panel değişikliği kapalıdır", () => {
    canMock.mockReturnValue(true);
    study = { ...BASE, rounds: [{ roundNo: 1, open: true }] };
    stats = { ...STATS, open: true };
    renderWithProviders(<StudyDetailPage studyId="s1" />);
    expect(screen.getByRole("button", { name: "Turu kapat" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Çalışmayı sonlandır" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Panelist ekle" })).not.toBeInTheDocument();
  });

  it("sonlandırma geri alınamaz uyarısı verir ve onay ifadesi olmadan çalışmaz", async () => {
    canMock.mockReturnValue(true);
    finalizeMock.mockResolvedValue({ data: BASE });
    study = BASE;
    stats = STATS;
    renderWithProviders(<StudyDetailPage studyId="s1" />);
    fireEvent.click(screen.getByRole("button", { name: "Çalışmayı sonlandır" }));
    const dialog = screen.getByRole("dialog", { name: "Çalışma sonlandırılsın mı?" });
    expect(within(dialog).getByText(/GERİ ALINAMAZ/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Sonlandır" }));
    expect(finalizeMock).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/yazınız/), { target: { value: "SONLANDIR" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sonlandır" }));
    await waitFor(() => expect(finalizeMock).toHaveBeenCalledWith({ studyId: "s1" }));
  });

  it("sonlandırılmış çalışmada nihai kesme ve kesme sürümü paneli görünür", () => {
    canMock.mockReturnValue(true);
    study = { ...BASE, status: "FINALIZED", finalCut: 12.5, finalSem: 0.25 };
    stats = STATS;
    renderWithProviders(<StudyDetailPage studyId="s1" />);
    expect(screen.getByText("12,500 / 0,250")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kesme sürümü öner" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Yeni tur aç" })).not.toBeInTheDocument();
  });
});

describe("RoundStatsView", () => {
  it("dağılım, SEM, uzlaşma ve madde istatistiğini gösterir", () => {
    renderWithProviders(<RoundStatsView stats={STATS} />);
    expect(screen.getByText("Uzlaşma sağlandı")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getAllByText("12,500").length).toBeGreaterThan(0);
    expect(screen.getByText("0,250")).toBeInTheDocument();
    expect(screen.getByText("0,600")).toBeInTheDocument();
  });

  it("tamamlayan yoksa hesaplanamadı der, tahmin göstermez", () => {
    renderWithProviders(
      <RoundStatsView
        stats={{ ...STATS, open: true, completeCount: 0, consensusReached: false, distribution: undefined, panelists: [{ panelistId: "p1", displayName: "Ayşe Y.", complete: false, ratedCount: 3, totalCount: 20 }], itemStats: [] }}
      />,
    );
    expect(screen.getByText("Hesaplanamadı")).toBeInTheDocument();
    expect(screen.getByText("3/20")).toBeInTheDocument();
    expect(screen.getByText("Devam ediyor")).toBeInTheDocument();
  });
});
