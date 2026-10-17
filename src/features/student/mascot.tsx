import { cn } from "@/src/lib/utils/cn";
import Image from "next/image";

/**
 * Maskot duyguları. Kaynak görseller `docs/avatar`; `public/student/avatar` altında kırpılmış WebP olarak durur:
 * her duygu için 160px (≤80px gösterim) ve 384px (≤192px gösterim). `welcome` öğrenciyle birlikte bir sahne, yalnız 480px.
 */
export type MascotMood = "hello" | "thinking" | "waiting" | "thumbsUp" | "celebrate" | "break";

const FILE: Record<MascotMood, string> = {
  break: "break",
  hello: "hello",
  thinking: "thinking",
  waiting: "waiting",
  thumbsUp: "thumbs-up",
  celebrate: "celebrate",
};

type MascotSize = "xs" | "sm" | "md" | "lg";

const PX: Record<MascotSize, number> = { xs: 44, sm: 56, md: 96, lg: 144 };

const BOX: Record<MascotSize, string> = {
  xs: "size-11 rounded-xl",
  sm: "size-14 rounded-2xl",
  md: "size-24 rounded-3xl",
  lg: "size-36 rounded-[2rem]",
};

/** Görsel kenarlarıyla aynı zemin: kare arka plan kutunun içinde kaybolur. */
const TILE = "bg-[#f1f4f8] ring-1 ring-indigo-100/80";

export function Mascot({ mood, size = "sm", className, priority }: { mood: MascotMood; size?: MascotSize; className?: string; priority?: boolean }) {
  const px = PX[size];
  return (
    <span aria-hidden className={cn("relative block shrink-0 overflow-hidden", TILE, BOX[size], className)}>
      <Image
        src={`/student/avatar/${FILE[mood]}-${px <= 80 ? 160 : 384}.webp`}
        alt=""
        fill
        sizes={`${px}px`}
        unoptimized
        priority={priority}
        className="object-cover"
      />
    </span>
  );
}

/** Giriş sahnesi (robot + öğrenci). Genişliği kap belirler. */
export function MascotWelcome({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("block overflow-hidden rounded-3xl", TILE, className)}>
      <Image src="/student/avatar/welcome-480.webp" alt="" width={480} height={422} unoptimized priority className="h-auto w-full" />
    </span>
  );
}

export type FinishedReason = "PROCTOR_LIMIT" | "EXAM_TIME_UP" | "WINDOW_CLOSED" | (string & {});

/** Bitiş ekranı: kutlama yalnız öğrencinin kendi teslim ettiği sınavda. Gözetim sınırında maskot gösterilmez. */
export function finishedMood(reason?: FinishedReason | null): MascotMood | null {
  if (reason === "PROCTOR_LIMIT") return null;
  if (reason === "EXAM_TIME_UP" || reason === "WINDOW_CLOSED") return "waiting";
  return "celebrate";
}