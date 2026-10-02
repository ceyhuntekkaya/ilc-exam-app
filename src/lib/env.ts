export function getApiBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_PUBLIC_URL ||
    "http://localhost:8080/api";
  return url.replace(/\/$/, "");
}
