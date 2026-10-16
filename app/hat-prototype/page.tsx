import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HatPrototype } from "@/src/features/hat-prototype/hat-prototype";

export const metadata: Metadata = {
  title: "HAT · Öğrenci prototipi",
  robots: { index: false, follow: false },
};

export default function HatPrototypePage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_HAT_PROTOTYPE !== "1") notFound();
  return <HatPrototype />;
}
