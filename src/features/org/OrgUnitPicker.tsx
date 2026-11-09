"use client";

import { useId, useMemo, useState } from "react";
import type { UnitNode } from "@/src/api/generated/models";
import { filterUnits, shortId, unitLabel } from "@/src/features/org/scopeModel";
import { cn } from "@/src/lib/utils/cn";
import { Badge, Button, Input, Spinner, errorMessage } from "@/src/ui";

/** Girinti en çok bu kadar kademe (çok derin ağaçta satır taşmasın). */
const MAX_INDENT = 10;

/**
 * E-44: kurumun birim ağacından (ön-sıra düz liste, `depth` ile girintili) tek birim seçtiren liste. Veriyi dışarıdan alır;
 * yükleme/boş/hata/kesilme durumlarını kendisi gösterir. Hangi birimin atanabileceğine karar vermez (kök birim vb. kuralları
 * sunucu uygular ve mesajı ekranda aynen çıkar); `ROOT` türü yalnız rozetle belirtilir.
 */
export function OrgUnitPicker({
  items,
  loading,
  error,
  onRetry,
  truncated,
  warning,
  value,
  onChange,
  invalidMessage,
}: {
  items: UnitNode[];
  loading: boolean;
  error: unknown;
  onRetry?: () => void;
  truncated?: boolean;
  warning?: string;
  value: string;
  onChange: (id: string) => void;
  invalidMessage?: string;
}) {
  const labelId = useId();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => filterUnits(items, query), [items, query]);
  const selected = value ? items.find((n) => n.id === value) : undefined;

  let body: React.ReactNode;
  if (error) {
    body = (
      <div role="alert" className="grid gap-2 rounded-md bg-danger-bg px-3 py-2 text-[13px] text-danger">
        <p>{errorMessage(error, "Birim listesi alınamadı")}</p>
        {onRetry ? (
          <div>
            <Button type="button" size="sm" variant="ghost" onClick={onRetry}>
              Tekrar dene
            </Button>
          </div>
        ) : null}
      </div>
    );
  } else if (loading) {
    body = <Spinner label="Birimler yükleniyor" />;
  } else if (items.length === 0) {
    body = <p className="rounded-md bg-warning-bg px-3 py-2 text-[13px] text-warning">Seçilebilir birim yok. Önce kurumda birim oluşturulmalı ya da kapsamınızda birim bulunmalı.</p>;
  } else {
    body = (
      <>
        <Input
          type="search"
          aria-label="Birim ara"
          placeholder="Birim adı veya kodu ara"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {rows.length === 0 ? (
          <p className="text-[13px] text-fg-muted">Aramanızla eşleşen birim yok.</p>
        ) : (
          <div role="listbox" aria-labelledby={labelId} data-testid="unit-options" className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {rows.map(({ node, match }) => {
              const isSelected = node.id === value;
              return (
                <button
                  key={node.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => node.id && onChange(node.id)}
                  style={{ paddingLeft: `${0.75 + Math.min(node.depth ?? 0, MAX_INDENT) * 1.25}rem` }}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 border-b border-border py-1.5 pr-3 text-left text-[13px] last:border-b-0 hover:bg-bg focus-visible:bg-bg focus-visible:outline-none",
                    isSelected && "bg-primary-50 font-medium",
                    !match && "text-fg-subtle",
                  )}
                >
                  <span className="min-w-0 truncate">{unitLabel(node)}</span>
                  {node.code ? <span className="shrink-0 font-mono text-xs text-fg-subtle">{node.code}</span> : null}
                  {node.unitType === "ROOT" ? <Badge tone="neutral">Kök</Badge> : null}
                  {node.status === "PASSIVE" ? <Badge tone="warning">Pasif</Badge> : null}
                </button>
              );
            })}
          </div>
        )}
        {truncated ? (
          <p role="status" className="rounded-md bg-warning-bg px-3 py-2 text-[13px] text-warning">
            {warning?.trim() || "Birim listesi sunucu üst sınırında kesildi; tüm birimler gösterilmiyor."}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div role="group" aria-labelledby={labelId} className="grid gap-2">
      <span id={labelId} className="text-[13px] font-medium text-fg">
        Birim <span className="text-danger">*</span>
      </span>
      <p className="text-xs leading-relaxed text-fg-subtle">Kök birim atanamaz. Yalnız yetki alanınızdaki birimler listelenir.</p>
      {body}
      {value ? (
        <p className="text-[13px] text-fg-muted" data-testid="unit-selected">
          Seçili: <span className="font-medium text-fg">{selected ? unitLabel(selected) : shortId(value)}</span>
          {selected?.code ? <span className="font-mono text-xs"> ({selected.code})</span> : null}
          {!selected ? <span className="font-mono text-xs" title={value}> · listede yok</span> : null}
        </p>
      ) : null}
      {invalidMessage ? <p role="alert" className="text-xs text-danger">{invalidMessage}</p> : null}
    </div>
  );
}
