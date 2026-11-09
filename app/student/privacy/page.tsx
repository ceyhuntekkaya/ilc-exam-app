import { ErasureSelfService } from "@/src/features/student/ErasureSelfService";
import { KidButtonLink } from "@/src/features/student/ui";

export default function StudentPrivacyPage() {
  return (
    <div lang="tr" className="grid gap-5">
      <header className="grid gap-3">
        <nav aria-label="Gezinme" className="flex flex-wrap gap-2">
          <KidButtonLink href="/student" variant="ghost">
            Ana sayfa
          </KidButtonLink>
        </nav>
        <h1 className="sb-display text-3xl leading-tight tracking-tight text-slate-900 sm:text-4xl">Verilerim ve gizlilik</h1>
      </header>
      <ErasureSelfService />
    </div>
  );
}
