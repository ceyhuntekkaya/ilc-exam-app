import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const canMock = vi.fn();
const backfillMock = vi.fn();
const incompleteMock = vi.fn();
const companiesMock = vi.fn();

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock(), usePanel: () => ({ role: "SUPER_ADMIN", basePath: "/admin" }) }));
vi.mock("@/src/api/generated/membership-admin/membership-admin", () => ({
  useBackfill: () => ({ mutateAsync: backfillMock, isPending: false }),
  useIncomplete: (params: unknown, opts: unknown) => incompleteMock(params, opts),
}));
vi.mock("@/src/api/generated/admin-companies/admin-companies", () => ({
  useList8: () => companiesMock(),
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { MembershipBackfillSection } = await import("./MembershipBackfillSection");

const C1 = "11111111-aaaa-bbbb-cccc-000000000001";
const REPORT = (dryRun: boolean) => ({
  dryRun,
  usersScanned: 120,
  identitiesLinked: 100,
  membershipsCreated: 98,
  membershipsInactive: 2,
  membershipsIncomplete: 40,
  membershipsMissingOrgUnit: 40,
  membershipsMissingAcademicYear: 35,
  createdByRole: { TEACHER: 30, STUDENT: 68 },
  companies: [{ companyId: C1, identitiesLinked: 100, membershipsCreated: 98 }],
  warnings: ["STAFF hesapları TEACHER yapıldı; gerçek roller elle gözden geçirilmeli"],
});

function setup({ can = true, incomplete = { items: [], total: 0 } as unknown } = {}) {
  canMock.mockReturnValue(can);
  companiesMock.mockReturnValue({ data: { data: { content: [{ id: C1, name: "Okul A", code: "A" }] } }, isLoading: false, isError: false });
  incompleteMock.mockReturnValue({ data: { data: incomplete }, isLoading: false, isError: false, refetch: vi.fn() });
}

afterEach(() => {
  vi.clearAllMocks();
  [canMock, backfillMock, incompleteMock, companiesMock].forEach((m) => m.mockReset());
});

describe("MembershipBackfillSection", () => {
  it("izin yoksa koşum düğmeleri gösterilmez", () => {
    setup({ can: false });
    renderWithProviders(<MembershipBackfillSection />);
    expect(screen.getByText("Koşum yetkiniz yok.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kuru koşum yap" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gerçek koşumu başlat/ })).not.toBeInTheDocument();
  });

  it("gerçek koşum önce kapalı; kuru koşum dryRun:true gönderir, rapor ve vurgulu uyarı gösterir", async () => {
    setup();
    backfillMock.mockResolvedValue({ data: REPORT(true) });
    renderWithProviders(<MembershipBackfillSection />);
    const real = screen.getByRole("button", { name: /Gerçek koşumu başlat/ });
    expect(real).toBeDisabled();
    expect(screen.getByText(/Önce aynı kapsamda bir kuru koşum yapın/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum yap" }));
    await waitFor(() => expect(backfillMock).toHaveBeenCalledWith({ data: { dryRun: true } }));
    const report = await screen.findByTestId("backfill-report");
    expect(within(report).getByText(/Kuru koşum — hiçbir şey yazılmadı/)).toBeInTheDocument();
    expect(within(screen.getByTestId("count-membershipsCreated")).getByText("98")).toBeInTheDocument();
    expect(within(screen.getByTestId("count-membershipsMissingOrgUnit")).getByText("40")).toBeInTheDocument();
    expect(within(screen.getByTestId("backfill-warnings")).getByText(/roller elle gözden geçirilmeli/, { selector: "li" })).toBeInTheDocument();
    expect(screen.getByTestId("created-by-role")).toHaveTextContent("TEACHER: 30");
    expect(real).toBeEnabled();
  });

  it("kapsam değişince gerçek koşum yeniden kilitlenir (kuru koşum aynı kapsamda olmalı)", async () => {
    setup();
    backfillMock.mockResolvedValue({ data: REPORT(true) });
    renderWithProviders(<MembershipBackfillSection />);
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum yap" }));
    await screen.findByTestId("backfill-report");
    expect(screen.getByRole("button", { name: /Gerçek koşumu başlat/ })).toBeEnabled();
    // Kapsam seçicisi (ilk Select = Kapsam) değeri değişir.
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: C1 } });
    await waitFor(() => expect(screen.getByRole("button", { name: /Gerçek koşumu başlat/ })).toBeDisabled());
  });

  it("gerçek koşum 'ÇALIŞTIR' yazılmadan gönderilmez; yazılınca dryRun:false gider", async () => {
    setup();
    backfillMock.mockResolvedValueOnce({ data: REPORT(true) });
    backfillMock.mockResolvedValueOnce({ data: REPORT(false) });
    renderWithProviders(<MembershipBackfillSection />);
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum yap" }));
    await screen.findByTestId("backfill-report");
    fireEvent.click(screen.getByRole("button", { name: /Gerçek koşumu başlat/ }));
    const dialog = await screen.findByRole("dialog", { name: "Gerçek koşum başlatılsın mı?" });
    const confirm = within(dialog).getByRole("button", { name: "Evet, çalıştır" });
    const phrase = within(dialog).getByRole("textbox");
    fireEvent.change(phrase, { target: { value: "çalıştır yanlış" } });
    fireEvent.click(confirm);
    expect(backfillMock).toHaveBeenCalledTimes(1);
    fireEvent.change(phrase, { target: { value: "ÇALIŞTIR" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(backfillMock).toHaveBeenLastCalledWith({ data: { dryRun: false } }));
    expect(await screen.findByText(/Gerçek koşum yapıldı/)).toBeInTheDocument();
    // Gerçek koşumdan sonra kapı yeniden kapanır.
    expect(screen.getByRole("button", { name: /Gerçek koşumu başlat/ })).toBeDisabled();
  });

  it("gerçek koşum hatasında sunucu mesajı onay penceresinde aynen gösterilir", async () => {
    setup();
    backfillMock.mockResolvedValueOnce({ data: REPORT(true) });
    backfillMock.mockRejectedValueOnce(Object.assign(new Error("Merkez yetkisi gerekir"), { status: 403 }));
    renderWithProviders(<MembershipBackfillSection />);
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum yap" }));
    await screen.findByTestId("backfill-report");
    fireEvent.click(screen.getByRole("button", { name: /Gerçek koşumu başlat/ }));
    const dialog = await screen.findByRole("dialog", { name: "Gerçek koşum başlatılsın mı?" });
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "ÇALIŞTIR" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Evet, çalıştır" }));
    expect(await within(dialog).findByText("Merkez yetkisi gerekir")).toBeInTheDocument();
  });

  it("eksik alanlı liste: kurum seçilmeden sorgu kapalı; seçilince satırlar ve eksik rozetleri", () => {
    setup({
      incomplete: {
        total: 1,
        items: [{ membershipId: "m1", displayName: "Ali Veli", username: "aliv", userType: "STAFF", role: "TEACHER", status: "ACTIVE", missingOrgUnit: true, missingAcademicYear: true }],
      },
    });
    renderWithProviders(<MembershipBackfillSection />);
    expect(screen.getByText("Kurum seçin", { selector: "p, h3, div" })).toBeInTheDocument();
    expect(incompleteMock).toHaveBeenLastCalledWith({ companyId: "", page: 0, size: 50 }, { query: { enabled: false, retry: false } });
    expect(screen.queryByText("Ali Veli")).not.toBeInTheDocument();
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[selects.length - 1], { target: { value: C1 } });
    expect(incompleteMock).toHaveBeenLastCalledWith({ companyId: C1, page: 0, size: 50 }, { query: { enabled: true, retry: false } });
    expect(screen.getByText("Ali Veli")).toBeInTheDocument();
    expect(screen.getByText("Birim yok")).toBeInTheDocument();
    expect(screen.getByText("Sezon yok")).toBeInTheDocument();
  });
});
