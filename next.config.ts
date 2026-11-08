import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

function loadIlcEnv() {
  const candidates = [
    resolve(process.cwd(), "../ilc.env"),
    resolve(process.cwd(), "../ilc-parent/ilc.env"),
    resolve(process.cwd(), "ilc.env"),
    resolve(process.cwd(), ".env.local"),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      loadEnv({ path: file, override: false });
    }
  }
}

loadIlcEnv();

const apiPublicUrl =
  process.env.API_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api";

process.env.NEXT_PUBLIC_API_URL = apiPublicUrl;

const nextConfig: NextConfig = {
  output: "standalone",
  // B-44: `page.dev.tsx` dosyaları (hat-prototype, media-art-check) yalnız `next dev`te rota olur;
  // production derlemesinde hiç derlenmez/gönderilmez.
  pageExtensions:
    process.env.NODE_ENV === "production"
      ? ["tsx", "ts", "jsx", "js"]
      : ["tsx", "ts", "jsx", "js", "dev.tsx"],
  // Dev'de sol alttaki "N" göstergesi panel sidebar'ının altını kapatıyordu. Derleme/çalışma hataları
  // yine tam ekran overlay olarak gösterilir; production'da gösterge zaten yoktur.
  devIndicators: false,
  // Dev: aynı ağdaki tablet/telefon IP ile açabilsin (Next 16 aksi hâlde dev JS isteklerini engeller, sayfa çalışmaz).
  // Yalnız `next dev`i etkiler; production'a etkisi yok.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  env: {
    NEXT_PUBLIC_API_URL: apiPublicUrl,
  },
  // F3-01: service worker /sw.js'te (kök) — scope zaten "/" ama bu başlık açıkça garanti eder.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      // F5-07: doğrulama sayfası kimlik doğrulamasız, herkese açık — arama motoru dizine
      // almasın (başlık + page.tsx'teki metadata.robots, ikisi birden).
      {
        source: "/verify/:code",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
