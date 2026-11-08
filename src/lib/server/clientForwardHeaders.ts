/**
 * R-04 (B-07): BFF → backend isteğinde istemci kimliğini taşıyan başlıklar.
 *
 * Backend hız sınırlarını ve bütünlük kaydındaki IP'yi `getRemoteAddr()` ile alır. BFF doğrudan
 * bağlandığı için backend yalnız BFF konteynerinin adresini görürdü (tüm kullanıcılar tek kova).
 * `X-Forwarded-For` burada **aynen iletilir**, BFF kendisi IP üretmez ya da başlığa ekleme yapmaz:
 * güvenilirlik kararı backend'dedir (yalnız güvenilir proxy listesindeki adresten gelen başlık
 * işlenir, bkz. ilc-parent docs/nginx-proxy.md). nginx `X-Forwarded-For`'u `$remote_addr` ile
 * EZMELİDİR; böylece istemci sahte değer ekleyemez.
 */

const MAX_UA_LENGTH = 512;
/** Sağdan alınacak en fazla X-Forwarded-For girdisi ve tek girdi uzunluğu (IPv6 en çok 45). */
const MAX_XFF_ENTRIES = 10;
const MAX_XFF_ENTRY_LENGTH = 64;

export type ClientForwardHeaders = Partial<
  Record<"x-forwarded-for" | "x-forwarded-proto" | "user-agent", string>
>;

/** Kontrol karakterlerini SİLER (başlığı düşürmez: düşerse istek BFF IP'sinin ortak kovasına girerdi). */
function stripControl(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, "");
}

function cleanSimple(value: string | null, max: number): string | undefined {
  if (!value) return undefined;
  const cleaned = stripControl(value).trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
}

/**
 * X-Forwarded-For: virgülle ayrılmış girdiler. nginx gerçek istemciyi SAĞA ekler/yazar; backend sağdan
 * sola okur. Bu yüzden aşırı uzun başlık SOLDAN kısaltılır (en sağdaki girdiler korunur) — soldan almak
 * nginx'in yazdığı girdiyi atıp sağı istemcinin kontrolüne bırakırdı.
 */
function cleanForwardedFor(value: string | null): string | undefined {
  if (!value) return undefined;
  const entries = value
    .split(",")
    .map((entry) => stripControl(entry).trim())
    .filter((entry) => entry.length > 0 && entry.length <= MAX_XFF_ENTRY_LENGTH);
  if (entries.length === 0) return undefined;
  return entries.slice(-MAX_XFF_ENTRIES).join(", ");
}

export function clientForwardHeaders(incoming: Headers): ClientForwardHeaders {
  const out: ClientForwardHeaders = {};
  const forwardedFor = cleanForwardedFor(incoming.get("x-forwarded-for"));
  if (forwardedFor) out["x-forwarded-for"] = forwardedFor;
  const proto = cleanSimple(incoming.get("x-forwarded-proto"), 16);
  if (proto) out["x-forwarded-proto"] = proto;
  const userAgent = cleanSimple(incoming.get("user-agent"), MAX_UA_LENGTH);
  if (userAgent) out["user-agent"] = userAgent;
  return out;
}
