"use client";

import { authoringApi, type MediaItem } from "@/src/features/authoring/shared/client";
import { mediaContentUrl } from "@/src/features/authoring/shared/api";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import {
  Button,
  Select,
  Skeleton,
  errorMessage,
  notify,
  IconX,
  IconUpload,
  EmptyState,
} from "@/src/ui";
import { useCallback, useEffect, useId, useState } from "react";

const KIND_LABEL: Record<string, string> = { IMAGE: "Görsel", AUDIO: "Ses", VIDEO: "Video" };

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
  hideLabel = false,
}: {
  kind?: "IMAGE" | "AUDIO" | "VIDEO" | string;
  value?: string | null;
  onChange: (mediaId: string | null) => void;
  disabled?: boolean;
  label?: string;
  /** Etiket dışarıda (ör. galeri satırı başlığı) gösteriliyorsa. */
  hideLabel?: boolean;
}) {
  const titleId = useId();
  const { tenant } = useAuthoringTenant();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState(kind ?? "");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<MediaItem | null>(null);

  const load = useCallback(async () => {
    if (!tenant) return;
    try {
      setRows(await authoringApi.listMedia(filter || undefined));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Medya yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [tenant, filter]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Escape ile kapanır; açıkken sayfa kaydırması kilitlenir.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

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
  const kindLabel = KIND_LABEL[(kind || "").toUpperCase()] ?? "Medya";
  const accept =
    kind === "IMAGE" ? "image/*" : kind === "AUDIO" ? "audio/*" : kind === "VIDEO" ? "video/*" : "image/*,audio/*,video/*";

  return (
    <div className="grid min-w-0 gap-1.5">
      {hideLabel ? null : <p className="text-[13px] font-medium text-fg">{label}</p>}
      {value ? (
        <div className="flex min-w-0 flex-wrap items-start gap-3 rounded-lg border border-border bg-neutral-50 p-2.5">
          <div className="min-w-0 flex-1 basis-56 space-y-1">
            <MediaPreview mediaId={value} kind={previewKind} alt={selectedMeta?.altText || selectedMeta?.originalFilename} />
            {selectedMeta?.originalFilename || selectedMeta?.altText ? (
              <p className="truncate text-xs text-fg-muted">{selectedMeta.originalFilename || selectedMeta.altText}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => {
              setLoading(true);
              setOpen(true);
            }}>
              Değiştir
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(null)}>
              Kaldır
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
              setLoading(true);
              setOpen(true);
            }}
          aria-label={`${label}: ${kindLabel.toLocaleLowerCase("tr-TR")} seç`}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-neutral-50 text-[13px] text-fg-muted transition-colors hover:border-primary-300 hover:bg-primary-50/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden className="text-lg leading-none">+</span>
          {kindLabel} seç veya yükle
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h3 id={titleId} className="text-[15px] font-semibold text-fg">
                  {kindLabel} seç
                </h3>
                <p className="text-xs text-fg-subtle">Kütüphaneden seçin ya da yeni dosya yükleyin.</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Kapat">
                <IconX className="size-3.5" aria-hidden />
              </Button>
            </header>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              {kind ? (
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary">Yalnız {kindLabel.toLocaleLowerCase("tr-TR")}</span>
              ) : (
                <div className="w-40">
                  <Select
                    value={filter}
                    onChange={(e) => {
                      setLoading(true);
                      setFilter(e.target.value);
                    }}
                    aria-label="Tür filtresi"
                  >
                    <option value="">Tüm türler</option>
                    <option value="IMAGE">Görsel</option>
                    <option value="AUDIO">Ses</option>
                    <option value="VIDEO">Video</option>
                  </Select>
                </div>
              )}
              <label
                className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[13px] font-medium text-white shadow-xs hover:bg-primary-700 ${busy ? "pointer-events-none opacity-60" : ""}`}
              >
                <IconUpload className="size-3.5" aria-hidden />
                {busy ? "Yükleniyor…" : "Dosya yükle"}
                <input
                  type="file"
                  className="sr-only"
                  disabled={busy}
                  accept={accept}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {error ? <p role="alert" className="mb-3 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p> : null}
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-36 rounded-lg" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <EmptyState compact title={`Kütüphanede ${kindLabel.toLocaleLowerCase("tr-TR")} yok`} description="Yukarıdan dosya yükleyin; yüklenen dosya burada seçilebilir hâle gelir." />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((m) => {
                    const active = value === m.id;
                    return (
                      <li
                        key={m.id}
                        className={`flex flex-col overflow-hidden rounded-lg border transition-colors ${
                          active ? "border-primary ring-1 ring-primary-200" : "border-border hover:border-border-strong"
                        }`}
                      >
                        <div className="bg-neutral-50 p-2">
                          {m.status === "READY" ? (
                            <MediaPreview mediaId={m.id} kind={m.kind} alt={m.altText || m.originalFilename} compact />
                          ) : (
                            <p className="py-6 text-center text-xs text-fg-subtle">İşleniyor…</p>
                          )}
                        </div>
                        <div className="flex flex-1 items-center justify-between gap-2 p-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-fg" title={m.originalFilename || m.mimeType || ""}>
                              {m.originalFilename || m.mimeType || "Adsız"}
                            </p>
                            <p className="text-[11px] text-fg-subtle">{KIND_LABEL[(m.kind || "").toUpperCase()] ?? m.kind}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={active ? "secondary" : "primary"}
                            disabled={m.status !== "READY"}
                            onClick={() => {
                              onChange(m.id);
                              setSelectedMeta(m);
                              setOpen(false);
                            }}
                          >
                            {active ? "Seçili" : "Seç"}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
