"use client";

import { authoringApi, type MediaItem } from "@/src/features/authoring/shared/client";
import { mediaContentUrl } from "@/src/features/authoring/shared/api";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { Button, Input, Select, errorMessage, notify } from "@/src/ui";
import { useCallback, useEffect, useState } from "react";

function MediaPreview({
  mediaId,
  kind,
  alt,
  compact,
}: {
  mediaId: string;
  kind?: string | null;
  alt?: string | null;
  compact?: boolean;
}) {
  const src = mediaContentUrl(mediaId);
  const k = (kind || "").toUpperCase();

  if (k === "AUDIO") {
    return <audio controls preload="metadata" src={src} className="w-full max-w-md" />;
  }
  if (k === "VIDEO") {
    return (
      <video
        controls
        preload="metadata"
        src={src}
        className={compact ? "max-h-28 w-full rounded object-contain bg-bg" : "max-h-48 w-full max-w-md rounded-lg object-contain bg-bg"}
      />
    );
  }
  // IMAGE or unknown → try image
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || ""}
      className={
        compact
          ? "max-h-28 w-full rounded object-contain bg-bg"
          : "max-h-40 max-w-full rounded-lg border border-border object-contain bg-bg"
      }
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

export function MediaPicker({
  kind,
  value,
  onChange,
  disabled,
  label = "Medya",
}: {
  kind?: "IMAGE" | "AUDIO" | "VIDEO" | string;
  value?: string | null;
  onChange: (mediaId: string | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  const { tenant } = useAuthoringTenant();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState(kind ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<MediaItem | null>(null);

  const load = useCallback(async () => {
    if (!tenant) return;
    try {
      setRows(await authoringApi.listMedia(filter || undefined));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Medya yüklenemedi");
    }
  }, [tenant, filter]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Resolve metadata for the currently selected media (filename / kind fallback).
  useEffect(() => {
    if (!tenant || !value) {
      setSelectedMeta(null);
      return;
    }
    let cancelled = false;
    void authoringApi
      .listMedia(kind || undefined)
      .then((list) => {
        if (cancelled) return;
        const found = list.find((m) => m.id === value) ?? null;
        setSelectedMeta(found);
      })
      .catch(() => {
        if (!cancelled) setSelectedMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant, value, kind]);

  async function upload(file: File) {
    setBusy(true);
    try {
      const detected =
        kind ||
        (file.type.startsWith("audio") ? "AUDIO" : file.type.startsWith("video") ? "VIDEO" : "IMAGE");
      const media = await authoringApi.uploadMedia(detected, file, {
        altText: detected === "IMAGE" ? file.name : null,
      });
      onChange(media.id);
      setSelectedMeta(media);
      setOpen(false);
      await load();
      notify.success("Medya yüklendi");
    } catch (e) {
      const message = errorMessage(e, "Yükleme başarısız");
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  const previewKind = kind || selectedMeta?.kind || "IMAGE";

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      <div className="flex flex-wrap items-start gap-2">
        {value ? (
          <div className="min-w-0 flex-1 space-y-1">
            <MediaPreview
              mediaId={value}
              kind={previewKind}
              alt={selectedMeta?.altText || selectedMeta?.originalFilename}
            />
            {selectedMeta?.originalFilename || selectedMeta?.altText ? (
              <p className="truncate text-xs text-fg-muted">
                {selectedMeta.originalFilename || selectedMeta.altText}
              </p>
            ) : null}
          </div>
        ) : (
          <span className="rounded bg-bg px-2 py-1 text-xs text-fg-muted">seçilmedi</span>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>
            Kütüphaneden seç
          </Button>
          {value ? (
            <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(null)}>
              Temizle
            </Button>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-surface p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-medium">Medya seç</h3>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Kapat
              </Button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">Tümü</option>
                <option value="IMAGE">Görsel</option>
                <option value="AUDIO">Ses</option>
                <option value="VIDEO">Video</option>
              </Select>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <span className="rounded-lg border border-border px-3 py-1.5">
                  {busy ? "Yükleniyor…" : "Dosya yükle"}
                </span>
                <Input
                  type="file"
                  className="hidden"
                  disabled={busy}
                  accept={
                    kind === "IMAGE"
                      ? "image/*"
                      : kind === "AUDIO"
                        ? "audio/*"
                        : kind === "VIDEO"
                          ? "video/*"
                          : "image/*,audio/*,video/*"
                  }
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {rows.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`rounded-lg border p-3 text-left text-sm ${
                    value === m.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => {
                    onChange(m.id);
                    setSelectedMeta(m);
                    setOpen(false);
                  }}
                >
                  {m.status === "READY" ? (
                    <div
                      className="mb-2"
                      onClick={
                        m.kind === "AUDIO" || m.kind === "VIDEO"
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                    >
                      <MediaPreview
                        mediaId={m.id}
                        kind={m.kind}
                        alt={m.altText || m.originalFilename}
                        compact
                      />
                    </div>
                  ) : null}
                  <p className="font-medium">{m.kind}</p>
                  <p className="text-xs text-fg-muted">{m.originalFilename || m.mimeType}</p>
                  {m.altText ? <p className="mt-1 truncate">{m.altText}</p> : null}
                </button>
              ))}
            </div>
            {rows.length === 0 ? <p className="text-sm text-fg-muted">Kayıt yok.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
