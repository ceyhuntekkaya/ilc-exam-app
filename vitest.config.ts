import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig.json'daki "@/*": ["./*"] ile AYNI eşleme — Next.js kendi bundler'ında bunu
  // otomatik okur, vitest/vite okumaz, elle verilmesi gerekiyor.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
