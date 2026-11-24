import { EntryDoor, EntryFrame } from "@/src/components/brand/entry-frame";

export default function HomePage() {
  return (
    <EntryFrame wide lang="en">
      <p className="mt-6 text-center text-[0.7rem] font-semibold tracking-[0.28em] text-[#333167]/70 uppercase">
        Exam center
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <EntryDoor href="/login" title="Staff login" detail="Institution panel, assignments and results" tone="navy" />
        <EntryDoor href="/login/student" title="Student login" detail="Start your exam with your username" tone="crimson" />
      </div>
    </EntryFrame>
  );
}
