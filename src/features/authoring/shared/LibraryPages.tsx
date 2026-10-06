"use client";

import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";

import { authoringApi, type MediaItem, type ReviewItem } from "@/src/features/authoring/shared/client";
import { FormGroup } from "@/src/features/authoring/shared/FormGroup";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { useContentBasePath } from "@/src/features/panel/PanelContext";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FieldAction,
  FilterTabs,
  FormCard,
  FormMessage,
  IconEdit,
  IconSearch,
  IconTrash,
  IconUpload,
  Input,
  PageHeader,
  SectionTable,
  Select,
  Skeleton,
  Textarea,
  errorMessage,
  notify,
  IconArrowUp,
  IconArrowDown,
  IconX,
} from "@/src/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const KIND_LABEL: Record<string, string> = { IMAGE: "Görsel", AUDIO: "Ses", VIDEO: "Video" };
const KIND_ACCEPT: Record<string, string> = {
  IMAGE: "image/jpeg,image/png,image/webp,image/gif",
  AUDIO: "audio/*",
  VIDEO: "video/*",
};

function formatBytes(n?: number | null) {
  if (!n) return null;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms?: number | null) {
  if (!ms) return null;
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ───────── Medya kütüphanesi ───────── */

export function MediaLibraryPage() {
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<MediaItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [uploadKind, setUploadKind] = useState("IMAGE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [altText, setAltText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [license, setLicense] = useState("");

  const load = useCallback(async () => {
    if (!tenant) return;
    try {
      setRows(await authoringApi.listMedia(undefined));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoaded(true);
    }
  }, [tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    setBusy(true);
    try {
      await authoringApi.uploadMedia(uploadKind, file, {
        altText: altText || (uploadKind === "IMAGE" ? file.name : null),
        transcript: transcript || null,
        license: license || null,
      });
      setAltText("");
      setTranscript("");
      setLicense("");
      await load();
      notify.success(`${KIND_LABEL[uploadKind]} yüklendi`);
    } catch (e) {
      notify.error(errorMessage(e, "Yüklenemedi"));
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { IMAGE: 0, AUDIO: 0, VIDEO: 0 };
    for (const m of rows) c[m.kind] = (c[m.kind] ?? 0) + 1;
    return c;
  }, [rows]);

  const term = query.trim().toLocaleLowerCase("tr-TR");
  const shown = rows.filter(
    (m) =>
      (!filter || m.kind === filter) &&
      (!term || `${m.originalFilename ?? ""} ${m.altText ?? ""} ${m.transcript ?? ""}`.toLocaleLowerCase("tr-TR").includes(term)),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medya kütüphanesi"
        description="Sorularda kullanılan görsel, ses ve video dosyaları. Soru editöründeki medya seçici bu kütüphaneyi gösterir."
        count={loaded ? rows.length : undefined}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex flex-col-reverse gap-2 border-b border-border sm:flex-row sm:items-center sm:justify-between">
            <FilterTabs
              label="Medya türü"
              value={filter}
              onChange={setFilter}
              items={[
                { label: "Tümü", value: null, count: rows.length },
                { label: "Görsel", value: "IMAGE", count: counts.IMAGE },
                { label: "Ses", value: "AUDIO", count: counts.AUDIO },
                { label: "Video", value: "VIDEO", count: counts.VIDEO },
              ]}
            />
            <div className="px-3 pt-3 sm:w-64 sm:py-2">
              <Input type="search" icon={<IconSearch />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Dosya adı veya açıklama…" aria-label="Medya ara" />
            </div>
          </div>
          <div className="p-4">
            {error ? (
              <ErrorState title="Medya alınamadı" message={error} onRetry={() => void load()} compact />
            ) : !loaded ? (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" aria-busy="true">
                {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}
              </div>
            ) : shown.length === 0 ? (
              <EmptyState
                embedded
                tone={rows.length ? "neutral" : "primary"}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01" /></svg>}
                title={rows.length ? "Eşleşen dosya yok" : "Medya kütüphanesi boş"}
                description={rows.length ? "Tür filtresini ya da aramayı değiştirin." : "Görsel, ses ve video dosyaları sorularda tekrar kullanılır. Sağdaki panelden türü seçip ilk dosyanızı yükleyin."}
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {shown.map((m) => (
                  <MediaCard key={m.id} m={m} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <FormCard title="Dosya yükle" description="Önce türü seçin; açıklama alanları erişilebilirlik ve telif kaydı içindir." className="xl:sticky xl:top-20">
          <div role="radiogroup" aria-label="Yüklenecek tür" className="grid grid-cols-3 gap-1 rounded-lg bg-neutral-100 p-0.5 ring-1 ring-border ring-inset">
            {Object.entries(KIND_LABEL).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={uploadKind === value}
                onClick={() => setUploadKind(value)}
                className={`h-7 rounded-md text-xs font-medium transition-colors ${uploadKind === value ? "bg-surface text-primary shadow-sm ring-1 ring-border" : "text-fg-muted hover:text-fg"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {uploadKind === "IMAGE" ? (
            <Field label="Alternatif metin" hint="Ekran okuyucu kullanan öğrenciler için görseli kısaca tarif edin. Boşsa dosya adı kullanılır.">
              <Input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="ör. Parkta top oynayan iki çocuk" />
            </Field>
          ) : (
            <Field label="Transkript" hint="Kaydın yazılı metni; işitme engelli öğrenciler ve inceleme için.">
              <Textarea rows={3} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
            </Field>
          )}
          <Field label="Lisans / kaynak" hint="İsteğe bağlı, ör. CC BY 4.0 · Kurum çekimi">
            <Input value={license} onChange={(e) => setLicense(e.target.value)} />
          </Field>
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border-strong bg-neutral-50 px-4 py-6 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/40 ${busy || !tenant ? "pointer-events-none opacity-60" : ""}`}
          >
            <IconUpload className="size-6 text-primary" aria-hidden />
            <span className="text-[13px] font-medium text-fg">{busy ? "Yükleniyor…" : `${KIND_LABEL[uploadKind]} dosyası seç`}</span>
            <span className="text-xs text-fg-subtle">
              {uploadKind === "IMAGE" ? "JPG, PNG, WEBP, GIF" : uploadKind === "AUDIO" ? "MP3, WAV, M4A…" : "MP4, WEBM…"}
            </span>
            <input
              type="file"
              className="sr-only"
              disabled={busy || !tenant}
              accept={KIND_ACCEPT[uploadKind]}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </label>
        </FormCard>
      </div>
    </div>
  );
}

function MediaCard({ m }: { m: MediaItem }) {
  const src = `/api/backend/media/${m.id}/content`;
  const meta = [
    m.widthPx && m.heightPx ? `${m.widthPx}×${m.heightPx}` : null,
    formatDuration(m.durationMs),
    formatBytes(m.sizeBytes),
  ].filter(Boolean);
  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-sm">
      <div className="flex aspect-video items-center justify-center bg-neutral-50">
        {m.status !== "READY" ? (
          <StatusBadge status={m.status} />
        ) : m.kind === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={m.altText || m.originalFilename || ""} className="size-full object-contain" />
        ) : m.kind === "AUDIO" ? (
          <audio controls preload="metadata" src={src} className="w-[90%]" />
        ) : (
          <video controls preload="metadata" src={src} className="size-full object-contain" />
        )}
      </div>
      <div className="grid flex-1 gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-[13px] font-medium text-fg" title={m.originalFilename ?? undefined}>
            {m.originalFilename || "Adsız dosya"}
          </p>
          <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">{KIND_LABEL[m.kind] ?? m.kind}</span>
        </div>
        {meta.length ? <p className="text-[11px] text-fg-subtle">{meta.join(" · ")}</p> : null}
        {m.altText || m.transcript ? <p className="line-clamp-2 text-xs text-fg-muted">{m.altText || m.transcript}</p> : null}
        {m.license ? <p className="text-[11px] text-fg-subtle">Lisans: {m.license}</p> : null}
        <button
          type="button"
          className="mt-auto w-fit pt-1 text-[11px] font-medium text-primary hover:underline"
          onClick={() => void navigator.clipboard.writeText(m.id).then(() => notify.success("Medya kimliği kopyalandı"))}
        >
          Kimliği kopyala
        </button>
      </div>
    </li>
  );
}

/* ───────── İnceleme kuyruğu ───────── */

const REVIEW_TARGET: Record<string, string> = { QUESTION_VERSION: "Soru", EXAM_VERSION: "Sınav", EXAM: "Sınav" };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))} dk önce`;
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d} gün önce` : new Date(iso).toLocaleDateString("tr-TR");
}

export function ReviewQueuePage() {
  const questionBasePath = useContentBasePath("questions");
  const examBasePath = useContentBasePath("exams");
  const requestedType = useSearchParams().get("type");
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<ReviewItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [type, setType] = useState(requestedType === "Soru" || requestedType === "Sınav" ? requestedType : "");

  const load = useCallback(async () => {
    if (!tenant) return;
    try {
      setRows(await authoringApi.listReviews());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoaded(true);
    }
  }, [tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))), [rows]);
  const shown = rows
    .filter((r) => (!status || r.status === status) && (!type || (REVIEW_TARGET[r.targetType] ?? r.targetType) === type))
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  const href = (r: ReviewItem) =>
    r.targetType === "QUESTION_VERSION" ? `${questionBasePath}/${r.targetId}` : r.targetType.startsWith("EXAM") ? `${examBasePath}/${r.targetId}` : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="İnceleme kuyruğu"
        description="Yazarların incelemeye gönderdiği sorular ve sınavlar; en eski gönderim en üstte. Yazar kendi içeriğini onaylayamaz — açıp inceleyin, sonra editördeki Kaydet ve inceleme adımından onaylayın ya da taslağa döndürün."
        count={loaded ? rows.length : undefined}
      />
      <section className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col-reverse gap-2 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <FilterTabs
            label="İnceleme durumu"
            value={status}
            onChange={setStatus}
            items={[{ label: "Tümü", value: null, count: rows.length }, ...statuses.map((s) => ({ label: STATUS_TR[s] ?? s, value: s, count: rows.filter((r) => r.status === s).length }))]}
          />
          <div className="px-3 pt-3 sm:w-44 sm:py-2">
            <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="İçerik türü">
              <option value="">Tüm içerik</option>
              <option value="Soru">Sorular</option>
              <option value="Sınav">Sınavlar</option>
            </Select>
          </div>
        </div>
        <div className="p-4">
          {error ? (
            <ErrorState title="Kuyruk alınamadı" message={error} onRetry={() => void load()} compact />
          ) : (
            <SectionTable
              flush
              loading={!loaded}
              empty={rows.length ? "Filtreye uyan kayıt yok" : "Kuyruk boş"}
              emptyHint={rows.length ? "Filtreleri değiştirin." : "İncelemeye gönderilen içerik burada listelenir."}
              columns={["İçerik", "Tür", "Gönderilme", "Durum", ""]}
              rows={shown.map((r) => {
                const link = href(r);
                return [
                  <span key="t" className="font-mono text-[13px]" title={r.targetId}>{r.targetId.slice(0, 8)}…</span>,
                  <span key="k" className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-fg-muted">{REVIEW_TARGET[r.targetType] ?? r.targetType}</span>,
                  <span key="d" title={new Date(r.submittedAt).toLocaleString("tr-TR")}>{timeAgo(r.submittedAt)}</span>,
                  <StatusBadge key="s" status={r.status} />,
                  link ? (
                    <Link key="a" href={link} className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs font-medium text-fg hover:border-primary-300 hover:text-primary">
                      İncele →
                    </Link>
                  ) : (
                    ""
                  ),
                ];
              })}
            />
          )}
        </div>
      </section>
    </div>
  );
}

const STATUS_TR: Record<string, string> = {
  PENDING: "Bekliyor",
  IN_PROGRESS: "İnceleniyor",
  APPROVED: "Onaylı",
  RETURNED: "İade",
};

export { RubricsPage } from "@/src/features/authoring/rubrics/RubricEditor";

/* ───────── Sınav formatları ───────── */

type FormatRow = { id: string; code: string; name: string; description?: string; skeleton?: unknown; minLevel?: string; maxLevel?: string; purpose?: string };
type SkSub = { title: string; taskType?: string; blueprint?: { count?: number; cefrLevel?: string } & Record<string, unknown> } & Record<string, unknown>;
type SkSection = { title: string; skill: string; subSections: SkSub[] } & Record<string, unknown>;
type SkeletonDef = { sections: SkSection[] } & Record<string, unknown>;

/** Format alt bölümlerinde görev türü önerileri (serbest metin de kabul edilir). */
const TASK_TYPES = [
  { value: "MCQ", label: "Çoktan seçmeli" },
  { value: "MATCHING", label: "Eşleştirme" },
  { value: "TRUE_FALSE", label: "Doğru / Yanlış" },
  { value: "GAP_FILL", label: "Boşluk doldurma" },
  { value: "ORDERING", label: "Sıralama" },
  { value: "SHORT_ANSWER", label: "Kısa cevap" },
  { value: "WRITING", label: "Yazma" },
  { value: "SPEAKING", label: "Konuşma" },
];

const FORMAT_PURPOSES = [
  { value: "ACHIEVEMENT", label: "Başarı" },
  { value: "PLACEMENT", label: "Seviye tespit" },
  { value: "DIAGNOSTIC", label: "Tanılama" },
  { value: "PRACTICE", label: "Alıştırma" },
];

/** Bilinmeyen alanları koruyarak (round-trip) düzenlenebilir biçime getirir. */
function toSkeleton(raw: unknown): SkeletonDef {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sections = Array.isArray(s.sections) ? s.sections : [];
  return {
    ...s,
    sections: sections.map((x) => {
      const sec = (x ?? {}) as Record<string, unknown>;
      return {
        ...sec,
        title: String(sec.title ?? ""),
        skill: String(sec.skill ?? "READING"),
        subSections: (Array.isArray(sec.subSections) ? sec.subSections : []).map((y) => {
          const sub = (y ?? {}) as Record<string, unknown>;
          return { ...sub, title: String(sub.title ?? ""), taskType: sub.taskType ? String(sub.taskType) : undefined, blueprint: { ...((sub.blueprint as object) ?? {}) } };
        }),
      };
    }),
  };
}

function skeletonStats(sk: SkeletonDef) {
  const parts = sk.sections.reduce((n, s) => n + s.subSections.length, 0);
  const questions = sk.sections.reduce((n, s) => n + s.subSections.reduce((m, p) => m + (Number(p.blueprint?.count) || 0), 0), 0);
  return { sections: sk.sections.length, parts, questions };
}

const STARTER_SKELETON: SkeletonDef = {
  sections: [
    {
      title: "Reading and Writing",
      skill: "READING",
      subSections: [
        { title: "Part 1", taskType: "MCQ", blueprint: { count: 5, cefrLevel: "PRE_A1" } },
        { title: "Part 2", taskType: "MATCHING", blueprint: { count: 5, cefrLevel: "A1" } },
      ],
    },
    { title: "Listening", skill: "LISTENING", subSections: [{ title: "Part 1", taskType: "MCQ", blueprint: { count: 5, cefrLevel: "PRE_A1" } }] },
  ],
};

export function FormatsPage() {
  const canManage = useCan(Perm.examFormatManage);
  const { tenant } = useAuthoringTenant();
  const [rows, setRows] = useState<FormatRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!tenant) return;
    try {
      setRows(await authoringApi.listFormats());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoaded(true);
    }
  }, [tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = rows.find((r) => r.id === selectedId) ?? (creating ? null : rows[0] ?? null);
  const term = query.trim().toLocaleLowerCase("tr-TR");
  const shown = rows.filter((r) => !term || `${r.name} ${r.code}`.toLocaleLowerCase("tr-TR").includes(term));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sınav formatları"
        description="Tekrar kullanılabilir sınav iskeletleri: bölümler, alt bölümler ve her birinde kaç soru olacağı. Yeni sınav sihirbazında “Formattan” seçeneğiyle seçilir; sınav bu iskeletle oluşturulur, sorular sonra atanır."
        count={loaded ? rows.length : undefined}
        actions={
          canManage ? (
            <Button onClick={() => { setCreating(true); setSelectedId(null); }} disabled={!tenant}>
              + Yeni format
            </Button>
          ) : undefined
        }
      />
      {error ? (
        <ErrorState title="Formatlar alınamadı" message={error} onRetry={() => void load()} compact />
      ) : !loaded ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]" aria-busy="true">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : rows.length === 0 && !creating ? (
        <EmptyState
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h7v6H4zM13 5h7v3h-7zM13 10h7v9h-7zM4 13h7v6H4z" /></svg>}
          title="Henüz sınav formatı yok"
          description={
            <>
              <p>Format, sık kullandığınız sınav yapısını şablon olarak saklar. Yeni sınav sihirbazında “Formattan” seçilince bölümler, süreler ve soru sayıları hazır gelir.</p>
              {/* Örnek iskelet: formatın ne olduğunu tek bakışta gösterir. */}
              <div className="mx-auto mt-4 w-full max-w-sm rounded-lg border border-border bg-surface p-3 text-left shadow-sm">
                <p className="mb-2 text-[11px] font-semibold tracking-wide text-fg-subtle">ÖRNEK · CAMBRIDGE YLE STARTERS</p>
                <ul className="grid gap-1.5 text-[13px]">
                  {[
                    { name: "Dinleme", parts: "4 part", q: "20 soru" },
                    { name: "Okuma ve yazma", parts: "5 part", q: "25 soru" },
                    { name: "Konuşma", parts: "4 part", q: "Rubrik" },
                  ].map((row) => (
                    <li key={row.name} className="flex items-center justify-between gap-2 rounded-md bg-neutral-50 px-2.5 py-1.5">
                      <span className="font-medium text-fg">{row.name}</span>
                      <span className="text-xs text-fg-subtle">{row.parts} · {row.q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          }
          action={canManage ? <Button onClick={() => setCreating(true)}>+ İlk formatı oluştur</Button> : undefined}
          secondaryAction={canManage ? undefined : <p className="text-[13px] text-fg-subtle">Format oluşturma yetkiniz yok.</p>}
        />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          <nav aria-label="Formatlar" className="rounded-xl border border-border bg-surface shadow-sm lg:sticky lg:top-20">
            <div className="border-b border-border p-2.5">
              <Input type="search" icon={<IconSearch />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad veya kod ara" aria-label="Format ara" />
            </div>
            <ul className="max-h-[65vh] divide-y divide-border overflow-y-auto">
              {creating ? (
                <li className="bg-primary-50/70 px-3.5 py-2.5 text-[13px] font-medium text-primary">+ Yeni format (kaydedilmedi)</li>
              ) : null}
              {shown.map((f) => {
                const active = !creating && selected?.id === f.id;
                const st = skeletonStats(toSkeleton(f.skeleton));
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => { setCreating(false); setSelectedId(f.id); }}
                      className={`grid w-full gap-0.5 px-3.5 py-2.5 text-left ${active ? "bg-primary-50/70" : "hover:bg-neutral-50"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[13px] font-medium ${active ? "text-primary" : "text-fg"}`}>{f.name}</span>
                        {f.minLevel || f.maxLevel ? (
                          <span className="shrink-0 rounded bg-(--accent-plum-bg) px-1 font-mono text-[10.5px] font-semibold text-(--accent-plum)">{f.minLevel}–{f.maxLevel}</span>
                        ) : null}
                      </span>
                      <span className="font-mono text-[11px] text-fg-subtle">{f.code}</span>
                      <span className="text-[11px] text-fg-muted">{st.sections} bölüm · {st.parts} alt bölüm · {st.questions || "—"} soru</span>
                    </button>
                  </li>
                );
              })}
              {shown.length === 0 && !creating ? <li className="px-4 py-6 text-center text-[13px] text-fg-subtle">Eşleşen format yok.</li> : null}
            </ul>
          </nav>

          {creating ? (
            <FormatCreateCard
              key="new"
              onCancel={() => setCreating(false)}
              onCreated={async () => {
                setCreating(false);
                await load();
              }}
            />
          ) : selected ? (
            <FormatEditor key={selected.id} format={selected} onSaved={load} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function FormatCreateCard({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("ACHIEVEMENT");
  const [minLevel, setMinLevel] = useState("A1");
  const [maxLevel, setMaxLevel] = useState("A2");
  const [start, setStart] = useState<"blank" | "starter">("blank");
  const [busy, setBusy] = useState(false);
  const levelError = CEFR.indexOf(minLevel as (typeof CEFR)[number]) > CEFR.indexOf(maxLevel as (typeof CEFR)[number]) ? "En düşük seviye en yüksekten büyük olamaz." : undefined;

  async function submit() {
    setBusy(true);
    try {
      await authoringApi.createFormat({
        code: code.trim() || `FMT-${Date.now().toString(36).toUpperCase()}`,
        name: name.trim(),
        description: description.trim() || null,
        purpose,
        minLevel,
        maxLevel,
        skeleton: start === "starter" ? STARTER_SKELETON : { sections: [{ title: "Bölüm 1", skill: "READING", subSections: [{ title: "Part 1", blueprint: { count: 5 } }] }] },
      });
      notify.success("Format oluşturuldu");
      await onCreated();
    } catch (e) {
      notify.error(errorMessage(e, "Format oluşturulamadı"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormCard
      title="Yeni format"
      description="Önce kimliği belirleyin; bölüm ve alt bölümleri oluşturduktan sonra düzenlersiniz."
      footer={
        <>
          <Button variant="ghost" className="sm:mr-auto" onClick={onCancel}>Vazgeç</Button>
          <Button loading={busy} disabled={busy || !name.trim() || Boolean(levelError)} onClick={() => void submit()}>Formatı oluştur</Button>
        </>
      }
    >
      <FormGroup title="Kimlik">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Field label="Format adı" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. YLE Starters (Okuma + Dinleme)" />
          </Field>
          <Field label="Kod" hint="Boş = otomatik">
            <Input className="font-mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="YLE-STARTERS" />
          </Field>
        </div>
        <Field label="Açıklama" hint="Sihirbazda format seçerken görünür.">
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </FormGroup>
      <FormGroup title="Hedef">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Amaç">
            <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {FORMAT_PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="En düşük seviye" error={levelError}>
            <Select value={minLevel} onChange={(e) => setMinLevel(e.target.value)}>{CEFR.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          </Field>
          <Field label="En yüksek seviye">
            <Select value={maxLevel} onChange={(e) => setMaxLevel(e.target.value)}>{CEFR.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          </Field>
        </div>
      </FormGroup>
      <FormGroup title="Başlangıç iskeleti">
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Başlangıç iskeleti">
          {[
            { v: "blank" as const, label: "Tek bölümle başla", hint: "1 bölüm, 1 alt bölüm (5 soru). Gerisini siz eklersiniz." },
            { v: "starter" as const, label: "YLE Starters örneği", hint: "Okuma + Yazma (2 part) ve Dinleme (1 part), 15 soru." },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={start === o.v}
              onClick={() => setStart(o.v)}
              className={`rounded-lg border p-3 text-left transition-colors ${start === o.v ? "border-primary bg-primary-50/60 ring-1 ring-primary-200" : "border-border hover:border-border-strong hover:bg-neutral-50"}`}
            >
              <span className="block text-[13px] font-semibold text-fg">{o.label}</span>
              <span className="block text-xs text-fg-muted">{o.hint}</span>
            </button>
          ))}
        </div>
      </FormGroup>
    </FormCard>
  );
}

function FormatEditor({ format, onSaved }: { format: FormatRow; onSaved: () => Promise<void> }) {
  const initial = useMemo(() => toSkeleton(format.skeleton), [format.skeleton]);
  const [sk, setSk] = useState<SkeletonDef>(initial);
  const [json, setJson] = useState(() => JSON.stringify(initial, null, 2));
  const [jsonOpen, setJsonOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(sk) !== JSON.stringify(initial);
  const stats = skeletonStats(sk);
  const jsonValid = useMemo(() => {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  }, [json]);

  function update(next: SkeletonDef) {
    setSk(next);
    setJson(JSON.stringify(next, null, 2));
  }
  const setSection = (i: number, patch: Partial<SkSection>) => update({ ...sk, sections: sk.sections.map((s, x) => (x === i ? { ...s, ...patch } : s)) });
  const setSub = (i: number, j: number, patch: Partial<SkSub>) =>
    setSection(i, { subSections: sk.sections[i].subSections.map((p, y) => (y === j ? { ...p, ...patch } : p)) });
  const moveSection = (i: number, dir: -1 | 1) => {
    const arr = [...sk.sections];
    [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
    update({ ...sk, sections: arr });
  };

  async function save(skeleton: SkeletonDef) {
    setBusy(true);
    try {
      await authoringApi.updateFormat(format.id, { skeleton });
      notify.success("İskelet kaydedildi");
      await onSaved();
    } catch (e) {
      notify.error(errorMessage(e, "Kaydedilemedi"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormCard
      title={format.name}
      description={[format.code, format.purpose ? FORMAT_PURPOSES.find((p) => p.value === format.purpose)?.label : null, format.minLevel || format.maxLevel ? `${format.minLevel}–${format.maxLevel}` : null].filter(Boolean).join(" · ")}
      aside={dirty ? <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-semibold text-warning">Kaydedilmedi</span> : null}
      footer={
        <>
          <span className="text-xs text-fg-subtle sm:mr-auto">
            {stats.sections} bölüm · {stats.parts} alt bölüm · toplam {stats.questions} soru
          </span>
          <Button variant="ghost" disabled={!dirty || busy} onClick={() => update(initial)}>Değişiklikleri geri al</Button>
          <Button loading={busy} disabled={!dirty || busy} onClick={() => void save(sk)}>İskeleti kaydet</Button>
        </>
      }
    >
      {format.description ? <p className="text-[13px] text-fg-muted">{format.description}</p> : null}

      {sk.sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[13px] text-fg-subtle">İskelet boş. Aşağıdan bölüm ekleyin.</p>
      ) : (
        <ol className="grid gap-3">
          {sk.sections.map((sec, i) => {
            const secQ = sec.subSections.reduce((m, p) => m + (Number(p.blueprint?.count) || 0), 0);
            return (
              <li key={i} className="overflow-hidden rounded-lg border border-border">
                <div className="grid gap-2 border-b border-border bg-neutral-50 p-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,10rem)_auto] sm:items-end">
                  <span className="flex size-7 items-center justify-center self-center rounded-md bg-primary text-xs font-bold text-white">{i + 1}</span>
                  <Field label="Bölüm adı">
                    <Input value={sec.title} onChange={(e) => setSection(i, { title: e.target.value })} placeholder="ör. Reading and Writing" />
                  </Field>
                  <Field label="Beceri">
                    <Select value={sec.skill} onChange={(e) => setSection(i, { skill: e.target.value })}>
                      {SKILLS.map((s) => <option key={s} value={s}>{SKILL_LABEL[s]}</option>)}
                    </Select>
                  </Field>
                  <span className="flex items-center gap-0.5">
                    <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => moveSection(i, -1)} aria-label={`${i + 1}. bölümü yukarı taşı`} title="Yukarı taşı"><IconArrowUp className="size-3.5" aria-hidden /></Button>
                    <Button size="sm" variant="ghost" disabled={i === sk.sections.length - 1} onClick={() => moveSection(i, 1)} aria-label={`${i + 1}. bölümü aşağı taşı`} title="Aşağı taşı"><IconArrowDown className="size-3.5" aria-hidden /></Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`${i + 1}. bölümü sil`}
                      title="Bölümü sil"
                      onClick={() => confirm(`“${sec.title || `Bölüm ${i + 1}`}” ve ${sec.subSections.length} alt bölümü silinsin mi?`) && update({ ...sk, sections: sk.sections.filter((_, x) => x !== i) })}
                    >
                      <IconTrash className="size-3.5" aria-hidden />
                    </Button>
                  </span>
                </div>
                <div className="grid gap-2 p-3">
                  <div className="hidden grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,10rem)_minmax(0,7rem)_minmax(0,7rem)_2rem] gap-2 px-0.5 text-[11px] font-semibold tracking-wide text-fg-subtle md:grid">
                    <span />
                    <span>Alt bölüm adı</span>
                    <span>Görev türü</span>
                    <span>Soru sayısı</span>
                    <span>Seviye</span>
                    <span />
                  </div>
                  {sec.subSections.map((sub, j) => (
                    <div key={j} className="grid grid-cols-2 items-center gap-2 rounded-md border border-border p-2 md:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,10rem)_minmax(0,7rem)_minmax(0,7rem)_2rem] md:border-0 md:p-0">
                      <span className="hidden text-right text-xs tabular-nums text-fg-subtle md:block">{j + 1}.</span>
                      <Input className="col-span-2 md:col-span-1" aria-label="Alt bölüm adı" value={sub.title} onChange={(e) => setSub(i, j, { title: e.target.value })} placeholder={`Part ${j + 1}`} />
                      <div className="col-span-2 md:col-span-1">
                        <Select aria-label="Görev türü" value={sub.taskType ?? ""} onChange={(e) => setSub(i, j, { taskType: e.target.value || undefined })}>
                          <option value="">— Belirtilmemiş</option>
                          {TASK_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                          {sub.taskType && !TASK_TYPES.some((t) => t.value === sub.taskType) ? (
                            <option value={sub.taskType}>{sub.taskType} (özel)</option>
                          ) : null}
                        </Select>
                      </div>
                      <Input type="number" min={0} suffix="soru" aria-label="Soru sayısı" value={sub.blueprint?.count ?? ""} onChange={(e) => setSub(i, j, { blueprint: { ...sub.blueprint, count: e.target.value === "" ? undefined : Number(e.target.value) } })} />
                      <Select aria-label="Seviye" value={sub.blueprint?.cefrLevel ?? ""} onChange={(e) => setSub(i, j, { blueprint: { ...sub.blueprint, cefrLevel: e.target.value || undefined } })}>
                        <option value="">Seviye —</option>
                        {CEFR.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="justify-self-end"
                        aria-label={`${j + 1}. alt bölümü sil`}
                        title="Sil"
                        onClick={() => setSection(i, { subSections: sec.subSections.filter((_, y) => y !== j) })}
                      >
                        <IconX className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSection(i, { subSections: [...sec.subSections, { title: `Part ${sec.subSections.length + 1}`, blueprint: { count: 5 } }] })}
                    >
                      + Alt bölüm
                    </Button>
                    <span className="text-xs text-fg-subtle">{sec.subSections.length} alt bölüm · {secQ} soru</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <button
        type="button"
        onClick={() => update({ ...sk, sections: [...sk.sections, { title: `Bölüm ${sk.sections.length + 1}`, skill: "READING", subSections: [{ title: "Part 1", blueprint: { count: 5 } }] }] })}
        className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong text-[13px] font-medium text-fg-muted transition-colors hover:border-primary-300 hover:bg-primary-50/40 hover:text-primary"
      >
        + Bölüm ekle
      </button>

      <details className="rounded-lg border border-border" open={jsonOpen} onToggle={(e) => setJsonOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium text-fg-muted hover:text-fg">
          <IconEdit className="size-3.5" aria-hidden /> Gelişmiş: JSON olarak düzenle
        </summary>
        <div className="grid gap-2 border-t border-border p-3">
          <Textarea rows={12} className="font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} aria-label="İskelet JSON" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-xs ${jsonValid ? "text-fg-subtle" : "text-danger"}`}>{jsonValid ? "Geçerli JSON. Uygula ile yukarıdaki düzenleyiciye aktarılır." : "Geçersiz JSON."}</span>
            <Button size="sm" variant="secondary" disabled={!jsonValid} onClick={() => setSk(toSkeleton(JSON.parse(json)))}>
              JSON’u uygula
            </Button>
          </div>
        </div>
      </details>
    </FormCard>
  );
}

const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY", "USE_OF_ENGLISH"] as const;
const SKILL_LABEL: Record<(typeof SKILLS)[number], string> = {
  READING: "Okuma",
  LISTENING: "Dinleme",
  WRITING: "Yazma",
  SPEAKING: "Konuşma",
  GRAMMAR: "Dilbilgisi",
  VOCABULARY: "Kelime",
  USE_OF_ENGLISH: "Use of English",
};
const CEFR = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
const FRAMEWORKS = ["ILC", "CEFR", "MEB"] as const;

type OutcomeRow = {
  id: string;
  code: string;
  description: string;
  framework?: string;
  skill?: string | null;
  cefrLevel?: string | null;
  gradeLevel?: number | null;
  ownerOrgId?: string;
};

type AgeBandRow = { id: string; code: string; label: string; sortOrder: number; ownerOrgId: string };

type PendingDelete = { kind: "tag" | "age" | "outcome"; id: string; label: string };

const emptyOutcome = {
  framework: "ILC",
  code: "",
  description: "",
  skill: "READING",
  cefrLevel: "A1",
  gradeLevel: "",
};

export function SettingsDictionariesPage() {
  const { tenant } = useAuthoringTenant();
  const [tags, setTags] = useState<Array<{ id: string; name: string; ownerOrgId?: string }>>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [ageBands, setAgeBands] = useState<AgeBandRow[]>([]);
  const [tagName, setTagName] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [ageCode, setAgeCode] = useState("");
  const [ageLabel, setAgeLabel] = useState("");
  const [ageSort, setAgeSort] = useState("");
  const [editingAgeId, setEditingAgeId] = useState<string | null>(null);
  const [editingAge, setEditingAge] = useState({ code: "", label: "", sortOrder: "" });
  const [outcomeDraft, setOutcomeDraft] = useState(emptyOutcome);
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [editingOutcome, setEditingOutcome] = useState(emptyOutcome);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importJson, setImportJson] = useState(
    '[{"interactionType":"MULTIPLE_CHOICE","skill":"READING","cefrLevel":"A1","ageBand":"10-12"}]',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant) return;
    const [t, o, a] = await Promise.all([
      authoringApi.listTags(),
      authoringApi.listOutcomes(),
      authoringApi.listAgeBands(),
    ]);
    setTags(t);
    setOutcomes(o);
    setAgeBands(a);
  }, [tenant]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, [load]);

  function fail(e: unknown, fallback: string) {
    notify.error(errorMessage(e, fallback));
  }

  async function addTag() {
    try {
      await authoringApi.createTag(tagName);
      setTagName("");
      await load();
      notify.success("Etiket eklendi");
    } catch (e) {
      fail(e, "Etiket eklenemedi");
    }
  }

  async function saveTag(id: string) {
    try {
      await authoringApi.updateTag(id, editingTagName);
      setEditingTagId(null);
      await load();
      notify.success("Etiket güncellendi");
    } catch (e) {
      fail(e, "Etiket güncellenemedi");
    }
  }

  async function addAgeBand() {
    try {
      await authoringApi.createAgeBand({
        code: ageCode.trim(),
        label: ageLabel.trim(),
        sortOrder: ageSort.trim() === "" ? ageBands.length + 1 : Number(ageSort),
      });
      setAgeCode("");
      setAgeLabel("");
      setAgeSort("");
      await load();
      notify.success("Yaş bandı eklendi");
    } catch (e) {
      fail(e, "Yaş bandı eklenemedi");
    }
  }

  async function saveAgeBand(id: string) {
    try {
      await authoringApi.updateAgeBand(id, {
        code: editingAge.code.trim(),
        label: editingAge.label.trim(),
        sortOrder: editingAge.sortOrder.trim() === "" ? 0 : Number(editingAge.sortOrder),
      });
      setEditingAgeId(null);
      await load();
      notify.success("Yaş bandı güncellendi");
    } catch (e) {
      fail(e, "Yaş bandı güncellenemedi");
    }
  }

  function outcomePayload(draft: typeof emptyOutcome) {
    const grade = draft.gradeLevel.trim();
    return {
      framework: draft.framework,
      code: draft.code.trim(),
      description: draft.description.trim(),
      skill: draft.skill,
      cefrLevel: draft.cefrLevel,
      gradeLevel: grade === "" ? null : Number(grade),
    };
  }

  async function addOutcome() {
    try {
      await authoringApi.createOutcome(outcomePayload(outcomeDraft));
      setOutcomeDraft(emptyOutcome);
      await load();
      notify.success("Kazanım eklendi");
    } catch (e) {
      fail(e, "Kazanım eklenemedi");
    }
  }

  async function saveOutcome(id: string) {
    try {
      const payload = outcomePayload(editingOutcome);
      await authoringApi.updateOutcome(id, {
        description: payload.description,
        skill: payload.skill,
        cefrLevel: payload.cefrLevel,
        gradeLevel: payload.gradeLevel,
      });
      setEditingOutcomeId(null);
      await load();
      notify.success("Kazanım güncellendi");
    } catch (e) {
      fail(e, "Kazanım güncellenemedi");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.kind === "tag") await authoringApi.deleteTag(pendingDelete.id);
      else if (pendingDelete.kind === "age") await authoringApi.deleteAgeBand(pendingDelete.id);
      else await authoringApi.deleteOutcome(pendingDelete.id);
      if (pendingDelete.kind === "tag" && editingTagId === pendingDelete.id) setEditingTagId(null);
      if (pendingDelete.kind === "age" && editingAgeId === pendingDelete.id) setEditingAgeId(null);
      if (pendingDelete.kind === "outcome" && editingOutcomeId === pendingDelete.id) setEditingOutcomeId(null);
      setPendingDelete(null);
      await load();
      notify.success("Silindi");
    } catch (e) {
      fail(e, "Silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  async function runImport() {
    try {
      const rows = JSON.parse(importJson) as Array<Record<string, unknown>>;
      const result = await authoringApi.importQuestions(rows);
      const ok = result.rows.filter((r) => r.ok).length;
      const msg = `${ok}/${result.rows.length} satır taslak olarak içe aktarıldı.`;
      setMessage(msg);
      notify.success(msg);
    } catch (e) {
      const message = errorMessage(e, "Import başarısız");
      setError(message);
      notify.error(message);
    }
  }

  async function ttsDemo() {
    try {
      const r = await authoringApi.tts("Listen and choose the correct picture.");
      setMessage(r.message);
      notify.info(r.message);
    } catch (e) {
      notify.error(errorMessage(e, "TTS başarısız"));
    }
  }

  const [section, setSection] = useState<string | null>("tags");
  const [tagQuery, setTagQuery] = useState("");
  const [outcomeQuery, setOutcomeQuery] = useState("");
  const [outcomeSkill, setOutcomeSkill] = useState("");
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);

  const importState = useMemo(() => {
    try {
      const parsed = JSON.parse(importJson) as unknown;
      if (!Array.isArray(parsed)) return { ok: false as const, msg: "Kök bir dizi ( [ … ] ) olmalı." };
      return { ok: true as const, msg: `${parsed.length} satır okunacak.` };
    } catch {
      return { ok: false as const, msg: "Geçerli JSON değil." };
    }
  }, [importJson]);

  const tagTerm = tagQuery.trim().toLocaleLowerCase("tr-TR");
  const shownTags = tags.filter((t) => !tagTerm || t.name.toLocaleLowerCase("tr-TR").includes(tagTerm));
  const outTerm = outcomeQuery.trim().toLocaleLowerCase("tr-TR");
  const shownOutcomes = outcomes.filter(
    (o) =>
      (!outcomeSkill || o.skill === outcomeSkill) &&
      (!outTerm || `${o.code} ${o.description}`.toLocaleLowerCase("tr-TR").includes(outTerm)),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="İçerik ayarları"
        description="Soru yazarken kullanılan sözlükler: etiketler, yaş bantları ve kazanımlar. Genel merkez kayıtları da listelenir; onlar değiştirilemez. Kurum kendi kaydını ekleyebilir."
      />
      {error ? <ErrorState title="Ayarlar yüklenemedi" message={error} onRetry={() => void load().catch((e) => setError(errorMessage(e, "Yüklenemedi")))} compact /> : null}

      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <FilterTabs
          label="Ayar bölümleri"
          value={section}
          onChange={(v) => setSection(v ?? "tags")}
          items={[
            { label: "Etiketler", value: "tags", count: tags.length },
            { label: "Yaş bantları", value: "ages", count: ageBands.length },
            { label: "Kazanımlar", value: "outcomes", count: outcomes.length },
            { label: "Toplu içe aktarma", value: "import" },
            { label: "Geliştirici araçları", value: "dev" },
          ]}
        />
      </div>

      {section === "tags" ? (
        <FormCard
          title="Etiketler"
          description="Konu, tema ya da kaynak etiketleri (ör. aile, hayvanlar, Unit 3). Soru sınıflandırmasında seçilir; soru bankasında filtrelenir. Genel merkez etiketleri salt okunur."
        >
          <FormGroup title="Yeni etiket">
            <form
              className="flex items-start gap-2 sm:max-w-xl"
              onSubmit={(e) => {
                e.preventDefault();
                if (tagName.trim()) void addTag();
              }}
            >
              <div className="min-w-0 flex-1">
                <Field label="Etiket adı" hint="Enter ile de ekleyebilirsiniz.">
                  <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="ör. hayvanlar" />
                </Field>
              </div>
              <FieldAction>
                <Button type="submit" disabled={!tagName.trim()}>Ekle</Button>
              </FieldAction>
            </form>
          </FormGroup>
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-fg-muted">
              <span className="font-semibold text-fg tabular-nums">{tags.length}</span> etiket
              {tagTerm ? <> · <span className="tabular-nums">{shownTags.length}</span> eşleşme</> : null}
            </p>
            <div className="sm:w-60">
              <Input type="search" icon={<IconSearch />} value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} placeholder="Etiket ara" aria-label="Etiket ara" />
            </div>
          </div>
          {shownTags.length === 0 ? (
            <EmptyState compact tone={tags.length ? "neutral" : "primary"} title={tags.length ? "Eşleşen etiket yok" : "Henüz etiket yok"} description={tags.length ? "Aramayı değiştirin." : "Soruları gruplamak için yukarıdan ilk etiketi ekleyin."} />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {shownTags.map((tag) =>
                editingTagId === tag.id ? (
                  <li key={tag.id} className="flex items-center gap-1 rounded-full bg-primary-50 py-0.5 pr-1 pl-1 ring-1 ring-primary-200">
                    <form
                      className="flex items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingTagName.trim()) void saveTag(tag.id);
                      }}
                    >
                      <Input autoFocus className="h-7 w-40 rounded-full" value={editingTagName} onChange={(e) => setEditingTagName(e.target.value)} aria-label="Etiket adı" />
                      <Button size="sm" type="submit" disabled={!editingTagName.trim()}>Kaydet</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTagId(null)}>Vazgeç</Button>
                    </form>
                  </li>
                ) : (
                  <li key={tag.id} className="group flex items-center gap-0.5 rounded-full bg-neutral-100 py-1 pr-1 pl-3 text-[13px] text-fg ring-1 ring-border">
                    {tag.name}
                    {tag.ownerOrgId && tag.ownerOrgId !== tenant?.id ? (
                      <span className="ml-1 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle">Genel merkez</span>
                    ) : (
                      <span className="inline-flex items-center">
                        <button
                          type="button"
                          aria-label={`${tag.name} etiketini düzenle`}
                          className="ml-1 grid size-11 place-items-center rounded-full text-fg-subtle hover:bg-surface hover:text-primary"
                          onClick={() => {
                            setEditingTagId(tag.id);
                            setEditingTagName(tag.name);
                          }}
                        >
                          <IconEdit className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label={`${tag.name} etiketini sil`}
                          className="grid size-11 place-items-center rounded-full text-fg-subtle hover:bg-danger-bg hover:text-danger"
                          onClick={() => setPendingDelete({ kind: "tag", id: tag.id, label: tag.name })}
                        >
                          <IconTrash className="size-3.5" aria-hidden />
                        </button>
                      </span>
                    )}
                  </li>
                ),
              )}
            </ul>
          )}
        </FormCard>
      ) : null}

      {section === "ages" ? (
        <FormCard
          title="Yaş bantları"
          description="Soru sınıflandırmasındaki “Yaş bandı” listesi; sıra numarasına göre dizilir. Genel merkez bantları her zaman görünür ve değiştirilemez. Kurum kendi bandını ekleyebilir."
        >
          <FormGroup title="Yeni yaş bandı">
            <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_minmax(0,7rem)_auto]">
              <Field label="Kod" hint="Kısa, boşluksuz"><Input className="font-mono" value={ageCode} onChange={(e) => setAgeCode(e.target.value)} placeholder="10-12" /></Field>
              <Field label="Görünen ad"><Input value={ageLabel} onChange={(e) => setAgeLabel(e.target.value)} placeholder="10–12 yaş" /></Field>
              <Field label="Sıra" hint="Boş = sona"><Input type="number" min={0} value={ageSort} onChange={(e) => setAgeSort(e.target.value)} placeholder={String(ageBands.length + 1)} /></Field>
              <FieldAction>
                <Button onClick={() => void addAgeBand()} disabled={!ageCode.trim() || !ageLabel.trim()}>Ekle</Button>
              </FieldAction>
            </div>
          </FormGroup>
          {ageBands.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[13px] text-fg-subtle">Yaş bandı yok; HQ varsayılanları kullanılıyor.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg ring-1 ring-border">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-neutral-50 text-left text-[11.5px] tracking-wide text-fg-subtle">
                    <th className="w-16 px-3 py-2 text-right font-semibold">Sıra</th>
                    <th className="px-3 py-2 font-semibold">Kod</th>
                    <th className="px-3 py-2 font-semibold">Görünen ad</th>
                    <th className="px-3 py-2 font-semibold">Kaynak</th>
                    <th className="px-3 py-2"><span className="sr-only">İşlem</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...ageBands].sort((a, b) => a.sortOrder - b.sortOrder).map((band) => {
                    const owned = band.ownerOrgId === tenant?.id;
                    if (editingAgeId === band.id) {
                      return (
                        <tr key={band.id} className="bg-primary-50/30">
                          <td className="px-3 py-2"><Input type="number" min={0} aria-label="Sıra" value={editingAge.sortOrder} onChange={(e) => setEditingAge({ ...editingAge, sortOrder: e.target.value })} /></td>
                          <td className="px-3 py-2"><Input className="font-mono" aria-label="Kod" value={editingAge.code} onChange={(e) => setEditingAge({ ...editingAge, code: e.target.value })} /></td>
                          <td className="px-3 py-2"><Input aria-label="Görünen ad" value={editingAge.label} onChange={(e) => setEditingAge({ ...editingAge, label: e.target.value })} /></td>
                          <td />
                          <td className="px-3 py-2">
                            <span className="flex justify-end gap-1">
                              <Button size="sm" onClick={() => void saveAgeBand(band.id)} disabled={!editingAge.code.trim() || !editingAge.label.trim()}>Kaydet</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingAgeId(null)}>Vazgeç</Button>
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={band.id}>
                        <td className="px-3 py-2 text-right tabular-nums text-fg-subtle">{band.sortOrder}</td>
                        <td className="px-3 py-2 font-mono text-xs">{band.code}</td>
                        <td className="px-3 py-2 font-medium text-fg">{band.label}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${owned ? "bg-primary-50 text-primary" : "bg-neutral-100 text-fg-subtle"}`}>{owned ? "Kurum" : "Genel merkez"}</span>
                        </td>
                        <td className="px-3 py-2">
                          {owned ? (
                            <span className="flex justify-end gap-0.5">
                              <Button size="sm" variant="ghost" aria-label={`${band.label} düzenle`} title="Düzenle" onClick={() => { setEditingAgeId(band.id); setEditingAge({ code: band.code, label: band.label, sortOrder: String(band.sortOrder) }); }}>
                                <IconEdit className="size-3.5" aria-hidden />
                              </Button>
                              <Button size="sm" variant="ghost" aria-label={`${band.label} sil`} title="Sil" onClick={() => setPendingDelete({ kind: "age", id: band.id, label: band.label })}>
                                <IconTrash className="size-3.5" aria-hidden />
                              </Button>
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </FormCard>
      ) : null}

      {section === "outcomes" ? (
        <FormCard
          title="Kazanımlar (öğrenme çıktıları)"
          description="Soru editörünün Cevap ve puanlama adımında seçilir; karne ve kazanım raporları bu kayıtlarla hesaplanır. Kod ve çerçeve oluşturulduktan sonra değiştirilemez. Genel merkez kazanımları salt okunur."
          aside={
            <Button size="sm" variant={showOutcomeForm ? "ghost" : "primary"} onClick={() => setShowOutcomeForm((v) => !v)}>
              {showOutcomeForm ? "Formu kapat" : "+ Yeni kazanım"}
            </Button>
          }
        >
          {showOutcomeForm ? (
            <div className="rounded-lg bg-neutral-50 p-3 ring-1 ring-border ring-inset">
              <OutcomeFields
                draft={outcomeDraft}
                onChange={setOutcomeDraft}
                onSubmit={() => void addOutcome()}
                onCancel={() => setShowOutcomeForm(false)}
                submitLabel="Kazanımı ekle"
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Input type="search" icon={<IconSearch />} value={outcomeQuery} onChange={(e) => setOutcomeQuery(e.target.value)} placeholder="Kod veya açıklama ara" aria-label="Kazanım ara" />
            </div>
            <div className="sm:w-44">
              <Select value={outcomeSkill} onChange={(e) => setOutcomeSkill(e.target.value)} aria-label="Beceri filtresi">
                <option value="">Tüm beceriler</option>
                {SKILLS.map((s) => <option key={s} value={s}>{SKILL_LABEL[s]}</option>)}
              </Select>
            </div>
          </div>
          {shownOutcomes.length === 0 ? (
            <EmptyState compact tone={outcomes.length ? "neutral" : "primary"} title={outcomes.length ? "Filtreye uyan kazanım yok" : "Henüz kazanım yok"} description={outcomes.length ? "Filtreyi ya da aramayı değiştirin." : "Kazanımlar soruların hangi öğrenme çıktısını ölçtüğünü gösterir. Yukarıdan ilk kazanımı ekleyin."} />
          ) : (
            <ul className="divide-y divide-border rounded-lg ring-1 ring-border">
              {shownOutcomes.map((outcome) => (
                <li key={outcome.id} className="px-3 py-2.5">
                  {editingOutcomeId === outcome.id ? (
                    <OutcomeFields
                      draft={editingOutcome}
                      lockIdentity
                      onChange={setEditingOutcome}
                      onSubmit={() => void saveOutcome(outcome.id)}
                      onCancel={() => setEditingOutcomeId(null)}
                      submitLabel="Kaydet"
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-fg-muted">{outcome.code}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-fg">{outcome.description}</p>
                        <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                          {outcome.ownerOrgId && outcome.ownerOrgId !== tenant?.id ? (
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium text-fg-subtle">Genel merkez</span>
                          ) : null}
                          {outcome.framework ? <span className="rounded bg-primary-50 px-1.5 py-0.5 font-medium text-primary">{outcome.framework}</span> : null}
                          {outcome.skill ? <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-fg-muted">{SKILL_LABEL[outcome.skill as keyof typeof SKILL_LABEL] ?? outcome.skill}</span> : null}
                          {outcome.cefrLevel ? <span className="rounded bg-(--accent-plum-bg) px-1.5 py-0.5 font-mono font-semibold text-(--accent-plum)">{outcome.cefrLevel}</span> : null}
                          {outcome.gradeLevel != null ? <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-fg-muted">MEB {outcome.gradeLevel}. sınıf</span> : null}
                        </p>
                      </div>
                      {outcome.ownerOrgId && outcome.ownerOrgId !== tenant?.id ? null : (
                      <span className="flex shrink-0 gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`${outcome.code} düzenle`}
                          title="Düzenle"
                          onClick={() => {
                            setEditingOutcomeId(outcome.id);
                            setEditingOutcome({
                              framework: outcome.framework ?? "ILC",
                              code: outcome.code,
                              description: outcome.description,
                              skill: outcome.skill ?? "READING",
                              cefrLevel: outcome.cefrLevel ?? "A1",
                              gradeLevel: outcome.gradeLevel != null ? String(outcome.gradeLevel) : "",
                            });
                          }}
                        >
                          <IconEdit className="size-3.5" aria-hidden />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label={`${outcome.code} sil`} title="Sil" onClick={() => setPendingDelete({ kind: "outcome", id: outcome.id, label: outcome.code })}>
                          <IconTrash className="size-3.5" aria-hidden />
                        </Button>
                      </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </FormCard>
      ) : null}

      {section === "import" ? (
        <FormCard
          title="Toplu soru içe aktarma"
          description="Her satır bir taslak soru oluşturur; içerik daha sonra soru editöründe tamamlanır. Mevcut sorular etkilenmez."
          footer={
            <>
              {message ? <FormMessage tone="success">{message}</FormMessage> : <span className={`text-xs sm:mr-auto ${importState.ok ? "text-fg-subtle" : "text-danger"}`}>{importState.msg}</span>}
              <Button onClick={() => void runImport()} disabled={!importState.ok}>İçe aktar</Button>
            </>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <Field label="JSON satırları" hint="Köşeli parantez içinde nesne dizisi.">
              <Textarea rows={10} className="font-mono text-xs" value={importJson} onChange={(e) => { setImportJson(e.target.value); setMessage(null); }} spellCheck={false} />
            </Field>
            <div className="grid content-start gap-2 rounded-lg bg-neutral-50 p-3 text-xs ring-1 ring-border ring-inset">
              <p className="text-[13px] font-semibold text-fg">Alanlar</p>
              <dl className="grid gap-1.5">
                {[
                  ["interactionType", "Soru tipi, ör. MULTIPLE_CHOICE, TRUE_FALSE"],
                  ["skill", "READING, LISTENING, WRITING, SPEAKING…"],
                  ["cefrLevel", "PRE_A1, A1 … C2"],
                  ["ageBand", "Yaş bandı kodu, ör. 10-12"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono font-semibold text-fg">{k}</dt>
                    <dd className="text-fg-muted">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </FormCard>
      ) : null}

      {section === "dev" ? (
        <FormCard title="Geliştirici araçları" description="Metinden sese (TTS) ve sesten metne (STT) servislerinin bağlantı testi. Sonuç bildirim olarak gösterilir; içerik değişmez.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 rounded-lg border border-border p-3">
              <p className="text-[13px] font-semibold text-fg">Metinden sese (TTS)</p>
              <p className="text-xs text-fg-muted">Örnek cümleyi seslendirme servisine gönderir.</p>
              <Button variant="secondary" size="sm" className="w-fit" onClick={() => void ttsDemo()}>TTS’i dene</Button>
            </div>
            <div className="grid gap-2 rounded-lg border border-border p-3">
              <p className="text-[13px] font-semibold text-fg">Sesten metne (STT)</p>
              <p className="text-xs text-fg-muted">Örnek kayıt kimliğiyle yazıya çevirme servisini çağırır.</p>
              <Button
                variant="secondary"
                size="sm"
                className="w-fit"
                onClick={() =>
                  void notify
                    .run(authoringApi.stt("00000000-0000-0000-0000-000000000001"), { error: "STT başarısız" })
                    .then((r) => notify.info(r.message))
                    .catch(() => undefined)
                }
              >
                STT’yi dene
              </Button>
            </div>
          </div>
          {message ? <p className="text-[13px] text-fg-muted">Son yanıt: {message}</p> : null}
        </FormCard>
      ) : null}

      <ConfirmDialog
        open={pendingDelete != null}
        title={pendingDelete?.kind === "tag" ? "Etiketi sil" : pendingDelete?.kind === "age" ? "Yaş bandını kaldır" : "Kazanımı kaldır"}
        description={
          pendingDelete?.kind === "tag"
            ? `“${pendingDelete.label}” kalıcı silinir. Soru veya sınavda kullanılıyorsa silinemez.`
            : pendingDelete?.kind === "age"
              ? `“${pendingDelete.label}” listeden kalkar. Sorularda kayıtlı kod değişmez.`
              : `“${pendingDelete?.label ?? ""}” seçiciden kalkar. Bağlı sorulardaki kayıt kalır.`
        }
        confirmLabel="Sil"
        pending={deleting}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function OutcomeFields({
  draft,
  lockIdentity,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  draft: typeof emptyOutcome;
  lockIdentity?: boolean;
  onChange: (next: typeof emptyOutcome) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,7rem)_minmax(0,1fr)_minmax(0,9rem)_minmax(0,7rem)_minmax(0,7rem)]">
        <Field label="Çerçeve" hint={lockIdentity ? "Değiştirilemez" : undefined}>
          <Select value={draft.framework} disabled={lockIdentity} onChange={(e) => onChange({ ...draft, framework: e.target.value })}>
            {FRAMEWORKS.map((framework) => <option key={framework} value={framework}>{framework}</option>)}
          </Select>
        </Field>
        <Field label="Kod" required hint={lockIdentity ? "Değiştirilemez" : "Benzersiz, ör. CAN-READ-A1-01"}>
          <Input className="font-mono" value={draft.code} disabled={lockIdentity} onChange={(e) => onChange({ ...draft, code: e.target.value.toUpperCase() })} placeholder="CAN-READ-A1-01" />
        </Field>
        <Field label="Beceri">
          <Select value={draft.skill} onChange={(e) => onChange({ ...draft, skill: e.target.value })}>
            {SKILLS.map((skill) => <option key={skill} value={skill}>{SKILL_LABEL[skill]}</option>)}
          </Select>
        </Field>
        <Field label="CEFR">
          <Select value={draft.cefrLevel} onChange={(e) => onChange({ ...draft, cefrLevel: e.target.value })}>
            {CEFR.map((level) => <option key={level} value={level}>{level}</option>)}
          </Select>
        </Field>
        <Field label="MEB sınıfı" hint="İsteğe bağlı">
          <Input type="number" min={1} max={12} suffix=". sınıf" value={draft.gradeLevel} onChange={(e) => onChange({ ...draft, gradeLevel: e.target.value })} />
        </Field>
      </div>
      <Field label="Açıklama" required hint="Öğrencinin yapabildiği şey, “Can …” kalıbıyla.">
        <Textarea rows={2} value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} placeholder="Can understand short simple texts" />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? <Button variant="ghost" onClick={onCancel}>Vazgeç</Button> : null}
        <Button onClick={onSubmit} disabled={!draft.code.trim() || !draft.description.trim()}>{submitLabel}</Button>
      </div>
    </div>
  );
}
