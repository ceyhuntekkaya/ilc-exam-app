"use client";

import { getEntitlementsQueryKey, useEntitlements, useOpen1 } from "@/src/api/generated/individual-attempt/individual-attempt";
import {
  entitlementsFailure,
  examPathForRecipient,
  openAttemptFailureMessage,
  openedExamPath,
  toEntitlementCard,
  validityText,
  type EntitlementCard,
} from "@/src/features/individual/entitlementModel";
import { Mascot } from "@/src/features/student/mascot";
import { KidButton, KidButtonLink, KidCard, KidError, KidLoading, KidNotice, StatusPill, type KidTone } from "@/src/features/student/ui";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PILL_TONE: Record<EntitlementCard["status"]["tone"], KidTone> = { success: "mint", warning: "coral", neutral: "neutral", info: "sky" };

/**
 * R-19 (F6-09 ekranı): bireysel adayın haklarım listesi + "Denemeyi başlat".
 * Başlat = `POST /me/individual/skus/{skuId}/open` (alıcı kaydı açar/önceki açık olanı döner), ardından mevcut öğrenci
 * sınav akışına (`/student/exams/{recipientId}`) yönlendirir; sınav ekranlarına dokunulmaz.
 */
export function EntitlementsView() {
  const query = useEntitlements();
  const open = useOpen1();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  if (query.isLoading) return <KidLoading label="Haklarınız yükleniyor…" rows={2} />;
  if (query.isError) {
    const failure = entitlementsFailure(query.error);
    if (failure.individualOnly) {
      return (
        <KidCard className="flex flex-col items-center gap-4 py-10 text-center">
          <Mascot mood="thinking" size="md" />
          <h2 className="font-kid text-xl font-bold text-slate-900">Bu bölüm bireysel adaylar içindir</h2>
          <p className="max-w-md text-slate-600">Kurum öğrencilerinin sınavları kurumları tarafından atanır; atanan sınavlar ana sayfada görünür.</p>
          <KidButtonLink href="/student" variant="soft">
            Ana sayfa
          </KidButtonLink>
        </KidCard>
      );
    }
    return <KidError title="Haklar yüklenemedi" message={failure.message} onRetry={() => void query.refetch()} retryLabel="Yeniden dene" />;
  }

  const cards = (query.data?.data ?? []).map((item) => toEntitlementCard(item)).filter((c): c is EntitlementCard => c !== null);

  async function start(card: EntitlementCard) {
    setError(null);
    if (card.action === "resume" && card.openRecipientId) {
      router.push(examPathForRecipient(card.openRecipientId));
      return;
    }
    setStartingId(card.skuId);
    try {
      const result = await open.mutateAsync({ skuId: card.skuId });
      const path = openedExamPath(result.data);
      await queryClient.invalidateQueries({ queryKey: getEntitlementsQueryKey() });
      if (path) router.push(path);
      else setError("Deneme açıldı ancak sınav bağlantısı alınamadı. Ana sayfadaki sınav listesine bakın.");
    } catch (err) {
      // 409: sonuç bekleniyor / tekrar politikası / hak yok — sunucu mesajı olduğu gibi.
      setError(openAttemptFailureMessage(err));
    } finally {
      setStartingId(null);
    }
  }

  if (cards.length === 0) {
    return (
      <KidCard className="flex flex-col items-center gap-4 py-10 text-center">
        <Mascot mood="waiting" size="md" />
        <h2 className="font-kid text-xl font-bold text-slate-900">Henüz hakkınız yok</h2>
        <p className="max-w-md text-slate-600">Bir ürün satın alıp ödemeniz onaylandığında sınav hakkınız burada görünür.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <KidButtonLink href="/shop" variant="sun">
            Ürünlere göz at
          </KidButtonLink>
          <KidButtonLink href="/shop/orders" variant="soft">
            Siparişlerim
          </KidButtonLink>
        </div>
      </KidCard>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <p role="alert" className="rounded-2xl border border-rose-200/90 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-3">
        {cards.map((card) => (
          <KidCard key={card.skuId} as="li" className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-kid text-lg font-bold text-slate-900">{card.title}</h2>
              <StatusPill tone={PILL_TONE[card.status.tone]}>{card.status.label}</StatusPill>
            </div>
            <p className="text-sm text-slate-600">
              Toplam {card.total} hak · {card.used} kullanıldı · {card.available} kaldı
            </p>
            <p className="text-sm text-slate-500">{validityText(card)}</p>
            {card.action === "none" ? (
              <KidNotice tone="neutral">
                {card.expired ? "Bu hakkın süresi dolduğu için yeni deneme başlatılamaz." : "Bu üründe kullanılabilir hakkınız kalmadı."}
              </KidNotice>
            ) : (
              <div>
                <KidButton variant={card.action === "resume" ? "sun" : "primary"} disabled={startingId === card.skuId} onClick={() => void start(card)}>
                  {startingId === card.skuId ? "Başlatılıyor…" : card.action === "resume" ? "Denemeye devam et" : "Denemeyi başlat"}
                </KidButton>
              </div>
            )}
          </KidCard>
        ))}
      </ul>
      <p className="text-sm text-slate-500">
        Önceki denemenizin sonucu yayınlanmadan yeni deneme açılamaz; sonuçlarınız{" "}
        <Link className="font-semibold text-indigo-700 underline-offset-2 hover:underline" href="/student/history">
          Geçmişim
        </Link>{" "}
        sayfasında görünür.
      </p>
    </div>
  );
}
