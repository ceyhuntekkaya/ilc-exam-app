import { getClientAccessToken } from "@/src/api/mutator";

/**
 * F5-05: karne PDF'i artık sunucuda üretiliyor (jsPDF kaldırıldı) — bu, ikili (binary) bir
 * dosya indirdiği için `customInstance` (gövdeyi her zaman JSON/metin olarak okur) KULLANILMAZ,
 * `fetch` doğrudan `blob()` ile okunur. Kimlik doğrulama `mediaSrc`/`catalogSrc` ile AYNI yol:
 * `/api/backend` aynı-kökenli BFF proxy'si, tarayıcı çerezleri otomatik gider; bellek-içi
 * istemci token'ı (varsa) `customInstance`'ın yaptığı gibi ek olarak eklenir.
 */
export async function fetchPdf(url: string): Promise<Blob> {
  const token = getClientAccessToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let message = response.statusText || "PDF indirilemedi";
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // gövde JSON değilse durum metni yeterli
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.blob();
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Bir şube+sınav için birleştirilmiş toplu karne PDF'i — {@code ReportController.reportCardsPdf}. */
export async function downloadReportCardsPdf(companyId: string, params: {
  instituteId: string;
  academicYearId: string;
  examVersionId: string;
  branchId: string;
}): Promise<void> {
  // Pilot düzeltmesi: dil verilmezse sunucu karneyi İngilizce basıyordu (personel ekranı Türkçe).
  const query = new URLSearchParams({ ...params, locale: "tr" });
  let blob: Blob;
  try {
    blob = await fetchPdf(`/api/backend/report/companies/${companyId}/report-cards/pdf?${query.toString()}`);
  } catch (error) {
    // Sunucu, kapsamda puanlanmış (sonuç kaydı oluşmuş) hiç başvuru yoksa 404 döner; gövde
    // Spring'in `detail` alanında gelir ve fetchPdf yalnız `error` okuduğundan "Not Found" görünürdü.
    if ((error as { status?: number }).status === 404) {
      throw new Error(
        "Bu şube için puanlanmış karne yok. Sınavı bitiren öğrencilerin sonucu henüz hesaplanmamış; sonuçlar puanlandıktan sonra tekrar deneyin.",
      );
    }
    throw error;
  }
  triggerDownload(blob, "karneler.pdf");
}

/** Tek bir sonucun karne PDF'i — personel görünümü ({@code ReportController.staffReportPdf}). */
export async function downloadStaffReportPdf(companyId: string, applicationResultId: string): Promise<void> {
  const blob = await fetchPdf(`/api/backend/report/companies/${companyId}/results/${applicationResultId}/pdf?locale=tr`);
  triggerDownload(blob, `karne-${applicationResultId}.pdf`);
}

/** Adayın kendi karne PDF'i — {@code ReportController.myReportCardPdf} ({@code applicationId} ile). */
export async function downloadMyReportCardPdf(applicationId: string): Promise<void> {
  const blob = await fetchPdf(`/api/backend/report/me/applications/${applicationId}/report-card/pdf`);
  triggerDownload(blob, `karne-${applicationId}.pdf`);
}
