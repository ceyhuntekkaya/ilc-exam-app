// Yalnız `next dev`: next.config.ts `pageExtensions` "dev.tsx"i production build'de dışlar (B-44).
"use client";

import { MediaAudio, MediaVideo, MediaVideoPopup } from "@/src/features/exam-player/media/MediaContext";
import { AudioResponseView } from "@/src/features/exam-player/interactions/ResponseViews";

export default function MediaArtCheck() {
  return (
    <div data-panel="student" className="exam-player mx-auto max-w-3xl space-y-6 bg-white p-8">
      <MediaAudio mediaId="01a11571-738b-7bdd-b181-ac0e2b0f2a40" />
      <div className="flex items-center gap-6">
        <MediaAudio mediaId="01a11571-738b-7bdd-b181-ac0e2b0f2a40" variant="icon" unlimited />
        <MediaAudio mediaId="01a11571-8884-7c98-b9ec-69c8bd49fdfa" variant="compact" playback={{ maxPlays: 2 }} />
      </div>
      <div className="flex gap-6">
        <MediaVideo mediaId="01a11583-7e03-7f84-9877-fa7a6d9c551d" />
        <MediaVideoPopup mediaId="01a11583-7e03-7f84-9877-fa7a6d9c551d" caption="row" />
      </div>
      <AudioResponseView interaction={{}} />
    </div>
  );
}
