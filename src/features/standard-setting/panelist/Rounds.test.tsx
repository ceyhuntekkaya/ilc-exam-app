import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SheetView } from "@/src/api/generated/models";

const angoffMock = vi.fn();
const bookmarkMock = vi.fn();

vi.mock("@/src/features/psychometrics/central", async (importActual) => ({
  ...(await importActual<typeof import("@/src/features/psychometrics/central")>()),
  useCentralRequest: () => ({ ready: true, tenantId: "hq", request: undefined }),
}));
vi.mock("@/src/api/generated/standart-belirleme/standart-belirleme", () => ({
  getMySheetQueryKey: (id: string) => [`/standard-setting/me/studies/${id}/sheet`],
  useSubmitAngoff: () => ({ mutateAsync: angoffMock, isPending: false }),
  useSubmitBookmark: () => ({ mutateAsync: bookmarkMock, isPending: false }),
}));

const { AngoffRound } = await import("./AngoffRound");
const { BookmarkRound } = await import("./BookmarkRound");

function item(id: string, ordinal: number, extra: Partial<SheetView["items"] extends (infer T)[] | undefined ? T : never> = {}) {
  return {
    questionVersionId: id,
    ordinal,
    sectionTitle: "Reading",
    points: 1,
    cefrLevel: "B1",
    body: { instruction: `Yönerge ${ordinal}` },
    parts: [{ id: `p${ordinal}`, interactionType: "MCQ", content: { stem: [{ type: "TEXT", text: `Soru ${ordinal}` }], interaction: { options: [{ id: "a", text: "Birinci" }, { id: "b", text: "İkinci" }] }, answerKey: { correct: "a" } } }],
    ...extra,
  };
}

const ANGOFF: SheetView = { studyId: "s1", method: "ANGOFF", roundNo: 1, ratedCount: 1, totalCount: 2, items: [item("q1", 1, { myValue: 0.4 }), item("q2", 2)] };
const BOOKMARK: SheetView = { studyId: "s1", method: "BOOKMARK", roundNo: 1, ratedCount: 0, totalCount: 1, items: [item("q9", 5), item("q3", 2)] };

describe("AngoffRound", () => {
  afterEach(() => {
    angoffMock.mockReset();
  });

  it("madde gövdesini ve ilerlemeyi gösterir; doğru cevabı göstermez", () => {
    renderWithProviders(<AngoffRound sheet={ANGOFF} />);
    expect(screen.getByText("Soru 1")).toBeInTheDocument();
    expect(screen.getAllByText("Birinci").length).toBeGreaterThan(0);
    expect(screen.getByRole("progressbar", { name: "Kayıtlı ilerleme" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByLabelText("Madde 1 olasılığı")).toHaveValue("0.4");
    expect(document.body.textContent).not.toMatch(/correct|answerKey/);
  });

  it("aralık dışı değer kaydı engeller", () => {
    renderWithProviders(<AngoffRound sheet={ANGOFF} />);
    fireEvent.change(screen.getByLabelText("Madde 2 olasılığı"), { target: { value: "1,5" } });
    expect(screen.getByText("0 ile 1 arasında bir sayı girin")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: "Puanları kaydet" })) expect(button).toBeDisabled();
    expect(angoffMock).not.toHaveBeenCalled();
  });

  it("geçerli girişleri 0..1 sayı olarak gönderir (virgül kabul)", async () => {
    angoffMock.mockResolvedValue({ data: { ...ANGOFF, ratedCount: 2, items: [item("q1", 1, { myValue: 0.4 }), item("q2", 2, { myValue: 0.65 })] } });
    renderWithProviders(<AngoffRound sheet={ANGOFF} />);
    fireEvent.change(screen.getByLabelText("Madde 2 olasılığı"), { target: { value: "0,65" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Puanları kaydet" })[0]);
    await waitFor(() =>
      expect(angoffMock).toHaveBeenCalledWith({
        studyId: "s1",
        data: { ratings: [{ questionVersionId: "q1", value: 0.4 }, { questionVersionId: "q2", value: 0.65 }] },
      }),
    );
  });

  it("backend hatasını gösterir", async () => {
    angoffMock.mockRejectedValue(new Error("Tur kapalı"));
    renderWithProviders(<AngoffRound sheet={ANGOFF} />);
    fireEvent.change(screen.getByLabelText("Madde 2 olasılığı"), { target: { value: "0.2" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Puanları kaydet" })[0]);
    expect(await screen.findByText("Tur kapalı")).toBeInTheDocument();
  });
});

describe("BookmarkRound", () => {
  afterEach(() => {
    bookmarkMock.mockReset();
  });

  it("maddeleri verilen (zorluk) sırasında konumla gösterir, zorluk değeri ve sınıf göstermez", () => {
    renderWithProviders(<BookmarkRound sheet={{ ...BOOKMARK, items: BOOKMARK.items!.map((i) => ({ ...i, difficulty: 1.23 }) as never) }} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings.indexOf("1. madde")).toBeLessThan(headings.indexOf("2. madde"));
    expect(screen.getByText("Soru 5")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/1[.,]23|difficulty|zorluk değeri|B1/);
  });

  it("konum seçilmeden kaydedilemez; son konum n+1 gönderilir", async () => {
    bookmarkMock.mockResolvedValue({ data: { ...BOOKMARK, bookmarkPosition: 3, ratedCount: 1 } });
    renderWithProviders(<BookmarkRound sheet={BOOKMARK} />);
    for (const button of screen.getAllByRole("button", { name: "İşareti kaydet" })) expect(button).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/işareti listenin sonuna koy/));
    fireEvent.click(screen.getAllByRole("button", { name: "İşareti kaydet" })[0]);
    await waitFor(() => expect(bookmarkMock).toHaveBeenCalledWith({ studyId: "s1", data: { position: 3 } }));
  });

  it("kayıtlı konum seçili gelir", () => {
    renderWithProviders(<BookmarkRound sheet={{ ...BOOKMARK, bookmarkPosition: 2 }} />);
    expect(screen.getByText("İşaretli")).toBeInTheDocument();
    expect(screen.getByText("2. madde", { selector: "span" })).toBeInTheDocument();
  });
});
