import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/**
 * F3-00: gerçek uygulamanın tek sarmalayıcısı `src/components/providers.tsx`'teki
 * `QueryClientProvider` — ayrı bir tema/i18n context component'i (henüz) yok, icat edilmedi.
 * Her test kendi `QueryClient`'ını alır (`retry: false` — testte ağ hatası sessizce 3 kez denenmez).
 */
function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">): RenderResult {
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
