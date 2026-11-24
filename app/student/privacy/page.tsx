import { ErasureSelfService } from "@/src/features/student/ErasureSelfService";
import { KidButtonLink } from "@/src/features/student/ui";

export default function StudentPrivacyPage() {
  return (
    <div lang="en" className="grid gap-5">
      <header className="grid gap-3">
        <nav aria-label="Navigation" className="flex flex-wrap gap-2">
          <KidButtonLink href="/student" variant="ghost">
            Home
          </KidButtonLink>
        </nav>
        <h1 className="sb-display text-3xl leading-tight tracking-tight text-slate-900 sm:text-4xl">My data and privacy</h1>
      </header>
      <ErasureSelfService />
    </div>
  );
}
