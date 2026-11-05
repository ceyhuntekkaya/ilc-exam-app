import { authoringFetch } from "@/src/features/authoring/shared/api";

/** `CttService.ItemReport` / `PsychometricEngine.ItemResult` ile aynı alanlar (F4-02 Adım 2/4). */
export type OptionStat = {
  count: number;
  proportion: number;
  pointBiserial: number;
};

export type ItemStats = {
  n: number;
  pValue: number;
  discrimination: number;
  stdDev: number;
  /** Anahtarları `optionId`; cevapsız kalanlar backend'de `"_NO_ANSWER"` ile toplanır. */
  distractors: Record<string, OptionStat>;
};

export type ItemHealthWarning = "TOO_EASY" | "TOO_HARD" | "LOW_DISCRIMINATION" | "ANSWER_KEY_SUSPICION";

export type ItemHealthReport = {
  sufficientData: boolean;
  warnings: ItemHealthWarning[];
};

export type ItemReport = {
  stats: ItemStats;
  health: ItemHealthReport;
};

/** `CttService.AlphaReport` — `alpha` burada `null`, bkz. {@link parseReliabilityBody}. */
export type ReliabilityReport = {
  alpha: number | null;
  nItems: number;
  nExaminees: number;
};

/**
 * Backend `AlphaReport.alpha` madde/örneklem yetersizse Java `Double.NaN` döner ve varsayılan
 * Jackson 3 ayarıyla gövdeye tırnaksız `NaN` yazılır — standart JSON değil, `JSON.parse`/`Response.json()`
 * bunu kabul etmez ve fırlatır. Backend dondu (F4-02 Adım 1-4, bu oturum dokunmuyor); sayısal
 * `NaN` belirtecini `null`'a çevirip ayrıştırmak bu oturumun uyum kararı — `null` burada "alpha
 * hesaplanamadı" anlamına gelir, UI bunu "yetersiz veri" olarak gösterir.
 */
export function parseReliabilityBody(text: string): ReliabilityReport {
  const sanitized = text.replace(/:\s*NaN\s*(?=[,}])/g, ":null");
  return JSON.parse(sanitized) as ReliabilityReport;
}

async function fetchReliability(formId: string): Promise<ReliabilityReport> {
  const res = await fetch(`/api/backend/psychometrics/ctt/forms/${formId}/reliability`, {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText || "İstek başarısız";
    try {
      const body = JSON.parse(text) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // gövde JSON değilse statusText'e düşülür.
    }
    throw new Error(message);
  }
  return parseReliabilityBody(text);
}

export const psychometricsApi = {
  itemReport: (questionVersionId: string) =>
    authoringFetch<ItemReport>(`/psychometrics/ctt/items/${questionVersionId}`),
  reliability: fetchReliability,
};
