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
    expect(screen.getByRole("button", { name: "Request a review" })).toBeInTheDocument();
  });

  it("açık talep: 'İnceleniyor'; talep formu gösterilmez", () => {
    statusState.mockReturnValue(
      reply({ requested: true, status: "OPEN", message: "Your review request was received and is being assessed", requestedAt: "2026-11-01T10:00:00Z" }),
    );
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByText("Under review")).toBeInTheDocument();
    expect(screen.getByText("Your review request was received and is being assessed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request a review" })).not.toBeInTheDocument();
  });

  it("sonuçlandı, puan değişmedi: durum metni + personel notu", () => {
    statusState.mockReturnValue(
      reply({ requested: true, status: "RESOLVED", outcome: "UPHELD", resolutionNote: "Puanlar yeniden okundu, doğru.", message: "İncelendi, puanınız değişmedi" }),
    );
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByText("Resolved: score unchanged")).toBeInTheDocument();
    expect(screen.getByText("Puanlar yeniden okundu, doğru.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "upheld");
  });

  it("puan güncellendi: durum metni + yeni sonucun gösterildiği bilgisi + personel notu", () => {
    statusState.mockReturnValue(
      reply({ requested: true, status: "RESOLVED", outcome: "CHANGED", resolutionNote: "Konuşma puanı yükseltildi.", message: "İncelendi, puanınız güncellendi" }),
    );
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByText("Your score was updated")).toBeInTheDocument();
    expect(screen.getByText(/Your new result is shown on this page/)).toBeInTheDocument();
    expect(screen.getByText("Konuşma puanı yükseltildi.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "changed");
  });

  it("puan güncellendiyse yeni sonuca yeniden talep formu da gösterilir; gönderince durum yeniden çekilir", async () => {
    statusState.mockReturnValue(reply({ requested: true, status: "RESOLVED", outcome: "CHANGED", message: "İncelendi, puanınız güncellendi" }));
    mutateAsync.mockResolvedValue({ data: { requestedAt: "2026-11-09T10:00:00Z" } });
    const { default: userEvent } = await import("@testing-library/user-event");
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByText("Your score was updated")).toBeInTheDocument();
    expect(screen.getByText("Request a review of the new result")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Request a review" }));
    await user.type(screen.getByLabelText("Your reason"), "Konuşma puanını yeniden gözden geçirin lütfen.");
    await user.click(screen.getByRole("button", { name: "Send request" }));
    expect(mutateAsync).toHaveBeenCalledWith({ applicationResultId: "ar1", data: { reason: "Konuşma puanını yeniden gözden geçirin lütfen." } });
    expect(refetch).toHaveBeenCalled();
  });

  it("puan değişmedi sonrasında yeniden talep formu YOKTUR", () => {
    statusState.mockReturnValue(reply({ requested: true, status: "RESOLVED", outcome: "UPHELD" }));
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.queryByRole("button", { name: "Request a review" })).not.toBeInTheDocument();
  });

  it("durum ucu hata verirse talep açma kutusu yine açılır", () => {
    statusState.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    renderWithProviders(<ReviewRequestSection applicationResultId="ar1" />);
    expect(screen.getByRole("button", { name: "Request a review" })).toBeInTheDocument();
  });

  it("toReviewStatusView: backend metni yoksa varsayılan Türkçe metin", () => {
    expect(toReviewStatusView({ requested: true, status: "OPEN" })).toMatchObject({ kind: "open", title: "Under review" });
    expect(toReviewStatusView({ requested: true, status: "RESOLVED", outcome: "CHANGED" })).toMatchObject({ kind: "changed", body: "Reviewed — your score was updated" });
    expect(toReviewStatusView({ requested: true, status: "RESOLVED", outcome: "UPHELD", resolutionNote: "  " })).toMatchObject({ kind: "upheld", note: null });
    expect(toReviewStatusView({ requested: false })).toEqual({ kind: "none" });
  });
});
