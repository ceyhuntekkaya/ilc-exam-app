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
  env: {
    NEXT_PUBLIC_API_URL: apiPublicUrl,
  },
};

export default nextConfig;
