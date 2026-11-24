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

  if (query.isLoading) return <KidLoading label="Loading your entitlements…" rows={2} />;
  if (query.isError) {
    const failure = entitlementsFailure(query.error);
    if (failure.individualOnly) {
      return (
        <KidCard className="flex flex-col items-center gap-4 py-10 text-center">
          <Mascot mood="thinking" size="md" />
          <h2 className="font-kid text-xl font-bold text-slate-900">This section is for individual candidates</h2>
          <p className="max-w-md text-slate-600">Exams for institution students are assigned by their institution; assigned exams appear on the home page.</p>
          <KidButtonLink href="/student" variant="soft">
            Home
          </KidButtonLink>
        </KidCard>
      );
    }
    return <KidError title="Entitlements could not be loaded" message={failure.message} onRetry={() => void query.refetch()} retryLabel="Try again" />;
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
      else setError("The attempt was opened, but the exam link could not be retrieved. Check the exam list on the home page.");
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
        <h2 className="font-kid text-xl font-bold text-slate-900">You have no entitlements yet</h2>
        <p className="max-w-md text-slate-600">Once you buy a product and your payment is approved, your exam entitlement will appear here.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <KidButtonLink href="/shop" variant="sun">
            Browse products
          </KidButtonLink>
          <KidButtonLink href="/shop/orders" variant="soft">
            My orders
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
              Total {card.total} · {card.used} used · {card.available} left
            </p>
            <p className="text-sm text-slate-500">{validityText(card)}</p>
            {card.action === "none" ? (
              <KidNotice tone="neutral">
                {card.expired ? "This entitlement has expired, so a new attempt cannot be started." : "You have no attempts left for this product."}
              </KidNotice>
            ) : (
              <div>
                <KidButton variant={card.action === "resume" ? "sun" : "primary"} disabled={startingId === card.skuId} onClick={() => void start(card)}>
                  {startingId === card.skuId ? "Starting…" : card.action === "resume" ? "Continue attempt" : "Start attempt"}
                </KidButton>
              </div>
            )}
          </KidCard>
        ))}
      </ul>
      <p className="text-sm text-slate-500">
        A new attempt cannot be opened until the result of your previous attempt is published; your results appear on the{" "}
        <Link className="font-semibold text-indigo-700 underline-offset-2 hover:underline" href="/student/history">
          My history
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
