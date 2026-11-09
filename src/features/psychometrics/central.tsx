"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { authoringApi, type QuestionSummary } from "@/src/features/authoring/shared/client";
import { Button, Field, Input, errorMessage } from "@/src/ui";

/**
 * Merkez uçlarına (anchor, DIF, standart belirleme, kazanım ağacı) giden isteklerin ortak ayarı.
 * Super Admin için backend kiracıyı `X-Company-Id` başlığından alır (ILC Content); personelde başlık kendi kurumudur.
 * Üretilmiş kancalar bu başlığı kendiliğinden eklemez, `request` seçeneği olarak geçilir. Kiracı yüklenene kadar
 * `ready=false` — sorgular `enabled: ready` ile bekletilir (başlıksız istek 400 "İçerik kiracısı gerekli" döner).
 */
export function useCentralRequest() {
  const { tenant } = useAuthoringTenant();
  const tenantId = tenant?.id ?? null;
  return useMemo(
    () => ({
      ready: tenantId !== null,
      tenantId,
      request: tenantId ? { headers: { "X-Company-Id": tenantId } } : undefined,
    }),
    [tenantId],
  );
}

/** Türkçe tarih-saat; boş/bozuk değer için tire. */
export function formatWhen(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Soru sürümü seçici: koda/metne göre arar (`GET /authoring/questions`). Madde listeleme için ayrı bir kimlikle arama
 * ucu olmadığından anchor ve DIF ekranları sürümü buradan seçer.
 */
export function QuestionVersionPicker({
  onPick,
  status,
  label = "Madde ara",
  actionLabel = "Seç",
  excludeIds,
}: {
  onPick: (row: QuestionSummary) => void;
  /** Yalnız bu durumdaki sürümler (ör. anchor için APPROVED). */
  status?: string;
  label?: string;
  actionLabel?: string;
  excludeIds?: readonly string[];
}) {
  const { tenant } = useAuthoringTenant();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<QuestionSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim() || !tenant) return;
    setBusy(true);
    setError(null);
    try {
      const found = await authoringApi.listQuestions({ q: query.trim(), status });
      setRows(found);
      setSearched(true);
    } catch (e) {
      setError(errorMessage(e, "Arama başarısız"));
    } finally {
      setBusy(false);
    }
  }

  const visible = rows.filter((row) => !excludeIds?.includes(row.versionId));

  return (
    <div className="grid gap-3">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => void search(event)}>
        <Field label={label} hint="Kod veya metin">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Örn. RD-0142" />
        </Field>
        <Button type="submit" variant="secondary" disabled={busy || !tenant || !query.trim()}>
          {busy ? "Aranıyor…" : "Ara"}
        </Button>
      </form>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {searched && visible.length === 0 ? <p className="text-sm text-fg-muted">Eşleşen madde sürümü bulunamadı.</p> : null}
      {visible.length > 0 ? (
        <ul className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-border p-1">
          {visible.map((row) => (
            <li key={row.versionId} className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 hover:bg-neutral-50">
              <span className="text-sm">
                <span className="font-mono text-xs">{row.code ?? "—"}</span>
                <span className="text-fg-subtle"> · v{row.versionNo}</span>
                {row.cefrLevel ? <span className="ml-2 text-fg-subtle">{row.cefrLevel}</span> : null}
                {row.primarySkill ? <span className="ml-2 text-fg-subtle">{row.primarySkill}</span> : null}
              </span>
              <Button type="button" size="sm" variant="secondary" onClick={() => onPick(row)}>
                {actionLabel}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
