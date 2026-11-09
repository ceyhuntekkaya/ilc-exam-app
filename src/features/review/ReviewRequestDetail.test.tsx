import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const POOL = "pool-company-from-backend";
const calls: { url: string; method: string; body?: unknown }[] = [];
let detail: Record<string, unknown>;

const answers = [
  {
    answerId: "a1",
    itemId: "i1",
    interactionType: "OPEN_ENDED",
    answer: { text: "Yazılı cevap metni" },
    examPoints: 10,
    finalScore: 6,
    aiScore: 6,
    scoreSource: "AI_ACCEPTED",
    modelSource: "CENTRAL",
    feedback: "İyi",
    rationale: "Rubriğe uygun",
    versionNo: 1,
    correctedInThisRequest: false,
  },
  {
    answerId: "a2",
    itemId: "i2",
    interactionType: "AUDIO_RESPONSE",
    answer: {},
    mediaId: "m1",
    examPoints: 5,
    finalScore: 2,
    scoreSource: "HUMAN",
    versionNo: 2,
    correctedInThisRequest: false,
  },
];

const base = () => ({
  reviewRequestId: "rr1",
  status: "OPEN",
  reason: "Konuşma puanım düşük",
  requestedAt: "2026-11-01T10:00:00Z",
  applicationId: "app1",
  applicationResultId: "ar1",
  candidateName: "Aday Bir",
  examTitle: "ILC Placement",
  canCorrect: true,
  snapshot: {
    snapshotId: "s1",
    active: true,
    totalScore: 40,
    examTotal: 60,
    cefrLevel: "B1",
    passed: true,
    sections: [{ title: "Speaking", skill: "SPEAKING", earned: 10, available: 20 }],
  },
  appeal: { appealCaseId: "ap1", status: "OPEN" },
  answers,
  corrections: [],
});

vi.mock("@/src/features/panel/PanelContext", () => ({
  usePanel: () => ({ role: "SUPER_ADMIN", basePath: "/admin", companyId: null }),
  useCan: () => true,
}));
vi.mock("@/src/api/mutator", () => ({
  customInstance: vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url === "/grading/individual-pool") return { data: { companyId: POOL }, status: 200 };
    if (url.endsWith("/evidence")) {
      return {
        data: { collectedAt: "2026-11-01T10:00:00Z", events: [{ type: "START", at: "t1" }], answers: [], evaluations: [], readings: [], rubricRefs: [], audioRefs: [] },
        status: 200,
      };
    }
    if (url.endsWith("/uphold") || url.endsWith("/change")) return { data: { reviewRequestId: "rr1", status: "RESOLVED" }, status: 200 };
    if (url.includes("/evaluation")) return { data: { answerId: "a1", finalScore: 3.2 }, status: 200 };
    return { data: detail, status: 200 };
  }),
}));

const { ReviewRequestDetail } = await import("./ReviewRequestDetail");

beforeEach(() => {
  detail = base();
});
afterEach(() => {
  calls.length = 0;
});

const posts = () => calls.filter((c) => c.method !== "GET");

describe("ReviewRequestDetail (R-32)", () => {
  it("üstte neden ve snapshot özeti; cevap kartında puan, kaynak, AI gerekçesi ve geri bildirim", async () => {
    renderWithProviders(<ReviewRequestDetail id="rr1" />);
    expect(await screen.findByText("Konuşma puanım düşük")).toBeInTheDocument();
    expect(calls[1].url).toBe(`/companies/${POOL}/review-requests/rr1`);
    expect(screen.getByText("40 / 60")).toBeInTheDocument();
    expect(screen.getByText("B1")).toBeInTheDocument();
    expect(screen.getByText("Speaking")).toBeInTheDocument();
    const card = screen.getByTestId("answer-card-a1");
    expect(within(card).getByText("Yazılı cevap metni")).toBeInTheDocument();
    expect(within(card).getByText(/6 \/ 10 puan/)).toBeInTheDocument();
    expect(within(card).getByText("AI · Merkez modeli")).toBeInTheDocument();
    expect(within(card).getByText("Rubriğe uygun")).toBeInTheDocument();
    expect(within(card).getByText("İyi")).toBeInTheDocument();
    // ses cevabı: oynatıcı mediaId üzerinden, metne çevirme düğmesi
    const audio = screen.getByTestId("answer-card-a2");
    expect(audio.querySelector("audio")?.getAttribute("src")).toBe(`/api/backend/companies/${POOL}/applications/app1/media/m1/content`);
    expect(within(audio).getByRole("button", { name: "Sesi metne çevir" })).toBeInTheDocument();
  });

  it("düzeltme yokken 'Düzeltmeleri yayınla' pasif, 'Puan değişmedi' etkin", async () => {
    renderWithProviders(<ReviewRequestDetail id="rr1" />);
    await screen.findByText("Konuşma puanım düşük");
    expect(screen.getByRole("button", { name: "Düzeltmeleri yayınla" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Puan değişmedi — sonuçlandır" })).toBeEnabled();
  });

  it("düzeltme varken 'Düzeltmeleri yayınla' etkin, 'Puan değişmedi' pasif; düzeltme izi madde altında", async () => {
    detail = { ...base(), corrections: [{ answerId: "a1", previousScore: 3, previousSource: "AI_ACCEPTED", correctedAt: "2026-11-02T10:00:00Z" }] };
    renderWithProviders(<ReviewRequestDetail id="rr1" />);
    await screen.findByText("Konuşma puanım düşük");
    expect(screen.getByRole("button", { name: "Düzeltmeleri yayınla" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Puan değişmedi — sonuçlandır" })).toBeDisabled();
    expect(within(screen.getByTestId("correction-trail-a1")).getByText(/önceki kaynak: AI/)).toBeInTheDocument();
  });

  it("not zorunlu: boş/boşluk notla sonuçlandırılamaz; notla uphold ucuna gider", async () => {
    renderWithProviders(<ReviewRequestDetail id="rr1" />);
    await screen.findByText("Konuşma puanım düşük");
    fireEvent.click(screen.getByRole("button", { name: "Puan değişmedi — sonuçlandır" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Aday notu/), { target: { value: "   " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sonuçlandır" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Not zorunlu");
    expect(posts()).toHaveLength(0);
    fireEvent.change(within(dialog).getByLabelText(/Aday notu/), { target: { value: "Puanlar doğru" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sonuçlandır" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({ url: `/companies/${POOL}/review-requests/rr1/uphold`, method: "POST", body: { note: "Puanlar doğru" } });
  });

  it("yayınlama penceresi görev metnini gösterir ve change ucuna not gönderir", async () => {
    detail = { ...base(), corrections: [{ answerId: "a1", previousScore: 3, previousSource: "AI_ACCEPTED" }] };
    renderWithProviders(<ReviewRequestDetail id="rr1" />);
    await screen.findByText("Konuşma puanım düşük");
    fireEvent.click(screen.getByRole("button", { name: "Düzeltmeleri yayınla" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Sonuç yeniden yayınlanır, aday yeni sonucu görür; varsa sertifika iptal edilir.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Yayınla" }));
    expect(posts()).toHaveLength(0);
    fireEvent.change(within(dialog).getByLabelText(/Aday notu/), { target: { value: "Puanınız güncellendi" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Yayınla" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({ url: `/companies/${POOL}/review-requests/rr1/change`, body: { note: "Puanınız güncellendi" } });
  });

  it("Puanı düzelt: gerekçe zorunlu; puan sınav ölçeğinde PUT edilir", async () => {
    renderWithProviders(<ReviewRequestDetail id="rr1" />);
    await screen.findByText("Konuşma puanım düşük");
    const card = screen.getByTestId("answer-card-a1");
    fireEvent.click(within(card).getByRole("button", { name: "Puanı düzelt" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Yeni puan/), { target: { value: "8" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Düzeltmeyi kaydet" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Gerekçe zorunlu");
    expect(posts()).toHaveLength(0);
    fireEvent.change(within(dialog).getByLabelText(/Gerekçe/), { target: { value: "Rubrik yeniden okundu" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Düzeltmeyi kaydet" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({
      url: `/companies/${POOL}/review-requests/rr1/answers/a1/evaluation`,
      method: "PUT",
      body: { finalScore: 8, rationale: "Rubrik yeniden okundu" },
    });
  });

  it("sınav puanını aşan düzeltme gönderilmez", async () => {
    renderWithProviders(<ReviewRequestDetail id="rr1" />);
    await screen.findByText("Konuşma puanım düşük");
    fireEvent.click(within(screen.getByTestId("answer-card-a1")).getByRole("button", { name: "Puanı düzelt" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Yeni puan/), { target: { value: "11" } });
    fireEvent.change(within(dialog).getByLabelText(/Gerekçe/), { target: { value: "x" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Düzeltmeyi kaydet" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Puan 0 ile 10 arasında olmalı");
    expect(posts()).toHaveLength(0);
  });

  it("sonuçlanmış talepte düzeltme/eylem düğmesi yok; yeni sonuç ve personel notu görünür", async () => {
    detail = {
      ...base(),
      status: "RESOLVED",
      outcome: "CHANGED",
      canCorrect: false,
      resolutionNote: "Konuşma puanı yükseltildi",
      resultingSnapshot: { snapshotId: "s2", active: true, totalScore: 45, examTotal: 60, cefrLevel: "B2", passed: true, sections: [] },
    };
    renderWithProviders(<ReviewRequestDetail id="rr1" />);
    expect(await screen.findByText("Yeni sonuç")).toBeInTheDocument();
    expect(screen.getByText("Konuşma puanı yükseltildi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Puanı düzelt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Düzeltmeleri yayınla" })).not.toBeInTheDocument();
  });

  it("Kanıt paketi sekmesi appeals/{id}/evidence ucunu yalnız sekme açılınca çağırır (salt okunur)", async () => {
    renderWithProviders(<ReviewRequestDetail id="rr1" />);
    await screen.findByText("Konuşma puanım düşük");
    expect(calls.some((c) => c.url.includes("/evidence"))).toBe(false);
    fireEvent.click(screen.getByRole("tab", { name: "Kanıt paketi" }));
    expect(await screen.findByTestId("evidence-panel")).toBeInTheDocument();
    expect(calls.some((c) => c.url === `/companies/${POOL}/appeals/ap1/evidence`)).toBe(true);
    expect(screen.getByText("START")).toBeInTheDocument();
    expect(within(screen.getByTestId("evidence-panel")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("itiraz dosyası yoksa Kanıt paketi sekmesi çizilmez", async () => {
    detail = { ...base(), appeal: null };
    renderWithProviders(<ReviewRequestDetail id="rr1" />);
    await screen.findByText("Konuşma puanım düşük");
    expect(screen.queryByRole("tab", { name: "Kanıt paketi" })).not.toBeInTheDocument();
  });
});
