import { cn } from "@/src/lib/utils/cn";
import { IconCheck } from "@/src/ui/icons";
import Image from "next/image";

/** Medya görevinin resmi (dinle / izle / kaydet). Kaynak `docs/avatar`; 160px (≤64px gösterim) ve 256px. Zemin beyaz. */
export type MediaArtKind = "listen" | "watch" | "record";

/** `done`: hak bitti — resim soluklaşır, ortasında onay işareti. */
export function MediaArt({ kind, px, done = false, className }: { kind: MediaArtKind; px: number; done?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("relative block shrink-0 overflow-hidden bg-white", className)} style={{ width: px, height: px }}>
      <Image
        src={`/student/media/${kind}-${px <= 64 ? 160 : 256}.webp`}
        alt=""
        fill
        sizes={`${px}px`}
        unoptimized
        className={cn("object-cover", done && "opacity-45 grayscale")}
      />
      {done ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-7 place-items-center rounded-full bg-exam-ok text-white shadow-sm">
            <IconCheck className="size-4" strokeWidth={3} />
          </span>
        </span>
      ) : null}
    </span>
  );
}
