/**
 * Bireysel havuz kurum kimliği (backend `IndividualOrg.COMPANY_ID`, V189 seed).
 *
 * GEÇİCİ İSTEMCİ SABİTİ: R-30 görev dosyası "havuzun kurum kimliği backend'den gelir, istemcide sabit yazılmaz"
 * der; ama R-28/R-29'un OpenAPI'sinde bu kimliği veren bir uç/alan YOK (kurum listesi `individual_pool=false` süzer,
 * insan kuyruğu ucu kimliği path'te ister). Backend'e küçük bir uç eklenene kadar (ör. `GET /grading/individual-pool`
 * → `{companyId}`) kimlik yalnız burada tutulur; başka yerde yazılmaz.
 */
export const INDIVIDUAL_POOL_COMPANY_ID = "a0000000-0000-7000-8000-000000000020";
