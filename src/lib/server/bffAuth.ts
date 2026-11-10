/**
 * BFF proxy'sinin (app/api/backend) oturum kararları. Saf fonksiyonlar; route bunları çağırır.
 *
 * Sorun (2026-11-10): tarayıcıdaki erişim çerezi geçersiz hale gelirse (ör. JWT anahtarı döndürüldü) proxy onu
 * giriş isteği dahil her isteğe ekliyordu; backend imzası tutmayan token'ı uçtan bağımsız 401 ile kestiği için
 * kullanıcı yeniden giriş yapamıyordu. Çerez httpOnly olduğundan localStorage temizliği de işe yaramıyordu.
 */

/** Kimlik doğrulamasız auth uçları (backend SecurityConfig permitAll ile aynı liste): bunlara token eklenmez. */
const PUBLIC_AUTH_PATHS = new Set([
  "auth/login",
  "auth/student-login",
  "auth/refresh",
  "auth/forgot-password",
  "auth/reset-password",
]);

export function isPublicAuthPath(targetPath: string, method: string): boolean {
  const path = targetPath.replace(/^\/+|\/+$/g, "");
  return method.toUpperCase() === "POST" && PUBLIC_AUTH_PATHS.has(path);
}

/**
 * Backend token'ı artık kabul etmiyor mu? RFC 6750 §3.1 `WWW-Authenticate: Bearer error="invalid_token"`
 * (JwtAuthenticationFilter). Öyleyse oturum çerezleri silinir; sonraki istek temiz başlar.
 */
export function isInvalidTokenResponse(status: number, wwwAuthenticate: string | null): boolean {
  return status === 401 && wwwAuthenticate != null && /error="?invalid_token"?/i.test(wwwAuthenticate);
}
