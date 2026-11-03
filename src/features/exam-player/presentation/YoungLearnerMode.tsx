"use client";

import { MediaAudio } from "@/src/features/exam-player/media/MediaContext";
import type { PlaybackPolicy } from "@/src/features/exam-player/types";

/**
 * F3-04/Adım 4: 4-6/7-9 küçük yaş bandı sunum modu — yazı girişi kısıtı ZATEN backend'de
 * uygulanıyor (`ExamPublishValidator`/`BlueprintValidator`, Adım 2-3); bu yalnız SUNUM: büyük
 * hedef alanları + basit düzen. `YOUNG_LEARNER_MODE_CLASS` `exam-player-theme.css`'teki CSS
 * karşılığını tetikler (F3-09'un `--large-font`/`--high-contrast` İKİZ örüntüsü).
 *
 * `youngLearnerMode=true` sinyalinin GERÇEK kaynağı (bu deneme/soru hangi yaş bandına ait)
 * henüz YOK — Adım 3'ün kendi notu ("bu bilgiyi kimin taşıyacağı ayrı bir mimari karar
 * gerektirir") hâlâ kapanmadı; `Blueprint`'te yaş bandı alanı yok, `QuestionVersion.ageBandOptionId`
 * madde seviyeli ama öğrenci içeriğine (`ExamSnapshotBuilder`, DONMUŞ — D22) hiç taşınmıyor. Bu
 * yüzden bu dosya ve `QuestionView`'un `youngLearnerMode` prop'u KÜTÜPHANE HAZIR, ÇAĞIRAN YOK
 * durumunda bırakıldı (F3-04'ün Adım 3/F3-16'nın D67 örüntüsüyle AYNI karar).
 */
export const YOUNG_LEARNER_MODE_CLASS = "exam-player--young-learner";

/**
 * Yönerge sesi: dokunmadan çalınır (`MediaAudio`'nun `autoPlay`'i), büyük/görsel düğme
 * (`variant="default"`, ikon düğmesi DEĞİL) — görev dosyasının "tekrar dinleme düğmesi büyük ve
 * görsel olmalı" şartı. AYNI bilet/hak mekanizması (atlama yok); ses yoksa sessizce hiçbir şey
 * render etmez (yönerge sessiz kalır — bu bir YAYIN uyarısı, bkz. Adım 5, burada değil).
 */
export function YoungLearnerInstructionAudio({
  mediaId,
  playback,
  className,
}: {
  mediaId?: string | null;
  playback?: PlaybackPolicy | null;
  className?: string;
}) {
  if (!mediaId) return null;
  return <MediaAudio mediaId={mediaId} playback={playback} variant="default" autoPlay className={className} />;
}
