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

const MAX_HEADER_LENGTH = 512;

export type ClientForwardHeaders = Partial<
  Record<"x-forwarded-for" | "x-forwarded-proto" | "user-agent", string>
>;

function clean(value: string | null): string | undefined {
  if (!value) return undefined;
  // Başlık enjeksiyonuna karşı satır sonu / kontrol karakteri taşıyan değer iletilmez.
  if (/[\u0000-\u001f\u007f]/.test(value)) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_HEADER_LENGTH);
}

export function clientForwardHeaders(incoming: Headers): ClientForwardHeaders {
  const out: ClientForwardHeaders = {};
  const forwardedFor = clean(incoming.get("x-forwarded-for"));
  if (forwardedFor) out["x-forwarded-for"] = forwardedFor;
  const proto = clean(incoming.get("x-forwarded-proto"));
  if (proto) out["x-forwarded-proto"] = proto;
  const userAgent = clean(incoming.get("user-agent"));
  if (userAgent) out["user-agent"] = userAgent;
  return out;
}
