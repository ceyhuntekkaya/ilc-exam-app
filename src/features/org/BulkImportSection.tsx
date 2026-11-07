"use client";

import { useRef, useState, type FormEvent } from "react";
import { useBulkImport } from "@/src/api/generated/bulk-import/bulk-import";
import type { BulkImportResult, CreatedAccount } from "@/src/api/generated/models";
import {
  Alert,
  Button,
  Field,
  FormCard,
  FormMessage,
  IconUpload,
  Input,
  SectionTable,
  errorMessage,
  notify,
} from "@/src/ui";

const CREATED_COLUMNS = ["Satır", "Kullanıcı adı", "İlk parola"];
const ERROR_COLUMNS = ["Satır", "Neden", "Ham satır"];

/** `createdAccounts[]` içindeki düz metin ilk parolaları CSV'ye çevirir (tarayıcıda indirme için). */
export function buildAccountsCsv(accounts: CreatedAccount[]): string {
  const header = "satir,kullanici_adi,ilk_parola";
  const lines = accounts.map((a) =>
    [a.rowNumber ?? "", a.username ?? "", a.initialPassword ?? ""]
      .map((v) => String(v))
      .join(","),
  );
  return [header, ...lines].join("\n");
}

function summaryText(result: BulkImportResult): string {
  const total = result.totalRows ?? 0;
  const success = result.successCount ?? 0;
  const errorCount = result.errorCount ?? 0;
  if (errorCount === 0) return `${total} satırın tamamı oluşturuldu.`;
  return `${total} satırdan ${success}'i oluşturuldu, ${errorCount}'si hatalı.`;
}

/**
 * CSV ile toplu öğrenci oluşturma (F3B-10, frontend). Backend `POST /companies/{id}/students/bulk-import`
 * her satır için ILC kimliği + kullanıcı adı + RASTGELE ilk parola üretir; parola yalnız bu yanıtta,
 * BİR KEZ döner ve backend'de hiçbir yerde saklanmaz (bkz. plan/faz-3b/F3B-10-toplu-kullanici.md).
 *
 * Aynı kural burada da geçerli: yükleme sonucu (`result`, dolayısıyla `createdAccounts[].initialPassword`)
 * YALNIZ bu bileşenin React state'inde durur. localStorage/sessionStorage/console.log'a KASITLI olarak
 * YAZILMAZ — sayfadan ayrılınca (unmount) ya da yeniden yüklenince kaybolur. Kurum personeli, hesapları
 * ekrandan kopyalayabilir ya da "CSV indir" ile bir kerelik dosya alabilir (client-side üretim, backend'e
 * AYRICA istek atılmaz).
 */
export function BulkImportSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const bulkImport = useBulkImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [academicYearId, setAcademicYearId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  // Hassas sonuç: yalnız bellekte. Yukarıdaki not — hiçbir kalıcı depoya yazılmaz.
  const [result, setResult] = useState<BulkImportResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setFormError("Bir CSV dosyası seçin.");
      return;
    }
    setFormError(null);
    try {
      const response = await bulkImport.mutateAsync({
        id,
        data: { file },
        params: academicYearId.trim() ? { academicYearId: academicYearId.trim() } : undefined,
      });
      setResult(response.data);
      notify.success("Dosya işlendi");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const message = errorMessage(err, "Dosya yüklenemedi");
      setFormError(message);
      notify.error(message);
    }
  }

  function downloadAccountsCsv() {
    const accounts = result?.createdAccounts ?? [];
    if (accounts.length === 0) return;
    const csv = buildAccountsCsv(accounts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `toplu-yukleme-${result?.batchId ?? "sonuc"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const createdAccounts = result?.createdAccounts ?? [];
  const errors = result?.errors ?? [];

  return (
    <div className="grid gap-4">
      <FormCard
        title="CSV ile toplu öğrenci yükleme"
        description={
          <>
            İlk satır başlık olmalı: <code className="rounded bg-bg px-1 py-0.5 font-mono text-xs">ad,soyad,birim_kodu</code>.
            {" "}<code className="rounded bg-bg px-1 py-0.5 font-mono text-xs">ad</code> ve{" "}
            <code className="rounded bg-bg px-1 py-0.5 font-mono text-xs">soyad</code> zorunlu,{" "}
            <code className="rounded bg-bg px-1 py-0.5 font-mono text-xs">birim_kodu</code> opsiyoneldir (sınıf/şube koduna referans).
            UTF-8; Excel&apos;in eklediği BOM da kabul edilir. Fazladan kolon yoksayılır, eksik kolon dosyayı reddeder.
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="CSV dosyası" required hint="Virgülle ayrılmış, UTF-8 (BOM'lu/BOM'suz).">
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border-strong bg-neutral-50 px-3 text-[13px] text-fg hover:border-primary-300 hover:bg-primary-50/40">
              <IconUpload className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{file ? file.name : "Dosya seç (.csv)"}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                aria-label="CSV dosyası"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </Field>
          <Field label="Dönem (opsiyonel)" hint="Akademik yıl kimliği (UUID). Boş bırakılırsa backend varsayılan dönemi kullanır.">
            <Input
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              placeholder="ör. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
            />
          </Field>
          <div className="flex items-end gap-3 sm:col-span-2">
            <Button type="submit" loading={bulkImport.isPending}>
              Yükle
            </Button>
            {formError ? <FormMessage tone="danger">{formError}</FormMessage> : null}
          </div>
        </form>
      </FormCard>

      {result ? (
        <>
          <Alert variant={errors.length > 0 ? "danger" : "success"}>{summaryText(result)}</Alert>

          <FormCard
            title="Oluşturulan hesaplar"
            description="Kullanıcı adı ve ilk parola yalnız bu ekranda görünür, hiçbir yerde saklanmaz. Öğrencilere elle ya da aşağıdaki CSV ile dağıtın."
            aside={
              createdAccounts.length > 0 ? (
                <Button size="sm" variant="secondary" onClick={downloadAccountsCsv}>
                  CSV indir
                </Button>
              ) : null
            }
          >
            <SectionTable
              columns={CREATED_COLUMNS}
              empty="Oluşturulan hesap yok"
              rows={createdAccounts.map((a) => [
                a.rowNumber != null ? <span key="r" className="numeric">{a.rowNumber}</span> : "—",
                <span key="u" className="font-mono text-[13px]">{a.username}</span>,
                <span key="p" className="font-mono text-[13px] font-semibold">{a.initialPassword}</span>,
              ])}
            />
          </FormCard>

          {errors.length > 0 ? (
            <FormCard title="Hatalı satırlar" description="Bu satırlar için hesap oluşturulmadı; nedeniyle düzeltip yeniden yükleyin.">
              <SectionTable
                columns={ERROR_COLUMNS}
                empty="Hatalı satır yok"
                rows={errors.map((e) => [
                  e.rowNumber != null ? <span key="r" className="numeric">{e.rowNumber}</span> : "—",
                  e.reason ?? "—",
                  e.rawRowData ? <span key="raw" className="font-mono text-xs">{e.rawRowData}</span> : "—",
                ])}
              />
            </FormCard>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
