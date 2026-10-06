"use client";

import {
  MultipleChoiceView,
  MultipleResponseView,
} from "@/src/features/exam-player/interactions/ChoiceViews";
import { FillInTheBlanksView } from "@/src/features/exam-player/interactions/FillBlanksView";
import { GroupingView } from "@/src/features/exam-player/interactions/GroupingView";
import {
  HotspotPlaceView,
  HotspotSelectView,
} from "@/src/features/exam-player/interactions/HotspotViews";
import { MatchingView } from "@/src/features/exam-player/interactions/MatchingView";
import { OrderingView } from "@/src/features/exam-player/interactions/OrderingView";
import {
  AudioResponseView,
  ImageResponseView,
  OpenEndedView,
  VideoResponseView,
} from "@/src/features/exam-player/interactions/ResponseViews";
import { ShortAnswerView } from "@/src/features/exam-player/interactions/ShortAnswerView";
import { TrueFalseView } from "@/src/features/exam-player/interactions/TrueFalseView";
import { usePlayerPreview } from "@/src/features/exam-player/preview/PlayerPreviewContext";

export function InteractionRenderer({
  type,
  interaction,
  disabled,
  itemId,
  answerKey,
}: {
  type: string;
  interaction: Record<string, unknown>;
  disabled?: boolean;
  itemId?: string;
  answerKey?: Record<string, unknown> | null;
}) {
  const { preview } = usePlayerPreview();
  const i = { ...interaction, type };
  const key = preview ? answerKey : null;

  switch (type) {
    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoiceView interaction={i} disabled={disabled} answerKey={key} preview={preview} itemId={itemId} />
      );
    case "MULTIPLE_RESPONSE":
      return (
        <MultipleResponseView interaction={i} disabled={disabled} answerKey={key} preview={preview} itemId={itemId} />
      );
    case "TRUE_FALSE":
      return <TrueFalseView interaction={i} disabled={disabled} answerKey={key} preview={preview} itemId={itemId} />;
    case "FILL_IN_THE_BLANKS":
      return (
        <FillInTheBlanksView interaction={i} disabled={disabled} answerKey={key} preview={preview} itemId={itemId} />
      );
    case "SHORT_ANSWER":
      return (
        <ShortAnswerView interaction={i} disabled={disabled} answerKey={key} preview={preview} itemId={itemId} />
      );
    case "MATCHING":
      return <MatchingView interaction={i} disabled={disabled} answerKey={key} preview={preview} itemId={itemId} />;
    case "ORDERING":
      return (
        <OrderingView
          key={JSON.stringify((i as { items?: unknown }).items)}
          interaction={i}
          disabled={disabled}
          answerKey={key}
          preview={preview}
          itemId={itemId}
        />
      );
    case "GROUPING":
      return <GroupingView interaction={i} disabled={disabled} answerKey={key} preview={preview} itemId={itemId} />;
    case "HOTSPOT_SELECT":
      return (
        <HotspotSelectView interaction={i} disabled={disabled} answerKey={key} preview={preview} itemId={itemId} />
      );
    case "HOTSPOT_PLACE":
      return (
        <HotspotPlaceView interaction={i} disabled={disabled} answerKey={key} preview={preview} itemId={itemId} />
      );
    case "OPEN_ENDED":
      return <OpenEndedView interaction={i} disabled={disabled} answerKey={key} preview={preview} itemId={itemId} />;
    case "AUDIO_RESPONSE":
      return (
        <AudioResponseView
          interaction={i}
          disabled={disabled}
          itemId={itemId}
          answerKey={key}
          preview={preview}
        />
      );
    case "VIDEO_RESPONSE":
      return (
        <VideoResponseView
          interaction={i}
          disabled={disabled}
          itemId={itemId}
          answerKey={key}
          preview={preview}
        />
      );
    case "IMAGE_RESPONSE":
      return (
        <ImageResponseView
          interaction={i}
          disabled={disabled}
          itemId={itemId}
          answerKey={key}
          preview={preview}
        />
      );
    default:
      return (
        <p className="text-sm italic text-exam-slate-400">
          Unknown question type: <code>{type}</code>
        </p>
      );
  }
}
