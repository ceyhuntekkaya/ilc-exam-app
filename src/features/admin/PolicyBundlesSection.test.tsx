import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BundleDto } from "@/src/api/generated/models";

const updateMock = vi.fn();

vi.mock("@/src/api/generated/policy-bundles/policy-bundles", () => ({
  useList2: () => ({ data: { data: [] }, isLoading: false, isError: false }),
  useUpdate1: () => ({ mutateAsync: updateMock, isPending: false }),
  useCreate1: () => ({ mutateAsync: vi.fn(), isPending: false }),
  getList2QueryKey: () => ["/policy-bundles"],
}));

const { BundleEditor } = await import("./PolicyBundlesSection");

const VALUES: Record<string, string> = {
  SCORING_MODE: "PARTIAL_PROPORTIONAL",
  PENALTY: "true",
  OPEN_RESPONSE_GRADING_PATH: "AI_WITH_HUMAN_REVIEW",
  CERTIFICATE_ENABLED: "false",
  ATTEMPT_CONSUMPTION: "true",
  CUT_SCORE_SOURCE: "EXAM_DEFAULT",
  CALIBRATION_INCLUSION: "true",
  COMPANY_POOL_ACCESS: "true",
  ANCHOR_ACCESS: "true",
  MIN_INTEGRITY_LEVEL: "NONE",
  RESULT_VISIBILITY: "AFTER_GRADING",
  ANSWER_KEY_VISIBILITY: "NEVER",
  RETAKE_POLICY: "UNRESTRICTED",
  FEEDBACK_DEPTH: "SUMMARY",
  SUPPORTED_BROWSER_CLASS: "TAM",
};

const PLACEMENT: BundleDto = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  examPurpose: "PLACEMENT",
  values: VALUES,
  companyEditableFields: ["FEEDBACK_DEPTH"],
  certificateLocked: false,
};

const CERTIFICATION: BundleDto = {
  id: "bbbbbbbb-0000-0000-0000-000000000002",
  examPurpose: "CERTIFICATION",
  values: { ...VALUES, PENALTY: "false", CERTIFICATE_ENABLED: "true", MIN_INTEGRITY_LEVEL: "PARTNER_PROCTORED" },
  companyEditableFields: [],
  certificateLocked: true,
};

describe("BundleEditor", () => {
  afterEach(() => updateMock.mockReset());

  it("değişen boolean/enum/metin alanlarını string olarak PUT eder", async () => {
    updateMock.mockResolvedValue({ data: PLACEMENT });
    renderWithProviders(<BundleEditor bundle={PLACEMENT} />);

    expect(screen.getByRole("button", { name: "Kaydet" })).toBeDisabled();

    fireEvent.click(screen.getAllByLabelText(/^Ceza puanlaması/)[0]);
    fireEvent.change(screen.getByRole("combobox", { name: "Puanlama modu" }), { target: { value: "ALL_OR_NOTHING" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Geri bildirim derinliği" }), { target: { value: "DETAILED" } });
    const editable = within(screen.getByRole("group", { name: /Kurumun değiştirebileceği/ }));
    fireEvent.click(editable.getByLabelText("Puanlama modu"));

    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const call = updateMock.mock.calls[0][0] as { id: string; data: { values: Record<string, string>; companyEditableFields: string[] } };
    expect(call.id).toBe(PLACEMENT.id);
    expect(call.data.values).toMatchObject({
      PENALTY: "false",
      SCORING_MODE: "ALL_OR_NOTHING",
      FEEDBACK_DEPTH: "DETAILED",
      CERTIFICATE_ENABLED: "false",
    });
    expect(call.data.companyEditableFields).toEqual(["SCORING_MODE", "FEEDBACK_DEPTH"]);
  });

  it("400 hatasında backend `error` metnini gösterir", async () => {
    updateMock.mockRejectedValue(new Error("SCORING_MODE geçersiz: X"));
    renderWithProviders(<BundleEditor bundle={PLACEMENT} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Geri bildirim derinliği" }), { target: { value: "DETAILED" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("SCORING_MODE geçersiz: X");
  });

  it("boş alanı göndermeden önce uyarır", async () => {
    renderWithProviders(<BundleEditor bundle={PLACEMENT} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Geri bildirim derinliği" }), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Boş bırakılamaz: Geri bildirim derinliği");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("CERTIFICATION demetinde bilgi bandı çıkar, CERTIFICATE_ENABLED ve PENALTY kilitlenir", () => {
    renderWithProviders(<BundleEditor bundle={CERTIFICATION} />);
    expect(screen.getByRole("note")).toHaveTextContent(/iki akademik onay/);
    const [penalty] = screen.getAllByLabelText(/^Ceza puanlaması/);
    const [gate] = screen.getAllByLabelText(/^Sertifika kapısı açık/);
    expect(penalty).toBeDisabled();
    expect(gate).toBeDisabled();
    expect(gate).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Puanlama modu" })).toBeEnabled();
  });

  it("diğer tiplerde banner yoktur ve alanlar açıktır", () => {
    renderWithProviders(<BundleEditor bundle={PLACEMENT} />);
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getAllByLabelText(/^Ceza puanlaması/)[0]).toBeEnabled();
  });
});
