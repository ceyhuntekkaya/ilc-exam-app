import { fetchPdf, triggerDownload } from "@/src/features/results/downloadReportCardsPdf";
import { myLevelReportPath, staffLevelReportPath } from "./levelReportModel";

/** R-20: adayın kendi seviye raporu (saklanan PDF; her indirmede aynı dosya). `serverPath` portal `levelReportUrl`'dir. */
export async function downloadMyLevelReport(applicationResultId: string, serverPath?: string | null): Promise<void> {
  const blob = await fetchPdf(myLevelReportPath(applicationResultId, serverPath));
  triggerDownload(blob, `seviye-raporu-${applicationResultId}.pdf`);
}

/** R-20: personel — kendi kurumunun sonucunun seviye raporu (denetim kaydı sunucuda yazılır). */
export async function downloadStaffLevelReport(companyId: string, applicationResultId: string): Promise<void> {
  const blob = await fetchPdf(staffLevelReportPath(companyId, applicationResultId));
  triggerDownload(blob, `seviye-raporu-${applicationResultId}.pdf`);
}
