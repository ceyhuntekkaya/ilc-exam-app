import { EntryDoor, EntryFrame } from "@/src/components/brand/entry-frame";

export default function HomePage() {
  return (
    <EntryFrame wide>
      <p className="mt-6 text-center text-[0.7rem] font-semibold tracking-[0.28em] text-[#333167]/70 uppercase">
        Sınav merkezi
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <EntryDoor href="/login" title="Personel girişi" detail="Kurum paneli, atama ve sonuçlar" tone="navy" />
        <EntryDoor href="/login/student" title="Öğrenci girişi" detail="Kullanıcı adınla sınava başla" tone="crimson" />
      </div>
    </EntryFrame>
  );
}
