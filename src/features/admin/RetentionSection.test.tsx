import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const canMock = vi.fn();
const statusMock = vi.fn();
const policiesMock = vi.fn();
const holdsMock = vi.fn();
const setPolicyMock = vi.fn();
const runMock = vi.fn();
const openHoldMock = vi.fn();
const releaseHoldMock = vi.fn();

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock(), usePanel: () => ({ role: "SUPER_ADMIN", basePath: "/admin" }) }));
vi.mock("@/src/api/generated/retention/retention", () => ({
  useStatus1: () => statusMock(),
  useListPolicies: () => policiesMock(),
  useActiveHolds: () => holdsMock(),
  useSetPolicy: () => ({ mutateAsync: setPolicyMock, isPending: false }),
  useRun: () => ({ mutateAsync: runMock, isPending: false }),
  useOpenHold: () => ({ mutateAsync: openHoldMock, isPending: false }),
  useReleaseHold: () => ({ mutateAsync: releaseHoldMock, isPending: false }),
  getListPoliciesQueryKey: () => ["/retention/policies"],
  getStatus1QueryKey: () => ["/retention/status"],
  getActiveHoldsQueryKey: () => ["/retention/legal-holds"],
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { RetentionSection } = await import("./RetentionSection");

const ok = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() });
const waiting = (code: string) => ({ dataKind: code, retentionDays: null, explicit: false, effectiveDays: null, state: "WAITING_FOR_DECISION", note: "Süre girilmedi" });
const ALL_WAITING = ["SES", "FOTOGRAF", "DOKUM", "YANIT", "OLAY_GUNLUGU", "KAYIT_PII"].map(waiting);
const STATUS = (enabled: boolean) => ({ executeEnabled: enabled, batchSize: 100, maxPerRun: 2000, erasureDueDays: 30, centerDefaults: ALL_WAITING, waitingForDecision: ["SES", "YANIT"] });

function setup({ can = true, enabled = false, holds = [] as unknown[] } = {}) {
  canMock.mockReturnValue(can);
  statusMock.mockReturnValue(ok(STATUS(enabled)));
  policiesMock.mockReturnValue(ok(ALL_WAITING));
  holdsMock.mockReturnValue(ok(holds));
}

afterEach(() => {
  vi.clearAllMocks();
  [canMock, statusMock, policiesMock, holdsMock].forEach((m) => m.mockReset());
});

describe("RetentionSection", () => {
  it("6 veri türü 'karar bekliyor — silme çalışmaz' ve süresiz; YANIT'ta psikometri uyarısı; varsayılan süre yok", () => {
    setup();
    renderWithProviders(<RetentionSection />);
    for (const code of ["SES", "FOTOGRAF", "DOKUM", "YANIT", "OLAY_GUNLUGU", "KAYIT_PII"]) {
      const row = screen.getByTestId(`policy-${code}`);
      expect(within(row).getByText("Karar bekliyor — silme çalışmaz")).toBeInTheDocument();
      expect(within(row).getByText("Süresiz")).toBeInTheDocument();
    }
    expect(within(screen.getByTestId("policy-YANIT")).getByText(/Psikometri istatistik çıkarımı bu veriyi okuyor/)).toBeInTheDocument();
    expect(within(screen.getByTestId("policy-SES")).queryByText(/Psikometri/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Süre girilmedi").length).toBe(6);
  });

  it("silme KAPALI belirgin; gerçek silme düğmesi devre dışı; kuru koşum yapılabilir ve gövdesi dryRun:true", async () => {
    setup({ enabled: false });
    runMock.mockResolvedValue({ data: { runId: "r", mode: "DRY_RUN", failed: 0, items: [{ dataKind: "SES", eligible: 4, blocked: 1, erased: 0, failed: 0, skippedNoPolicy: false, retentionDays: 30 }] } });
    renderWithProviders(<RetentionSection />);
    expect(screen.getByText("Silme KAPALI")).toBeInTheDocument();
    const real = screen.getByRole("button", { name: /Gerçek silmeyi başlat/ });
    expect(real).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum yap" }));
    await waitFor(() => expect(runMock).toHaveBeenCalledWith({ data: { dryRun: true } }));
    const report = await screen.findByTestId("run-report");
    expect(within(report).getByText(/Kuru koşum — hiçbir şey silinmedi/)).toBeInTheDocument();
    expect(real).toBeDisabled();
    expect(screen.getByText(/Silme KAPALI: sunucuda silme bayrağı/)).toBeInTheDocument();
  });

  it("silme AÇIKKEN: önce kuru koşum şart; sonra çift onay (ifade yazılmadan gönderilmez) ve dryRun:false", async () => {
    setup({ enabled: true });
    runMock.mockResolvedValueOnce({ data: { runId: "r", mode: "DRY_RUN", failed: 0, items: [] } });
    runMock.mockResolvedValueOnce({ data: { runId: "r2", mode: "EXECUTE", failed: 0, items: [] } });
    renderWithProviders(<RetentionSection />);
    const real = screen.getByRole("button", { name: /Gerçek silmeyi başlat/ });
    expect(real).toBeDisabled();
    expect(screen.getByText(/Önce aynı kapsamda bir kuru koşum/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum yap" }));
    await waitFor(() => expect(real).toBeEnabled());
    fireEvent.click(real);
    const dialog = screen.getByRole("dialog", { name: /Gerçek silme başlatılsın mı/ });
    expect(within(dialog).getByText(/geri alınamaz/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Evet, kalıcı olarak sil" }));
    expect(runMock).toHaveBeenCalledTimes(1);
    fireEvent.change(within(dialog).getByLabelText(/yazınız/), { target: { value: "SİL" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Evet, kalıcı olarak sil" }));
    await waitFor(() => expect(runMock).toHaveBeenCalledTimes(2));
    expect(runMock).toHaveBeenLastCalledWith({ data: { dryRun: false } });
  });

  it("süre girişi: gerekçesiz gönderilmez; boş süre null (süresiz) gider; gerekçeyle yazılır", async () => {
    setup();
    setPolicyMock.mockResolvedValue({ data: {} });
    renderWithProviders(<RetentionSection />);
    fireEvent.click(within(screen.getByTestId("policy-SES")).getByRole("button", { name: "Süreyi gir / değiştir" }));
    const dialog = screen.getByRole("dialog");
    expect((within(dialog).getByLabelText(/Saklama süresi/) as HTMLInputElement).value).toBe("");
    fireEvent.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(setPolicyMock).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/Gerekçe zorunlu/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Gerekçe/), { target: { value: "Karar 2026/9" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(setPolicyMock).toHaveBeenCalledWith({ data: { dataKind: "SES", retentionDays: null, reason: "Karar 2026/9" } }));
  });

  it("yasal tutma: listelenir; bırakma 409 mesajı aynen gösterilir", async () => {
    setup({ holds: [{ id: "h1", scopeType: "APPLICATION", scopeId: "app-1", reason: "Soruşturma", createdAt: "2026-11-01T10:00:00Z" }] });
    releaseHoldMock.mockRejectedValue(Object.assign(new Error("Bu denemenin AÇIK itiraz dosyası var; önce itiraz dosyası kapatılmalı"), { status: 409 }));
    renderWithProviders(<RetentionSection />);
    expect(within(screen.getByTestId("holds")).getByText("Soruşturma")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tutmayı bırak" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Bırakma gerekçesi/), { target: { value: "Kapandı" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Tutmayı bırak" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("AÇIK itiraz dosyası var");
    expect(releaseHoldMock).toHaveBeenCalledWith({ id: "h1", data: { reason: "Kapandı" } });
  });

  it("yetkisizde yazma/silme düğmeleri gizlidir", () => {
    setup({ can: false, holds: [{ id: "h1", scopeType: "STUDENT", scopeId: "s1", reason: "x" }] });
    renderWithProviders(<RetentionSection />);
    expect(screen.queryByRole("button", { name: "Süreyi gir / değiştir" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kuru koşum yap" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gerçek silmeyi başlat/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Yasal tutma koy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tutmayı bırak" })).not.toBeInTheDocument();
  });
});
