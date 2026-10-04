export type OptionFormat = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO";

export type PlaybackPolicy = {
  maxPlays?: number | null;
  autoplay?: boolean;
  seekable?: boolean;
};

export type HtmlValue = { html: string } | string | null | undefined;

export type PlayerOption = {
  id: string;
  text?: HtmlValue;
  mediaId?: string | null;
  playback?: PlaybackPolicy | null;
};

export type ContentBlock =
  | { type: "TEXT"; id: string; text: HtmlValue }
  | { type: "IMAGE"; id: string; mediaId: string | null; caption?: HtmlValue }
  | {
      type: "GALLERY";
      id: string;
      columns: number;
      items: Array<{ id?: string; mediaId: string; caption?: HtmlValue }>;
    }
  | { type: "AUDIO"; id: string; mediaId: string | null; playback?: PlaybackPolicy | null }
  | { type: "VIDEO"; id: string; mediaId: string | null; playback?: PlaybackPolicy | null };

export type Shape =
  | { kind: "RECT"; x: number; y: number; w: number; h: number }
  | { kind: "ELLIPSE"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "POLYGON"; points: Array<{ x: number; y: number }> };

export type Region = { id: string; shape: Shape; label?: HtmlValue };

export type QuestionPartView = {
  id: string;
  position: number;
  interactionType: string;
  stem: ContentBlock[];
  interaction: Record<string, unknown>;
  /** Present in authoring preview — used to reveal correct answers */
  answerKey?: Record<string, unknown> | null;
  rubricVersionId?: string | null;
};

export type QuestionViewModel = {
  instruction?: HtmlValue;
  instructionAudio?: { mediaId: string; playback?: PlaybackPolicy | null } | null;
  mainAudio?: {
    mediaId?: string | null;
    playback?: PlaybackPolicy | null;
  } | null;
  stimulus: ContentBlock[];
  parts: QuestionPartView[];
};

export function htmlOf(v: HtmlValue): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return String(v.html ?? "");
}

export function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}
