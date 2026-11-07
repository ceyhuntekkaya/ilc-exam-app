"use client";

import { useState } from "react";
import {
  getConsumptionQueryKey,
  getPackagesQueryKey,
  useConsumption,
  useEntries,
  usePackages,
} from "@/src/api/generated/company-ledger/company-ledger";
import type { EntryRow, PackageBalance, PackageConsumption } from "@/src/api/generated/models";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  SectionTable,
  Skeleton,
} from "@/src/ui";

const PACKAGE_COLUMNS = ["SKU", "Kapsam", "Birim", "Geçerlilik", "Kota", "Durum", "Bakiye (toplam/mevcut)", ""];
const CONSUMPTION_COLUMNS = ["SKU", "Kapsam", "Birim", "Geçerlilik", "Kota", "Durum", "Mevcut bakiye", "Tüketilen (CONSUMED)"];
const ENTRY_COLUMNS = ["Tarih", "Tip", "Miktar", "Referans", "Oluşturan"];

const SCOPE_LABEL: Record<string, string> = {
  COMPANY: "Kurum geneli",
  ORG_UNIT: "Birim",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  EXPIRED: "warning",
  CANCELLED: "danger",
};

const ENTRY_TYPE_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  ALLOCATED: "info",
  CONSUMED: "warning",
  RELEASED: "success",
  REFUNDED: "neutral",
};

/** Kısa kimlik: tablo satırında tüm UUID yer kaplamasın. */
function shortId(value?: string | null) {
  if (!value) return "—";
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

/** `LocalDate` ("2026-01-01") — saat dilimi kaymasın diye UTC'de biçimlenir. */
function dateOnly(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR", { timeZone: "UTC" });
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function scopeCell(row: { scope?: string; orgUnitId?: string }) {
  if (row.scope === "ORG_UNIT") return `Birim · ${shortId(row.orgUnitId)}`;
  return SCOPE_LABEL[row.scope ?? ""] ?? row.scope ?? "—";
}

function Header({ title, description }: { title: string; description?: string }) {
  return (
    <div className="grid gap-1">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description ? <p className="max-w-2xl text-sm text-fg-muted">{description}</p> : null}
    </div>
  );
}

/**
 * Kota bakiyesi + defter hareketleri + dönem bazlı tüketim raporu. F3B-17: üç uç da
 * salt-okunur — "ayrı sayaç yok" kabul kriteri burada da geçerli, `consumedCount`
 * doğrudan gösterilir, frontend'de yeniden hesaplanmaz.
 */
export function LedgerSection({ companyId }: { companyId: string }) {
  // `companyId` URL'e girmez (/my-company/...), yalnız kurum değişince sorgu tazelensin diye
  // sorgu anahtarına eklenir — `InstitutionDeclarationSection`'daki AYNI karar.
  const packagesQ = usePackages({ query: { queryKey: [...getPackagesQueryKey(), companyId] } });
  const consumptionQ = useConsumption({ query: { queryKey: [...getConsumptionQueryKey(), companyId] } });
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const packages = packagesQ.data?.data ?? [];
  const consumption = consumptionQ.data?.data ?? [];

  if (packagesQ.isError) {
    return <ErrorState error={packagesQ.error} onRetry={() => void packagesQ.refetch()} compact />;
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Header title="Kota bakiyesi" description="Kurumun paketleri ve o paketlerin anlık bakiyesi." />
        <SectionTable
          columns={PACKAGE_COLUMNS}
          loading={packagesQ.isLoading}
          empty="Henüz kota paketi yok"
          emptyHint="Kurum için bir kota paketi tahsis edildiğinde burada listelenecektir."
          emptyTone="neutral"
          rows={packages.map((row: PackageBalance) => [
            shortId(row.skuId),
            scopeCell(row),
            row.scope === "ORG_UNIT" ? shortId(row.orgUnitId) : "—",
            `${dateOnly(row.validFrom)} → ${dateOnly(row.validUntil)}`,
            <span key="q" className="numeric">{row.quota ?? "—"}</span>,
            <Badge key="s" tone={STATUS_TONE[row.status ?? ""] ?? "neutral"} dot>
              {row.status ?? "—"}
            </Badge>,
            <span key="b" className="numeric">
              {row.totalBalance ?? 0}
              <span className="text-fg-subtle"> / {row.availableBalance ?? 0}</span>
            </span>,
            <Button
              key="a"
              size="sm"
              variant={selectedPackageId === row.packageId ? "primary" : "secondary"}
              onClick={() => setSelectedPackageId(row.packageId ?? null)}
              disabled={!row.packageId}
            >
              Hareketler
            </Button>,
          ])}
        />
      </div>

      {selectedPackageId ? (
        <EntriesPanel packageId={selectedPackageId} onClose={() => setSelectedPackageId(null)} />
      ) : null}

      <div className="grid gap-2">
        <Header
          title="Dönem bazlı tüketim raporu"
          description="Bu rapor defterden okunur; ayrı bir sayaç tutulmaz. Tüketilen sayısı, paketin CONSUMED satırlarıyla birebir aynıdır."
        />
        <SectionTable
          columns={CONSUMPTION_COLUMNS}
          loading={consumptionQ.isLoading}
          empty="Tüketim raporu boş"
          emptyHint="Kota paketi tahsis edilip kullanıldığında bu raporda görünecektir."
          emptyTone="neutral"
          rows={consumption.map((row: PackageConsumption) => [
            shortId(row.skuId),
            scopeCell(row),
            row.scope === "ORG_UNIT" ? shortId(row.orgUnitId) : "—",
            `${dateOnly(row.validFrom)} → ${dateOnly(row.validUntil)}`,
            <span key="q" className="numeric">{row.quota ?? "—"}</span>,
            <Badge key="s" tone={STATUS_TONE[row.status ?? ""] ?? "neutral"} dot>
              {row.status ?? "—"}
            </Badge>,
            <span key="b" className="numeric">{row.availableBalance ?? 0}</span>,
            <span key="c" className="numeric font-semibold">{row.consumedCount ?? 0}</span>,
          ])}
        />
      </div>
    </div>
  );
}

function EntriesPanel({ packageId, onClose }: { packageId: string; onClose: () => void }) {
  const entriesQ = useEntries(packageId);
  const entries = entriesQ.data?.data ?? [];

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Header
          title="Hareketler (defter görünümü)"
          description={`Paket ${shortId(packageId)} — tüm hareket satırları.`}
        />
        <Button size="sm" variant="ghost" onClick={onClose}>
          Kapat
        </Button>
      </div>
      {entriesQ.isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : entriesQ.isError ? (
        <ErrorState error={entriesQ.error} onRetry={() => void entriesQ.refetch()} compact />
      ) : entries.length === 0 ? (
        <EmptyState tone="neutral" title="Hareket yok" description="Bu paket için henüz bir defter satırı oluşmadı." />
      ) : (
        <SectionTable
          columns={ENTRY_COLUMNS}
          empty="Hareket yok"
          rows={entries.map((row: EntryRow) => [
            dateTime(row.createdAt),
            <Badge key="t" tone={ENTRY_TYPE_TONE[row.type ?? ""] ?? "neutral"} dot>
              {row.type ?? "—"}
            </Badge>,
            <span key="a" className="numeric">{row.amount ?? 0}</span>,
            row.reference ?? "—",
            shortId(row.createdBy),
          ])}
        />
      )}
    </div>
  );
}
