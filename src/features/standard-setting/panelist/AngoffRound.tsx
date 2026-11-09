"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMySheetQueryKey, useSubmitAngoff } from "@/src/api/generated/standart-belirleme/standart-belirleme";
import type { SheetView } from "@/src/api/generated/models";
import { useCentralRequest } from "@/src/features/psychometrics/central";
import { SheetItemBody, SheetItemMeta } from "@/src/features/standard-setting/panelist/SheetItemView";
import { ProgressBar } from "@/src/features/standard-setting/panelist/ProgressBar";
import {
  angoffFilledCount,
  angoffInvalidIds,
  angoffPayload,
  draftFromSheet,
  isDraftDirty,
  type AngoffDraft,
} from "@/src/features/standard-setting/model";
import { Button, Field, FormCard, Input, errorMessage, notify } from "@/src/ui";

/**
 * Angoff kâğıdı: her madde için "sınırdaki aday bu maddeyi doğru yapar" olasılığı (0–1). Kısmi kayıt yapılabilir;
 * kayıtlı değerler yeniden açıldığında gelir. Geçersiz giriş (aralık dışı/sayı değil) kaydı engeller — sessizce atlanmaz.
 */
export function AngoffRound({ sheet }: { sheet: SheetView }) {
  const { request } = useCentralRequest();
  const queryClient = useQueryClient();
  const submit = useSubmitAngoff({ request });
  const items = sheet.items ?? [];
  const [draft, setDraft] = useState<AngoffDraft>(() => draftFromSheet(items));
  const [error, setError] = useState<string | null>(null);

  const invalid = new Set(angoffInvalidIds(draft));
  const dirty = isDraftDirty(items, draft);
  const filled = angoffFilledCount(items, draft);

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  async function save() {
    if (invalid.size > 0) return setError("Geçersiz değerler var: olasılık 0 ile 1 arasında bir sayı olmalı.");
    setError(null);
    try {
      const result = await submit.mutateAsync({ studyId: sheet.studyId!, data: { ratings: angoffPayload(draft) } });
      queryClient.setQueryData(getMySheetQueryKey(sheet.studyId!), result);
      setDraft(draftFromSheet(result.data.items ?? []));
      notify.success("Puanlarınız kaydedildi");
    } catch (e) {
      // Tur kapanmış, kimlik süresi dolmuş vb.: backend mesajı gösterilir.
      setError(errorMessage(e, "Puanlar kaydedilemedi"));
    }
  }

  return (
    <div className="space-y-4">
      <FormCard
        title="Angoff puanlaması"
        description="Her madde için, asgari yeterlikteki (sınırdaki) bir adayın maddeyi doğru yanıtlama olasılığını 0 ile 1 arasında girin (örn. 0,65). Bu bir tahmindir; doğru cevap gösterilmez."
        aside={
          <Button onClick={() => void save()} loading={submit.isPending} disabled={!dirty || invalid.size > 0}>
            Puanları kaydet
          </Button>
        }
      >
        <ProgressBar label="Kayıtlı ilerleme" done={sheet.ratedCount} total={sheet.totalCount} />
        <p className="text-[13px] text-fg-muted">
          Bu ekranda doldurulan: {filled}/{items.length}
          {dirty ? " — kaydedilmemiş değişiklikleriniz var" : ""}
        </p>
        {error ? (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        ) : null}
      </FormCard>

      {items.map((item, index) => {
        const id = item.questionVersionId!;
        const bad = invalid.has(id);
        return (
          <FormCard key={id} title={`Madde ${item.ordinal ?? index + 1}`} description={undefined}>
            <SheetItemMeta item={item} />
            <SheetItemBody item={item} />
            <div className="max-w-xs">
              <Field label="Doğru yapma olasılığı (0–1)" error={bad ? "0 ile 1 arasında bir sayı girin" : undefined}>
                <Input
                  inputMode="decimal"
                  value={draft[id] ?? ""}
                  onChange={(event) => setDraft((d) => ({ ...d, [id]: event.target.value }))}
                  placeholder="örn. 0,65"
                  aria-label={`Madde ${item.ordinal ?? index + 1} olasılığı`}
                />
              </Field>
            </div>
          </FormCard>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={() => void save()} loading={submit.isPending} disabled={!dirty || invalid.size > 0}>
          Puanları kaydet
        </Button>
      </div>
    </div>
  );
}
