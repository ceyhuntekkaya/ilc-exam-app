"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyAiSettings,
  saveCompanyAiSettings,
  type AiProvider,
  type CompanyAiSettings,
} from "@/src/features/admin/companyAiApi";
import {
  Button,
  ErrorState,
  Field,
  FormCard,
  FormGrid,
  FormMessage,
  Input,
  PasswordInput,
  Select,
  errorMessage,
  notify,
} from "@/src/ui";
import { cn } from "@/src/lib/utils/cn";

const LANGUAGES = [
  { value: "tr", label: "Türkçe (tr)" },
  { value: "en", label: "İngilizce (en)" },
];

type ProviderChoice = "" | AiProvider;

function applySettings(data: CompanyAiSettings) {
  return {
    sttBaseUrl: data.sttBaseUrl ?? "",
    sttLanguage: data.sttLanguage === "en" ? "en" : "tr",
    provider: (data.provider ?? "") as ProviderChoice,
    ollamaBaseUrl: data.ollamaBaseUrl ?? "",
    ollamaUsername: data.ollamaUsername ?? "",
    ollamaPassword: "",
    ollamaModel: data.ollamaModel ?? "",
    openaiApiKey: "",
    openaiModel: data.openaiModel ?? "",
  };
}

export function CompanyAiSection({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["company-ai", companyId],
    queryFn: () => getCompanyAiSettings(companyId),
  });
  const save = useMutation({
    mutationFn: (body: Parameters<typeof saveCompanyAiSettings>[1]) =>
      saveCompanyAiSettings(companyId, body),
  });

  const [sttBaseUrl, setSttBaseUrl] = useState("");
  const [sttLanguage, setSttLanguage] = useState("tr");
  const [provider, setProvider] = useState<ProviderChoice>("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("");
  const [ollamaUsername, setOllamaUsername] = useState("");
  const [ollamaPassword, setOllamaPassword] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    const next = applySettings(query.data);
    setSttBaseUrl(next.sttBaseUrl);
    setSttLanguage(next.sttLanguage);
    setProvider(next.provider);
    setOllamaBaseUrl(next.ollamaBaseUrl);
    setOllamaUsername(next.ollamaUsername);
    setOllamaPassword("");
    setOllamaModel(next.ollamaModel);
    setOpenaiApiKey("");
    setOpenaiModel(next.openaiModel);
  }, [query.data]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      const saved = await save.mutateAsync({
        sttBaseUrl: sttBaseUrl.trim() || undefined,
        sttLanguage,
        provider: provider || null,
        ollamaBaseUrl: ollamaBaseUrl.trim() || undefined,
        ollamaUsername: ollamaUsername.trim(),
        ollamaPassword: ollamaPassword.trim() || undefined,
        ollamaModel: ollamaModel.trim() || undefined,
        openaiApiKey: openaiApiKey.trim() || undefined,
        openaiModel: openaiModel.trim() || undefined,
      });
      queryClient.setQueryData(["company-ai", companyId], saved);
      notify.success("AI ayarları kaydedildi");
    } catch (err) {
      const message = errorMessage(err, "AI ayarları kaydedilemedi");
      setFormError(message);
      notify.error(message);
    }
  }

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />;
  }
  if (query.isLoading || !query.data) {
    return <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />;
  }

  const data = query.data;
  const sttPreview = sttBaseUrl.trim().replace(/\/+$/, "");

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="grid gap-4">
      <FormCard
        title="Konuşmayı yazıya çevirme"
        description="Öğrencinin sesli cevabı bu adrese gider. Servisten gelen metin, ses dosyasının kaydına yazılır."
      >
        <FormGrid>
          <div className="sm:col-span-2">
            <Field
              label="STT adresi"
              hint={
                sttPreview
                  ? `Çağrı: ${sttPreview}/transcribe/${sttLanguage}`
                  : "Servis kökü. Örnek: https://speaking.stt.example.com"
              }
            >
              <Input
                value={sttBaseUrl}
                onChange={(event) => setSttBaseUrl(event.target.value)}
                placeholder="https://speaking.stt.example.com"
                inputMode="url"
                autoComplete="off"
              />
            </Field>
          </div>
          <Field label="Dil" hint="Whisper dil kodu. Adresin sonuna eklenir.">
            <Select value={sttLanguage} onChange={(event) => setSttLanguage(event.target.value)}>
              {LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
      </FormCard>

      <FormCard
        title="Dil modeli"
        description="Ollama ve OpenAI bilgilerinden yalnız biri aktif olabilir. Kurum değerlendirmede yalnızca seçili sağlayıcıyı kullanır."
      >
        <fieldset>
          <legend className="sr-only">Aktif sağlayıcı</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProviderOption
              name="ai-provider"
              value="OLLAMA"
              current={provider}
              title="Ollama"
              hint="Kurumun kendi modeli"
              onChange={setProvider}
            />
            <ProviderOption
              name="ai-provider"
              value="OPENAI"
              current={provider}
              title="OpenAI"
              hint="API anahtarı ile"
              onChange={setProvider}
            />
          </div>
          {provider ? (
            <button
              type="button"
              className="mt-3 min-h-11 text-left text-[13px] font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline"
              onClick={() => setProvider("")}
            >
              Aktif sağlayıcıyı kapat
            </button>
          ) : (
            <p className="mt-3 text-[13px] text-fg-muted">
              Sağlayıcı seçilmezse kurum dil modeli kullanamaz. STT adresi bundan bağımsız kaydedilir.
            </p>
          )}
        </fieldset>
      </FormCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormCard
          title="Ollama"
          aside={provider === "OLLAMA" ? <ActiveMark /> : null}
          description="Adres, kullanıcı, şifre ve model. Şifre kayıtta şifrelenir ve bir daha gösterilmez."
        >
          <div className="grid gap-4">
            <Field label="Adres" required={provider === "OLLAMA"}>
              <Input
                value={ollamaBaseUrl}
                onChange={(event) => setOllamaBaseUrl(event.target.value)}
                placeholder="http://ollama.local:11434"
                inputMode="url"
                autoComplete="off"
                required={provider === "OLLAMA"}
              />
            </Field>
            <FormGrid>
              <Field label="Kullanıcı adı" hint="Boş bırakılırsa kayıtlı şifre de silinir.">
                <Input
                  value={ollamaUsername}
                  onChange={(event) => setOllamaUsername(event.target.value)}
                  autoComplete="off"
                  placeholder="ollama"
                />
              </Field>
              <Field
                label="Şifre"
                hint={data.ollamaAuthConfigured ? "Değiştirmek için doldurun." : "İsteğe bağlı."}
              >
                <PasswordInput
                  value={ollamaPassword}
                  onChange={(event) => setOllamaPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder={data.ollamaAuthConfigured ? "••••••••" : "şifre"}
                />
              </Field>
            </FormGrid>
            <Field label="Model" required={provider === "OLLAMA"}>
              <Input
                value={ollamaModel}
                onChange={(event) => setOllamaModel(event.target.value)}
                placeholder="llama3.1"
                autoComplete="off"
                required={provider === "OLLAMA"}
              />
            </Field>
          </div>
        </FormCard>

        <FormCard
          title="OpenAI"
          aside={provider === "OPENAI" ? <ActiveMark /> : null}
          description="API anahtarı kayıtta şifrelenir. Panelde yalnız son dört karakter görünür."
        >
          <div className="grid gap-4">
            <Field
              label="API anahtarı"
              required={provider === "OPENAI" && !data.openaiApiKeyLast4}
              hint={data.openaiApiKeyLast4 ? `Kayıtlı anahtar ••••${data.openaiApiKeyLast4}` : "sk- ile başlar."}
            >
              <PasswordInput
                value={openaiApiKey}
                onChange={(event) => setOpenaiApiKey(event.target.value)}
                autoComplete="new-password"
                placeholder={data.openaiApiKeyLast4 ? `••••${data.openaiApiKeyLast4}` : "sk-..."}
                required={provider === "OPENAI" && !data.openaiApiKeyLast4}
              />
            </Field>
            <Field label="Model" required={provider === "OPENAI"}>
              <Input
                value={openaiModel}
                onChange={(event) => setOpenaiModel(event.target.value)}
                placeholder="gpt-4o-mini"
                autoComplete="off"
                required={provider === "OPENAI"}
              />
            </Field>
          </div>
        </FormCard>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {formError ? <FormMessage tone="danger">{formError}</FormMessage> : <span className="sm:mr-auto" />}
        <Button type="submit" loading={save.isPending} className="min-h-11">
          Kaydet
        </Button>
      </div>
    </form>
  );
}

function ProviderOption({
  name,
  value,
  current,
  title,
  hint,
  onChange,
}: {
  name: string;
  value: AiProvider;
  current: ProviderChoice;
  title: string;
  hint: string;
  onChange: (value: AiProvider) => void;
}) {
  const selected = current === value;
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5",
        selected ? "border-primary bg-primary/5" : "border-border bg-surface",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        className="size-4 shrink-0 accent-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="block text-[13px] text-fg-muted">{hint}</span>
      </span>
    </label>
  );
}

function ActiveMark() {
  return (
    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Aktif</span>
  );
}
