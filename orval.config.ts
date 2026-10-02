import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "orval";

function resolveApiUrl(): string {
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
  return (
    process.env.API_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080/api"
  ).replace(/\/$/, "");
}

const apiUrl = resolveApiUrl();
const localSpec = resolve(process.cwd(), "openapi/openapi.json");
const inputTarget = existsSync(localSpec) ? localSpec : `${apiUrl}/v3/api-docs`;

export default defineConfig({
  ilc: {
    input: {
      target: inputTarget,
    },
    output: {
      mode: "tags-split",
      target: "./src/api/generated/endpoints.ts",
      schemas: "./src/api/generated/models",
      client: "react-query",
      override: {
        mutator: {
          path: "./src/api/mutator.ts",
          name: "customInstance",
        },
      },
    },
  },
});
