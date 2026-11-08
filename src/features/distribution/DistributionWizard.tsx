"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDetail, useCreate2, useUpdate2, getList3QueryKey, getDetailQueryKey } from "@/src/api/generated/company-distributions/company-distributions";
import { usePackages } from "@/src/api/generated/company-ledger/company-ledger";
import { useList10 } from "@/src/api/generated/exam-authoring/exam-authoring";
import { useList6, useListSessions } from "@/src/api/generated/exam-centers/exam-centers";
import { useList as useListSkus } from "@/src/api/generated/product-sku-catalog/product-sku-catalog";
import type { DistributionRow } from "@/src/api/generated/models";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import {
  BackLink,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Field,
  FormCard,
  IconCheck,
  Input,
  PageHeader,
  Select,
  Skeleton,
  errorMessage,
  notify,
} from "@/src/ui";
import { TargetingStep } from "@/src/features/distribution/TargetingStep";
import { PreviewOpenStep } from "@/src/features/distribution/PreviewOpenStep";
import {
  EMPTY_BASICS,
  MODE_LABEL,
  modeFormFromDraft,
  shortId,
  toCreateRequest,
  toUpdateRequest,
  validateBasics,
  validateMode,
  type BasicsForm,
  type ModeForm,
} from "@/src/features/distribution/distributionModel";

const STEPS = [
  { title: "Ad, paket ve sınav", hint: "Hangi haktan, hangi sınav" },
  { title: "Kip", hint: "Açık pencere ya da takvimli oturum" },
  { title: "Hedefleme", hint: "Kimler alacak" },
  { title: "Önizleme ve açma", hint: "Sayılar, kota, onay" },
];

function dateOnly(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("tr-TR", { timeZone: "UTC" });
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Banner({ children }: { children: string }) {
  return (
    <div role="alert" className="rounded-lg border border-danger/20 bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
      {children}
    </div>
  );
}

/**
 * R-10 oluşturma sihirbazı. Taslak, KİP seçildikten sonra (adım 2 sonunda) sunucuda oluşur — kip zorunlu
 * olduğu için ondan önce taslak yoktur (K-U07). `distributionId` verilirse mevcut taslak sürdürülür.
 * Yazma yetkisi yalnız `assignment:manage`; izleme izni olan buraya giremez.
 */
export function DistributionWizard({ companyId, distributionId }: { companyId: string; distributionId?: string }) {
  const canManage = useCan(Perm.assignmentManage);
  const detailQ = useDetail(distributionId ?? "", { query: { enabled: Boolean(distributionId), queryKey: ["distribution-draft", companyId, distributionId] } });

  if (!canManage) {
    return (
      <div className="grid gap-4">
        <BackLink href="/staff/distributions" label="Dağıtımlar" />
        <EmptyState
          tone="warning"
          title="Bu işlem için yetkiniz yok"
          description="Dağıtım oluşturmak ve açmak için sınav atama yönetimi yetkisi gerekir. Dağıtımları izleyebilirsiniz."
        />
      </div>
    );
  }
  if (distributionId) {
    if (detailQ.isLoading) return <Skeleton className="h-64 rounded-xl" />;
    if (detailQ.isError) return <ErrorState error={detailQ.error} onRetry={() => void detailQ.refetch()} compact />;
    const draft = detailQ.data?.data;
    if (draft && draft.status !== "DRAFT") {
      return (
        <div className="grid gap-4">
          <BackLink href="/staff/distributions" label="Dağıtımlar" />
          <EmptyState
            tone="neutral"
            title="Bu dağıtım artık taslak değil"
            description="Açılmış ya da kapanmış dağıtımın kuralları değiştirilemez."
            action={<ButtonLink href={`/staff/distributions/${draft.id}`}>Detaya git</ButtonLink>}
          />
        </div>
      );
    }
    return <WizardBody companyId={companyId} initialDraft={draft ?? null} />;
  }
  return <WizardBody companyId={companyId} initialDraft={null} />;
}

function WizardBody({ companyId, initialDraft }: { companyId: string; initialDraft: DistributionRow | null }) {
  const queryClient = useQueryClient();
  const create = useCreate2();
  const update = useUpdate2();
  const [draft, setDraft] = useState<DistributionRow | null>(initialDraft);
  const [step, setStep] = useState(initialDraft ? 3 : 1);
  const [basics, setBasics] = useState<BasicsForm>(
    initialDraft
      ? { name: initialDraft.name ?? "", packageId: initialDraft.packageId ?? "", skuId: initialDraft.skuId ?? "", examId: "" }
      : EMPTY_BASICS,
  );
  const [mode, setMode] = useState<ModeForm>(() => modeFormFromDraft(initialDraft));
  const [error, setError] = useState<string | null>(null);

  const draftExists = draft !== null;

  function goNextFromBasics() {
    setError(null);
    const problem = validateBasics(basics, { draftExists });
    if (problem) return setError(problem);
    setStep(2);
  }

  async function saveDraft() {
    setError(null);
    const problem = validateBasics(basics, { draftExists }) ?? validateMode(mode);
    if (problem) return setError(problem);
    try {
      if (draft?.id) {
        const res = await update.mutateAsync({ distributionId: draft.id, data: toUpdateRequest(basics, mode) });
        setDraft(res.data);
        await queryClient.invalidateQueries({ queryKey: getDetailQueryKey(draft.id) });
      } else {
        const res = await create.mutateAsync({ data: toCreateRequest(basics, mode) });
        setDraft(res.data);
        notify.success("Taslak oluşturuldu");
      }
      await queryClient.invalidateQueries({ queryKey: getList3QueryKey() });
      setStep(3);
    } catch (err) {
      // 400/409: backend `{"error": "..."}` (ör. kip eksik, sınav yayında değil, paket SKU'ya ait değil).
      setError(errorMessage(err, "Taslak kaydedilemedi"));
    }
  }

  const header = (
    <PageHeader
      title={draft?.name ? `Dağıtım: ${draft.name}` : "Yeni dağıtım"}
      description="Dört adımda hakkı, sınavı, kipi ve hedefi belirleyin; açmadan önce sayıları ve kotayı görürsünüz."
      back={{ href: "/staff/distributions", label: "Dağıtımlar" }}
    />
  );

  return (
    <div className="space-y-5">
      {header}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Adımlar">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const state = n === step ? "current" : n < step ? "done" : "todo";
          return (
            <li
              key={s.title}
              aria-current={state === "current" ? "step" : undefined}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                state === "current" ? "border-primary-200 bg-primary-50/60" : "border-border bg-surface"
              }`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  state === "done" ? "bg-success text-white" : state === "current" ? "bg-primary text-white" : "bg-neutral-100 text-fg-subtle"
                }`}
              >
                {state === "done" ? <IconCheck className="size-3.5" aria-hidden /> : n}
              </span>
              <span className="min-w-0">
                <span className={`block text-[13px] font-semibold ${state === "todo" ? "text-fg-muted" : "text-fg"}`}>{s.title}</span>
                <span className="block text-xs text-fg-subtle">{s.hint}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <FormCard
        title={STEPS[step - 1].title}
        description={STEPS[step - 1].hint}
        footer={
          step === 1 ? (
            <Button type="button" onClick={goNextFromBasics}>
              İleri
            </Button>
          ) : step === 2 ? (
            <>
              <Button type="button" variant="ghost" className="sm:mr-auto" onClick={() => setStep(1)}>
                Geri
              </Button>
              <Button type="button" loading={create.isPending || update.isPending} onClick={() => void saveDraft()}>
                {draftExists ? "Kaydet ve hedeflemeye geç" : "Taslağı oluştur ve hedeflemeye geç"}
              </Button>
            </>
          ) : undefined
        }
      >
        {error ? <Banner>{error}</Banner> : null}
        {step === 1 ? <BasicsStep companyId={companyId} basics={basics} onChange={setBasics} locked={draftExists} /> : null}
        {step === 2 ? <ModeStep mode={mode} onChange={setMode} /> : null}
        {step === 3 && draft?.id ? (
          <TargetingStep distributionId={draft.id} onBack={() => setStep(2)} onNext={() => setStep(4)} />
        ) : null}
        {step === 4 && draft?.id ? <PreviewOpenStep distributionId={draft.id} canOpen onBack={() => setStep(3)} /> : null}
      </FormCard>
    </div>
  );
}

// ── Adım 1: ad, paket(SKU), sınav ────────────────────────────────────────────

function BasicsStep({
  companyId,
  basics,
  onChange,
  locked,
}: {
  companyId: string;
  basics: BasicsForm;
  onChange: (next: BasicsForm) => void;
  locked: boolean;
}) {
  const packagesQ = usePackages({ query: { queryKey: ["/my-company/ledger/packages", companyId] } });
  // SKU adı yalnız katalog izni olanlara gelir (sku:manage); yoksa kod/kimlik gösterilir.
  const skusQ = useListSkus({ query: { retry: false } });
  const examsQ = useList10({ status: "PUBLISHED", size: 100 }, { query: { retry: false } });

  const skuName = new Map((skusQ.data?.data ?? []).map((s) => [s.id, s.name ?? s.code] as const));
  const packages = (packagesQ.data?.data ?? []).filter((p) => p.status === "ACTIVE" && p.scope !== "INDIVIDUAL");
  const exams = examsQ.data?.data?.items ?? [];

  return (
    <div className="grid gap-4">
      <Field label="Dağıtım adı" required>
        <Input value={basics.name} maxLength={200} onChange={(e) => onChange({ ...basics, name: e.target.value })} />
      </Field>

      <Field
        label="Hak paketi (SKU)"
        required
        hint={locked ? "Paket taslak oluştuktan sonra değiştirilemez." : "Ürün (SKU) seçilen paketten belirlenir; yalnız etkin paketler listelenir."}
      >
        {packagesQ.isError ? (
          <Banner>Paketler yüklenemedi. Hak paketlerini görmek için rapor/defter görüntüleme yetkisi gerekir.</Banner>
        ) : (
          <Select
            value={basics.packageId}
            disabled={locked || packagesQ.isLoading}
            onChange={(e) => {
              const pkg = packages.find((p) => p.packageId === e.target.value);
              onChange({ ...basics, packageId: pkg?.packageId ?? "", skuId: pkg?.skuId ?? "" });
            }}
          >
            <option value="">Paket seçin</option>
            {locked && !packages.some((p) => p.packageId === basics.packageId) && basics.packageId ? (
              <option value={basics.packageId}>Paket {shortId(basics.packageId)}</option>
            ) : null}
            {packages.map((p) => (
              <option key={p.packageId} value={p.packageId}>
                {skuName.get(p.skuId) ?? `SKU ${shortId(p.skuId)}`} · kalan hak {p.availableBalance ?? 0} · {dateOnly(p.validFrom)}–{dateOnly(p.validUntil)}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="Sınav"
        required={!locked}
        hint={locked ? "Mevcut sınav sürümü korunur; değiştirmek için yeni bir sınav seçin." : "Yalnız yayındaki sınavlar listelenir."}
      >
        {examsQ.isError ? (
          <>
            <Input
              value={basics.examId}
              autoComplete="off"
              placeholder="Sınav kimliği (UUID)"
              onChange={(e) => onChange({ ...basics, examId: e.target.value })}
            />
            <p className="mt-1 text-xs text-fg-subtle">
              Yayındaki sınav listesi bu hesapla okunamadı; yayındaki sınavın kimliğini (UUID) elle girin.
            </p>
          </>
        ) : (
          <Select value={basics.examId} disabled={examsQ.isLoading} onChange={(e) => onChange({ ...basics, examId: e.target.value })}>
            <option value="">{locked ? "Mevcut sürüm korunsun" : "Sınav seçin"}</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title ?? exam.code}
                {exam.code && exam.title ? ` (${exam.code})` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}

// ── Adım 2: kip (zorunlu) ────────────────────────────────────────────────────

function ModeStep({ mode, onChange }: { mode: ModeForm; onChange: (next: ModeForm) => void }) {
  const [centerId, setCenterId] = useState("");
  const centersQ = useList6({ query: { retry: false } });
  const sessionsQ = useListSessions(centerId, { query: { enabled: centerId !== "", retry: false } });
  const centers = centersQ.data?.data ?? [];
  const sessions = sessionsQ.data?.data ?? [];

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium text-fg">
          Dağıtım kipi <span className="text-danger">*</span>
        </legend>
        {(["OPEN_WINDOW", "SCHEDULED_SESSION"] as const).map((kind) => (
          <label
            key={kind}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
              mode.kind === kind ? "border-primary-200 bg-primary-50/60" : "border-border bg-surface"
            }`}
          >
            <input
              type="radio"
              name="mode"
              className="mt-0.5"
              checked={mode.kind === kind}
              onChange={() => onChange({ ...mode, kind })}
            />
            <span>
              <span className="block font-semibold text-fg">{MODE_LABEL[kind]}</span>
              <span className="block text-xs text-fg-muted">
                {kind === "OPEN_WINDOW"
                  ? "Adaylar belirlenen tarih aralığında istediği zaman sınava girer."
                  : "Adaylar bir sınav merkezi oturumunda, oturum saatinde sınava girer."}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode.kind === "" ? (
        <p className="text-sm text-fg-muted">Devam etmek için bir kip seçin; kip seçilmeden dağıtım oluşturulamaz.</p>
      ) : null}

      {mode.kind === "OPEN_WINDOW" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Açılış (İstanbul saati)" required>
            <Input type="datetime-local" value={mode.opensAt} onChange={(e) => onChange({ ...mode, opensAt: e.target.value })} />
          </Field>
          <Field label="Kapanış (İstanbul saati)" required>
            <Input type="datetime-local" value={mode.closesAt} onChange={(e) => onChange({ ...mode, closesAt: e.target.value })} />
          </Field>
        </div>
      ) : null}

      {mode.kind === "SCHEDULED_SESSION" ? (
        centersQ.isError ? (
          <Field label="Merkez oturumu kimliği" required hint="Merkez listesi bu hesapla okunamadı; oturumun kimliğini (UUID) elle girin.">
            <Input
              value={mode.centerSessionId}
              autoComplete="off"
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(e) => onChange({ ...mode, centerSessionId: e.target.value })}
            />
          </Field>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sınav merkezi" required>
              <Select
                value={centerId}
                disabled={centersQ.isLoading}
                onChange={(e) => {
                  setCenterId(e.target.value);
                  onChange({ ...mode, centerSessionId: "" });
                }}
              >
                <option value="">Merkez seçin</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? shortId(c.id)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Merkez oturumu" required hint={sessionsQ.isError ? "Oturumlar yüklenemedi." : undefined}>
              <Select
                value={mode.centerSessionId}
                disabled={centerId === "" || sessionsQ.isLoading}
                onChange={(e) => onChange({ ...mode, centerSessionId: e.target.value })}
              >
                <option value="">Oturum seçin</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {dateTime(s.scheduledAt)} · {s.status ?? ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )
      ) : null}
    </div>
  );
}
