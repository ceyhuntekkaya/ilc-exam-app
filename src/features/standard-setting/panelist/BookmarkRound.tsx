"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMySheetQueryKey, useSubmitBookmark } from "@/src/api/generated/standart-belirleme/standart-belirleme";
import type { SheetView } from "@/src/api/generated/models";
import { useCentralRequest } from "@/src/features/psychometrics/central";
import { ProgressBar } from "@/src/features/standard-setting/panelist/ProgressBar";
import { SheetItemBody, SheetItemMeta } from "@/src/features/standard-setting/panelist/SheetItemView";
import { bookmarkPositionLabel, isValidBookmark } from "@/src/features/standard-setting/model";
import { Badge, Button, FormCard, errorMessage, notify } from "@/src/ui";

/**
 * Bookmark kâğıdı: maddeler kolaydan zora sıralıdır; panelist sınırdaki adayın doğru yapamayacağını düşündüğü İLK maddeyi
 * işaretler (listenin sonu = adayın hepsini yapacağı). Zorluk değeri hiçbir yerde gösterilmez; yalnız sıra konumu.
 */
export function BookmarkRound({ sheet }: { sheet: SheetView }) {
  const { request } = useCentralRequest();
  const queryClient = useQueryClient();
  const submit = useSubmitBookmark({ request });
  const items = sheet.items ?? [];
  const saved = sheet.bookmarkPosition ?? null;
  const [position, setPosition] = useState<number | null>(saved);
  const [error, setError] = useState<string | null>(null);
  const dirty = position !== saved;

  async function save() {
    if (!isValidBookmark(position, items.length)) return setError("İşaret konumu seçin.");
    setError(null);
    try {
      const result = await submit.mutateAsync({ studyId: sheet.studyId!, data: { position } });
      queryClient.setQueryData(getMySheetQueryKey(sheet.studyId!), result);
      setPosition(result.data.bookmarkPosition ?? position);
      notify.success("İşaretiniz kaydedildi");
    } catch (e) {
      setError(errorMessage(e, "İşaret kaydedilemedi"));
    }
  }

  return (
    <div className="space-y-4">
      <FormCard
        title="Bookmark işaretleme"
        description="Maddeler kolaydan zora doğru sıralıdır. Asgari yeterlikteki (sınırdaki) bir adayın doğru yanıtlayamayacağını düşündüğünüz ilk maddeyi işaretleyin. Adayın tüm maddeleri yapacağını düşünüyorsanız listenin sonunu seçin."
        aside={
          <Button onClick={() => void save()} loading={submit.isPending} disabled={!dirty || position === null}>
            İşareti kaydet
          </Button>
        }
      >
        <ProgressBar label="Kayıtlı ilerleme" done={sheet.ratedCount} total={sheet.totalCount} />
        <p className="text-[13px] text-fg-muted">
          Seçili konum: <span className="font-medium text-fg">{position ? bookmarkPositionLabel(position, items.length) : "henüz seçilmedi"}</span>
          {dirty && position ? " — kaydedilmedi" : ""}
        </p>
        {error ? (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        ) : null}
      </FormCard>

      <fieldset className="space-y-3">
        <legend className="sr-only">İşaret konumu</legend>
        {items.map((item, index) => {
          const pos = index + 1;
          const selected = position === pos;
          return (
            <FormCard key={item.questionVersionId} title={`${pos}. madde`} aside={selected ? <Badge tone="brand">İşaretli</Badge> : null} className={selected ? "ring-2 ring-primary/40" : undefined}>
              <SheetItemMeta item={item} showCefr={false} />
              <SheetItemBody item={item} />
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-fg">
                <input type="radio" name="bookmark" checked={selected} onChange={() => setPosition(pos)} className="size-4" />
                Sınırdaki aday bu maddeyi yapamaz (buraya işaret koy)
              </label>
            </FormCard>
          );
        })}
        {items.length > 0 ? (
          <FormCard title="Listenin sonu" className={position === items.length + 1 ? "ring-2 ring-primary/40" : undefined}>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-fg">
              <input type="radio" name="bookmark" checked={position === items.length + 1} onChange={() => setPosition(items.length + 1)} className="size-4" />
              Sınırdaki aday tüm maddeleri yapar (işareti listenin sonuna koy)
            </label>
          </FormCard>
        ) : null}
      </fieldset>

      <div className="flex justify-end">
        <Button onClick={() => void save()} loading={submit.isPending} disabled={!dirty || position === null}>
          İşareti kaydet
        </Button>
      </div>
    </div>
  );
}
