import { customInstance } from "@/src/api/mutator";
import type { ReadinessReport } from "@/src/features/certificate/certificateGateModel";

/**
 * `GET /policy/calibration-readiness` — üretilmiş istemci bu ucu yanlış tiple (AI `Evaluation`) üretiyor (iki kayıt aynı basit
 * adı taşıyor); doğru yanıt şekli için elle tipli çağrı. Backend `@Schema` ile ayrılınca bu dosya silinebilir.
 */
export async function getCalibrationReadiness(
  params: { examVersionId?: string; formId?: string },
  request?: { headers?: Record<string, string> },
): Promise<ReadinessReport> {
  const qs = new URLSearchParams();
  if (params.examVersionId) qs.set("examVersionId", params.examVersionId);
  if (params.formId) qs.set("formId", params.formId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await customInstance<{ data: ReadinessReport }>(`/policy/calibration-readiness${suffix}`, { headers: request?.headers });
  return res.data;
}
