# ilc-app — Next.js 16.3 App Router, React 19, TypeScript, Tailwind 4, TanStack Query

Dizinler: `app/` (rotalar), `src/features/` (ekran mantığı), `src/ui/{primitives,composites}`,
`src/api/generated/` (orval çıktısı), `src/lib/`.

## Komutlar
- Geliştirme: `npm run dev` · Derleme: `npm run build` · Lint: `npm run lint`
- Test: `npm run test` (vitest) · Tek dosya: `npx vitest run src/path/x.test.ts`
- API tipleri: `npm run generate:api`

## Plan
- Görev dosyaları `plan/faz-N/` altında (backend reposuyla aynı numaralandırma).
- Backend'i değiştiren bir iş varsa önce backend oturumu biter, sonra burada `npm run generate:api` ile başlanır.

## Kurallar
- `src/api/generated/**` ÜRETİLMİŞ dosyadır. Elle düzenleme, `generate:api` ile yenile.
- API tipi elle yazma; OpenAPI'den gelir.
- Varsayılan Server Component. `"use client"` yalnız etkileşim gerekiyorsa.
- Yeni bileşen yazmadan önce `src/ui/primitives` ve `src/ui/composites` içine bak.
- Next.js 16 App Router; Pages Router kalıbı kullanma.
- Tailwind 4, ayrı CSS dosyası açma.

## Büyük dosyalar — önce grep, sonra oku
Bunları tam okuma, ilgili sembolü `grep -n` ile bul ve o aralığı oku:
`src/features/hat-prototype/hat-prototype.tsx` (4769), `src/api/generated/admin-companies/admin-companies.ts` (3471),
`src/features/authoring/exams/ExamPages.tsx` (2260), `src/features/authoring/shared/LibraryPages.tsx` (1720),
`src/features/authoring/questions/QuestionEditor.tsx` (1467), `src/features/assignments/GradingSection.tsx` (1418),
`src/features/authoring/templates/InteractionForms.tsx` (1039), `src/features/exam-player/interactions/ResponseViews.tsx` (1025),
`src/features/exam-player/media/MediaContext.tsx` (682), `src/features/exam-player/dnd/PlaceBoard.tsx` (574),
`src/features/exam-flow/ExamFlowProvider.tsx` (545), `src/features/exam-player/session/answerOutbox.ts` (489).

## Test
Vitest + `@testing-library/react`/`jest-dom`/`jsdom` (F3-00'dan beri). `environment: "jsdom"`,
setup `src/test/setup.ts` (RTL cleanup + `matchMedia`/`crypto.randomUUID` stub'ları), render
için `renderWithProviders` (`src/test/renderWithProviders.tsx`, `QueryClientProvider` sarmalar —
başka context provider yok, icat etme). Coverage eşiği YOK, bilerek (F3-00: eşik konursa
sonraki testler kapsam doldurmaya kayar). Yeni davranışa en az bir test ekle; bir bileşen
render ediyorsa mock yerine gerçek alt modülleri (örn. `answerOutbox`) kullan.

## PWA kabuğu (F3-01)
`public/sw.js` ELLE yazıldı — Workbox/kütüphane yok, bilerek. Yalnız kabuk (HTML/JS/CSS/font/
ikon) önbekleklenir; `/api/**` HİÇ önbekleklenmez. Yeni kabuk sürümü sınav sırasında
uygulanmaz — `src/lib/pwa/version.ts`'teki `isExamInProgress` kontrolü `/student/exams/*/run`
ve `/sections` rotalarında `SKIP_WAITING` göndermez. Kabuk sürümü değişince `public/sw.js`'teki
`CACHE_VERSION` ve `src/lib/pwa/version.ts`'teki `CACHE_VERSION` İKİSİ de bump edilir (build
adımı yok, elle senkron).

## Lint taban çizgisi
`npm run lint` → 45 problem (29 hata, 16 uyarı). Her oturum sonunda bu sayı artmamalı.

## Bitti tanımı
`npm run lint` temiz · `npx tsc --noEmit` temiz · ilgili test geçiyor · `src/api/generated` elle değiştirilmemiş.

## Compact talimatı
Değiştirilen dosya listesini, aktif görev kodunu ve çalıştırılacak komutu koru.
