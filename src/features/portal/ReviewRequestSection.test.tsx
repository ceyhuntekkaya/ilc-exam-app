import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";
import { toReviewStatusView } from "./reviewStatusModel";

const statusState = vi.fn();
const refetch = vi.fn();
const mutateAsync = vi.fn();
vi.mock("@/src/api/generated/candidate-portal-controller/candidate-portal-controller", () => ({
  useMyCertificate: () => ({ isLoading: false, isError: false, data: { data: { available: false } } }),
  useMyReviewRequest: () => statusState(),
  useOpenReviewRequest: () => ({ mutateAsync, isPending: false }),
}));

const { ReviewRequestSection } = await import("./CandidateCertificateSection");
const reply = (data: unknown) => ({ isLoading: false, isError: false, data: { data }, refetch });

describe("aday inceleme talebi durumu (R-32)", () => {
  it("talep yoksa R-19 talep açma kutusu görünür", () => {
    statusState.mockReturnValue(reply({ requested: false }));
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByRole("button", { name: "İnceleme talep et" })).toBeInTheDocument();
  });

  it("açık talep: 'İnceleniyor'; talep formu gösterilmez", () => {
    statusState.mockReturnValue(
      reply({ requested: true, status: "OPEN", message: "İnceleme talebiniz alındı, değerlendiriliyor", requestedAt: "2026-11-01T10:00:00Z" }),
    );
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByText("İnceleniyor")).toBeInTheDocument();
    expect(screen.getByText("İnceleme talebiniz alındı, değerlendiriliyor")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "İnceleme talep et" })).not.toBeInTheDocument();
  });

  it("sonuçlandı, puan değişmedi: durum metni + personel notu", () => {
    statusState.mockReturnValue(
      reply({ requested: true, status: "RESOLVED", outcome: "UPHELD", resolutionNote: "Puanlar yeniden okundu, doğru.", message: "İncelendi, puanınız değişmedi" }),
    );
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByText("Sonuçlandı: puan değişmedi")).toBeInTheDocument();
    expect(screen.getByText("Puanlar yeniden okundu, doğru.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "upheld");
  });

  it("puan güncellendi: durum metni + yeni sonucun gösterildiği bilgisi + personel notu", () => {
    statusState.mockReturnValue(
      reply({ requested: true, status: "RESOLVED", outcome: "CHANGED", resolutionNote: "Konuşma puanı yükseltildi.", message: "İncelendi, puanınız güncellendi" }),
    );
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByText("Puanınız güncellendi")).toBeInTheDocument();
    expect(screen.getByText(/Yeni sonucunuz bu sayfada gösterilir/)).toBeInTheDocument();
    expect(screen.getByText("Konuşma puanı yükseltildi.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "changed");
  });

  it("puan güncellendiyse yeni sonuca yeniden talep formu da gösterilir; gönderince durum yeniden çekilir", async () => {
    statusState.mockReturnValue(reply({ requested: true, status: "RESOLVED", outcome: "CHANGED", message: "İncelendi, puanınız güncellendi" }));
    mutateAsync.mockResolvedValue({ data: { requestedAt: "2026-11-09T10:00:00Z" } });
    const { default: userEvent } = await import("@testing-library/user-event");
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByText("Puanınız güncellendi")).toBeInTheDocument();
    expect(screen.getByText("Yeni sonuca yeniden inceleme talebi")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "İnceleme talep et" }));
    await user.type(screen.getByLabelText("Gerekçeniz"), "Konuşma puanını yeniden gözden geçirin lütfen.");
    await user.click(screen.getByRole("button", { name: "Talebi gönder" }));
    expect(mutateAsync).toHaveBeenCalledWith({ applicationResultId: "ar1", data: { reason: "Konuşma puanını yeniden gözden geçirin lütfen." } });
    expect(refetch).toHaveBeenCalled();
  });

  it("puan değişmedi sonrasında yeniden talep formu YOKTUR", () => {
    statusState.mockReturnValue(reply({ requested: true, status: "RESOLVED", outcome: "UPHELD" }));
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.queryByRole("button", { name: "İnceleme talep et" })).not.toBeInTheDocument();
  });

  it("durum ucu hata verirse talep açma kutusu yine açılır", () => {
    statusState.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByRole("button", { name: "İnceleme talep et" })).toBeInTheDocument();
  });

  it("toReviewStatusView: backend metni yoksa varsayılan Türkçe metin", () => {
    expect(toReviewStatusView({ requested: true, status: "OPEN" })).toMatchObject({ kind: "open", title: "İnceleniyor" });
    expect(toReviewStatusView({ requested: true, status: "RESOLVED", outcome: "CHANGED" })).toMatchObject({ kind: "changed", body: "İncelendi, puanınız güncellendi" });
    expect(toReviewStatusView({ requested: true, status: "RESOLVED", outcome: "UPHELD", resolutionNote: "  " })).toMatchObject({ kind: "upheld", note: null });
    expect(toReviewStatusView({ requested: false })).toEqual({ kind: "none" });
  });
});
