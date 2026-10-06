import { customInstance } from "@/src/api/mutator";

export type AiProvider = "OPENAI" | "OLLAMA";

export type CompanyAiSettings = {
  sttBaseUrl?: string;
  sttLanguage?: string;
  provider?: AiProvider;
  ollamaBaseUrl?: string;
  ollamaUsername?: string;
  ollamaModel?: string;
  ollamaAuthConfigured?: boolean;
  openaiModel?: string;
  openaiApiKeyLast4?: string;
  updatedAt?: string;
};

export type CompanyAiUpdate = {
  sttBaseUrl?: string;
  sttLanguage?: string;
  provider?: AiProvider | null;
  ollamaBaseUrl?: string;
  ollamaUsername?: string;
  ollamaPassword?: string;
  ollamaModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
};

type Envelope<T> = { data: T };

export async function getCompanyAiSettings(companyId: string): Promise<CompanyAiSettings> {
  const res = await customInstance<Envelope<CompanyAiSettings>>(`/companies/${companyId}/ai`);
  return res.data ?? {};
}

export async function saveCompanyAiSettings(
  companyId: string,
  body: CompanyAiUpdate,
): Promise<CompanyAiSettings> {
  const res = await customInstance<Envelope<CompanyAiSettings>>(`/companies/${companyId}/ai`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.data ?? {};
}
