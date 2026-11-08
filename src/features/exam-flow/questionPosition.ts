/**
 * R-06 (B-13): sunucuya bildirilen "şu an hangi sorudayım" kimliği.
 *
 * Sunucu (`ExamFlowService.requireKnownItem`) kâğıttaki bir `question_part.id` bekler. Önceden burada
 * `item.examQuestionId` (QuestionVersion kimliği — başka bir kimlik uzayı) gönderiliyordu: her çağrı reddediliyor,
 * istemci hatayı yutuyordu. Sonuç: `QUESTION_VIEWED` hiç yazılmadı, OMITTED/NOT_REACHED ayrımı ve IRT girdisi bozuldu.
 *
 * Çok parçalı bir soruda TEK bir parça kimliği gönderilir (ilki); sunucu aynı sorunun diğer parçalarını da
 * "görüldü" sayar.
 */

export type PositionItem = {
  examQuestionId?: string;
  question: { parts?: ReadonlyArray<{ id?: string | null }> };
};

/** Konum bildiriminde kullanılacak kimlik: sorunun ilk parçasının `question_part.id`'si. Parçası yoksa `null`. */
export function positionIdOf(item: PositionItem | undefined | null): string | null {
  const first = item?.question.parts?.find((part) => typeof part.id === "string" && part.id.length > 0);
  return first?.id ?? null;
}

/**
 * Kaldığı soruyu bulurken: sunucunun döndürdüğü `currentItemId` bir parça kimliğidir (konum bildirimiyle yazılan).
 * Eski/başka kaynaktan gelen `examQuestionId` değeri de eşleşir.
 */
export function itemMatchesPosition(item: PositionItem, positionId: string | null | undefined): boolean {
  if (!positionId) return false;
  if (item.examQuestionId === positionId) return true;
  return (item.question.parts ?? []).some((part) => part.id === positionId);
}

export type PositionFailureStats = {
  failures: number;
  lastStatus: number | null;
  lastMessage: string | null;
};

const stats: PositionFailureStats = { failures: 0, lastStatus: null, lastMessage: null };

/** Test ve destek için: şimdiye kadarki konum bildirimi hataları. */
export function getPositionFailureStats(): Readonly<PositionFailureStats> {
  return { ...stats };
}

export function resetPositionFailureStats() {
  stats.failures = 0;
  stats.lastStatus = null;
  stats.lastMessage = null;
}

/**
 * Konum bildirimi başarısızlığı SESSİZ geçmez: sayılır ve konsola yapılandırılmış bir satır yazılır. Sınav akışını
 * KESMEZ (öğrenci sınava devam eder); ama aynı sınıftan bir uyumsuzluk bir daha fark edilmeden geçemez.
 * Sunucu da reddi ayrıca loglar ve sayar (`exam.position.rejected`).
 */
export function reportPositionFailure(err: unknown, context: { sectionId: string; itemId: string }) {
  const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : null;
  const message = err instanceof Error ? err.message : String(err);
  stats.failures += 1;
  stats.lastStatus = status;
  stats.lastMessage = message;
  console.error("[exam-flow] position report failed", { ...context, status, message, failures: stats.failures });
}

/**
 * Sorunun konumunu bildirir. Parçası olmayan soruda hiçbir şey göndermez (null döner). Hata fırlatmaz; başarısızlık
 * {@link reportPositionFailure} ile sayılır.
 */
export function sendQuestionPosition(
  put: (applicationId: string, token: string, sectionId: string, itemId: string) => Promise<unknown>,
  session: { applicationId: string; sessionToken: string },
  sectionId: string,
  item: PositionItem | undefined | null,
): Promise<void> | null {
  const itemId = positionIdOf(item);
  if (!itemId) return null;
  return put(session.applicationId, session.sessionToken, sectionId, itemId).then(
    () => undefined,
    (err: unknown) => reportPositionFailure(err, { sectionId, itemId }),
  );
}
