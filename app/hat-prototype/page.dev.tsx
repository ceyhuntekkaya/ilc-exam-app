import type { Metadata } from "next";
import { HatPrototype } from "@/src/features/hat-prototype/hat-prototype";

// Yalnız `next dev`: next.config.ts `pageExtensions` "dev.tsx"i production build'de dışlar (B-44).
export const metadata: Metadata = {
  title: "HAT · Öğrenci prototipi",
  robots: { index: false, follow: false },
};

export default function HatPrototypePage() {
  return <HatPrototype />;
}
