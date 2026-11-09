import type { Metadata } from "next";
import { StudentShell } from "@/src/components/layouts/student-shell";

export const metadata: Metadata = { title: "Ürünler ve siparişler", robots: { index: false, follow: false } };

/** Bireysel aday mağazası: öğrenci kabuğunu kullanır; oturum `proxy.ts`te /shop için STUDENT ister. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
