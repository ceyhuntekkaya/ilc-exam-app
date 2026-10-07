# Öğrenci paneli tasarımı

Hedef kitle: ilkokul ve ortaokul öğrencileri (7–14 yaş). Cihaz: telefon, tablet, laptop.
Her değişiklikten sonra bu belgenin sonuna bölüm ekle ve `CLAUDE.md` günlüğünü güncelle.

---

## 01 — Tek ana sayfa, çocuk dostu tema, sınav akışı (2026-10-06)

### Önceki durum ve sorunlar

- Ana sayfa yer tutucuydu ("listesi burada görünecek"); sınavlar `/student/exams`, sonuçlar `/student/results` ayrı sayfalardaydı (sonuçlar sayfasına hiçbir yerden bağlantı yoktu).
- Fontlar yalnız `latin` alt kümesiyle yükleniyordu: `ğ ş İ ı` yedek fonta düşüyordu.
- Ham hex renkler (`#f7f4ef`), küçük metin (`text-sm`), resmî dil ("deneme hakkınız", "onaylayın").
- Soru ekranında süre yalnız metin; hangi sorunun cevaplandığı görünmüyordu; Önceki/Sonraki/Çık/Bitir aynı ağırlıkta 4 düğme.
- Sınav akışında öğrencinin hangi adımda olduğu belli değildi.

### Tasarım ilkeleri (çocuk UX araştırmasından)

| İlke | Uygulama |
| --- | --- |
| Gizli menü yok, az seçenek | Hamburger/sekme yok. Tek ana sayfa; bölümler önem sırasına göre. |
| Okuma düzeyi | Kısa cümle, "sen" dili, teknik terim yok ("deneme hakkı" → "giriş hakkın"). |
| Büyük metin | Gövde en az 16px (`text-base`), açıklamalar `text-lg`, soru içeriği 17px / 1.7 satır. |
| Büyük dokunma hedefi | Düğmeler en az 48px, ana eylem 56px. |
| Tek ana eylem | Her kartta/ekranda tek dolu düğme (`primary`); ikincil eylemler çerçeveli/şeffaf. |
| Renk + ikon + metin | Durum hiçbir zaman yalnız renkle verilmez (`StatusPill`). |
| Kaygı yaratmayan süre | Süre normalde gri, uyarı süresinde sarı, son 1 dakikada mercan. Kırmızı alarm yok. |
| Nerede olduğunu bil | Sınav adımları çubuğu; soru noktaları; "Soru 3 / 10". |
| Geri alınamaz işlemde net onay | `KidDialog`: ne olacağını yazar; boş soru / bitmemiş bölüm sayısını söyler. |
| Odak | Soru ekranında kabuk gizli; süsler yalnız ana sayfa / giriş / bitiş ekranında. |

### Renk sistemi — "gökyüzü + güneş" (`src/styles/student-theme.css`)

Kapsam `[data-panel="student"]` (admin teması gibi); admin/staff etkilenmez. Her zaman açık tema.

| Token | Anlam | Kullanım |
| --- | --- | --- |
| `primary-*` (#236ce9) | Gökyüzü mavisi | Ana eylem, odak, aktif adım |
| `secondary-*` (#ffc220) | Güneş sarısı | Yarım kalan sınav/bölüm, kutlama, ipucu kartı |
| `neutral-*` | Mavimsi gri | Metin, çizgi, kilitli |
| `--kid-mint` | Tamam / bitti | Biten bölüm, cevaplanmış soru |
| `--kid-sun` | Devam ediyor | Yarım kalan, süre uyarısı |
| `--kid-coral` | Dikkat | Son dakika, hata (kırmızıdan yumuşak) |
| `--kid-grape` | Sonuç / seviye | Sonuçlarım, CEFR rozeti |
| `--kid-sky` | Açık / hazır | Girilebilir sınav |

Her tonun `-bg` yüzeyi var; metin tonları bu yüzeylerde AA kontrastını sağlar. `-solid` dolgu (nokta, ilerleme çubuğu) içindir.

### Tipografi (`src/styles/student-fonts.ts`)

- Gövde: **Lexend** — okuma akıcılığı için tasarlanmış, geniş harf aralığı.
- Başlık: **Nunito** 700/800 — yuvarlak, sıcak.
- Her ikisi `latin-ext` ile (Türkçe karakterler). Fontlar yalnız öğrenci kabuğu ve öğrenci girişinde yüklenir.

### Düzen

- `student-container`: ortalı, en fazla 72rem; yan boşluk 16 / 24 / 32px. (Admin'den farklı olarak ortalı: çocuk için satır uzunluğu sınırlı olmalı.)
- Mobil: tek sütun. Tablet (`md`): kartlar 2 sütun. Laptop (`lg`): ana sayfada sağda Sonuçlar + ipuçları sütunu; hazırlık ekranında sağda yapışkan "Hazır mısın?" kartı.
- Soru ekranı: yapışkan üst çubuk (bölüm, soru sırası, süre, ara ver, soru noktaları) + yapışkan alt çubuk (Önceki / Sonraki / Bölümü bitir), `pb-safe` ile iPhone alt çizgisi korunur.

### Ekranlar

1. **Giriş** (`/login/student`): gökyüzü arka planı, tek alan, büyük giriş düğmesi, çocuk diliyle hata.
2. **Ana sayfa** (`/student`): selamlama şeridi (yarım kalan varsa doğrudan "Devam et"), Şimdi girebileceğin sınavlar → Yakında açılacak → Biten sınavlar; yan sütunda Sonuçlarım + "Sınavdan önce" ipuçları. `/student/exams` ve `/student/results` buraya yönlenir.
3. **Hazırlık** (`/student/exams/[id]`): süre/bölüm/soru kutuları, yönerge, bölüm listesi, onay kutusu + "Hazırım, başlayalım".
4. **Cihaz kontrolü**: adım adım talimat (bas → say → dinle), canlı ses seviyesi, "Evet, duydum / Hayır, tekrar dene".
5. **Bölümler**: ilerleme çubuğu, kalan sınav süresi, numaralı bölüm kartları, hepsi bitince belirgin "Sınavı teslim et".
6. **Soru**: yukarıda anlatıldı. Son soruda "Sonraki" yerine "Bölümü bitir"; atlama kapalıysa "Devam etmek için bu soruyu cevapla."
7. **Bitti**: kutlama kartı, bölüm özeti, "Ana sayfaya dön".

### Bileşenler (`src/features/student/`)

- `ui.tsx`: `KidButton`/`KidButtonLink`/`kidButtonClass` (primary, sun, soft, ghost; md 48px, lg 56px), `KidCard`, `StatusPill`, `InfoTile`, `KidNotice`, `KidLoading` (iskelet), `KidError` (tekrar dene), `KidDialog` (mobilde alttan açılır, Esc ile kapanır, odak Vazgeç'te).
- `status.ts`: sınav gruplama (`examGroup`), durum etiketleri (`examStatus`, `sectionTone`), `friendlyWhen` ("Bugün 14:00", "Yarın 09:30").
- Yeni ikonlar (`src/ui/icons.tsx`): `IconArrowRight`, `IconClock`, `IconCalendar`, `IconMic`, `IconCamera`, `IconTrophy`, `IconLayers`, `IconFlag`, `IconRefresh`.

### Değişen dosyalar

`app/globals.css`, `app/login/student/page.tsx`, `app/student/page.tsx`, `app/student/exams/page.tsx` (yönlendirme), `app/student/results/page.tsx` (yönlendirme), `app/student/exams/[recipientId]/{layout,page,checks,sections,sections/[sectionId],finished,run}`, `src/components/layouts/student-shell.tsx`, `src/features/exam-flow/ReconnectOverlay.tsx`, `src/features/exam-flow/ConfirmDialog.tsx` (silindi, yerine `KidDialog`), `src/ui/icons.tsx`, yeni: `src/styles/student-theme.css`, `src/styles/student-fonts.ts`, `src/features/student/*`.

API, oturum ve sınav akışı mantığı (ExamFlowProvider, istekler, yönlendirmeler) değişmedi; yalnız görünüm ve metinler.

### Sonraki adımlar

- Gerçek cihazlarda (küçük Android telefon, iPad, laptop) uçtan uca deneme; özellikle uzun okuma metni + yapışkan alt çubuk.
- Soru oynatıcısı (`src/features/exam-player`) bileşenlerinin öğrenci kapsamında daha büyük seçenek kartları (şimdilik yalnız yazı boyutu/satır aralığı büyütüldü; admin önizlemesi ortak).
- Sonuç puanı ölçeği backend'den netleşince beceri çubukları (şu an yalnız 0–100 arası değerlerde çiziliyor).

---

## 02 — Yoğunluk revizyonu: küçük arayüz metni, büyük soru (2026-10-06)

Geri bildirim: arayüz yazıları fazla büyüktü, hizalama kayıyor / metin kesiliyordu; soru ekranında header ve footer çok yer kaplıyordu, sorular küçük kalıyordu.

- **Tipografi ölçeği küçüldü:** sayfa başlığı `text-2xl font-bold` (önce 3xl/4xl extrabold), bölüm başlığı `text-xl`, kart başlığı `text-base font-bold`, gövde `text-base`; `font-extrabold` kaldırıldı.
- **Kit:** `KidButton` md 44px / 15px, lg 48px / 16px; `StatusPill` 13px; `InfoTile` mobilde dikey (3'lü ızgara sıkışmasın); kart iç boşluğu `p-4 sm:p-5`; diyalog sıkılaştırıldı.
- **Kabuk:** header 56px; adım çubuğu daireleri 28px.
- **Soru ekranı:**
  - Üst çubuk 48px tek satır: `Bölüm · Soru 3/10`, süre çipi (uyarıda "az kaldı"), Ara ver. Ayrı süre uyarı şeridi kaldırıldı (renk + çip metni yeterli).
  - Soru takibi footer'a taşındı: solda Önceki, ortada kaydırılabilir numaralı kutular (şu anki mavi, cevaplanan yeşil, boş gri; şu anki hep görünür alana kayar), sağda Sonraki / Bölümü bitir. Mobilde düğmeler yalnız ikon (Bitir yazılı).
  - "Devam etmek için bu soruyu cevapla." yalnız gerektiğinde, footer üstünde küçük satır.
- **Soru içeriği büyüdü (yalnız öğrenci kapsamı, `student-theme.css`):** oynatıcıdaki `text-sm` → 17px, seçenek kartları en az 56px / 2px çerçeve / 16px köşe, harf işaretleri 36px, yönerge kesik çizgi yerine sol şeritli kutu, "Yönerge yok" yer tutucusu gizli. Hedefleme için `OptionChip`'e `data-ep="option|marker"`, `QuestionView`'a `data-ep="no-instruction"` eklendi (admin önizlemesi görsel olarak değişmedi).

### 02 eki — adım çubuğu

Son adım boşuna `flex-1` yer kaplıyor, çizgiler eşit dağılmıyor, mobilde etiketler gizleniyordu. Artık beyaz kart içinde eşit sütunlu ızgara: her adımda ortalı daire + altında etiket (mobilde de görünür), bağlantı çizgileri daire merkezleri arasında; tamamlanan yeşil, şu anki mavi.

---

## 03 — Soru formatları revizyonu + cevap kaydetme (2026-10-06)

### Kritik bulgu: cevaplar kaydedilmiyordu

`useAnswerSync` yalnız çoktan seçmeli (tek/çok) görünümlerde vardı. Doğru/yanlış, eşleştirme, sıralama, gruplama, boşluk doldurma, kısa cevap, açık uçlu ve hotspot (seç/yerleştir) cevapları **sunucuya hiç gönderilmiyordu**. Ayrıca soru değişince görünüm yeniden kurulduğu için verilen cevap ekrandan da siliniyordu.

Düzeltme:
- Her görünüm `useAnswerSync(itemId, payload, enabled)` ile kaydeder; `InteractionRenderer` tüm görünümlere `itemId` geçirir. Kayıt yalnız öğrenci bir şey değiştirince başlar (`touched`).
- `LiveExamSessionProvider` son cevapları `sessionStorage`'da (`ilc-answer-drafts:{applicationId}`) tutar, `getAnswer` ile verir; `useSavedAnswer(itemId)` soruya geri dönünce cevabı geri yükler.
- Gönderilen `answerJson` biçimleri (cevap anahtarı adlarının "correct" öneksiz hali; çoktan seçmelideki mevcut kalıp):

| Format | answerJson |
| --- | --- |
| MULTIPLE_CHOICE | `{ optionId }` (mevcut) |
| MULTIPLE_RESPONSE | `{ optionIds }` (mevcut; artık boş liste de kaydedilir) |
| TRUE_FALSE | `{ answers: { [statementId]: "TRUE" \| "FALSE" \| "NOT_GIVEN" } }` |
| MATCHING | `{ pairs: { [leftId]: rightId \| null } }` |
| ORDERING | `{ order: string[] }` |
| GROUPING | `{ groupOf: { [itemId]: groupId \| null } }` |
| FILL_IN_THE_BLANKS | `{ choiceIds: { [blankId]: choiceId \| null } }` |
| SHORT_ANSWER | `{ answers: { [blankId]: string } }` |
| HOTSPOT_SELECT | `{ regionIds: string[] }` |
| HOTSPOT_PLACE | `{ zoneOf: { [draggableId]: zoneId \| null } }` |
| OPEN_ENDED | `{ text }` |

**Backend ile doğrulanmalı:** `AnswerRequest.answerJson` serbest nesne; puanlama servisinin bu anahtarları beklediği teyit edilmeli.

### Format bazında görünüm/UX

- **Ortak:** `PickHint` — seç-yerleştir sorularında duruma göre değişen tek satır ("…dokun" / seçiliyken "Şimdi … dokun"). Seçenek/kelime bankası hedef kutuların **üstünde** (dokun → aşağıda yerleştir akışı). Öğrenciye iç kimlik (`b1`, `r2`) gösterilmez.
- **Çoktan seçmeli:** çoklu seçimde kare işaret + "Birden fazla seçebilirsin (2/3)" sayacı; `aria-pressed`.
- **Doğru/Yanlış:** ayrı başlık satırı kaldırıldı (hizasızdı); her ifade numaralı kart, düğmeler eşit genişlikte ızgara (dar ekranda altta, geniş ekranda sağda), `radiogroup`. Varsayılan etiketler İngilizce kaldı (True/False/Not given) — sınav içeriği İngilizce.
- **Eşleştirme:** satır ızgarası `metin · ok ikonu · kutu`, mobilde kutu tam genişlik; boş kutu "Boş" / seçim varken "Buraya koy"; dolu kutuda kaldırma ikonu.
- **Sıralama:** her kartta yukarı/aşağı (yatayda sol/sağ) düğmeleri — dokunmatikte güvenilir yol; seçili kart vurgulu.
- **Gruplama:** grup başlığı kalın, boş grup "Henüz boş" / "Buraya koy".
- **Boşluk doldurma:** "……" yerine satır yüksekliğini bozmayan kutucuk (boş: kesik çizgili gri, dolu: lacivert, hedef: mavi); açılır listede "Seç ▾", 44px öğeler, kaydırma; metin satır aralığı 2.4.
- **Kısa cevap:** kelime sayacı alanın yanında (önce altına düşüp satırı kaydırıyordu); giriş alanı görünür kutu; ayrı alanlarda "Cevap 1, 2…".
- **Hotspot:** "Seçili: r1, r2" yerine "2 yer seçtin…"; bölge `aria-label` "Bölge n"; yerleştir'de bölge etiketi okunur rozet.
- **Açık uçlu:** "Cevabını buraya yaz…", "(en az N)".
- **Adım çubuğu:** tek satır 44px, `[● Hazırlık] —— [● Bölümler] —— [● Bitti]`; çizgiler ayrı esnek öğe (mutlak konum yok, üst üste binmez); mobilde kısa etiket ("Cihaz").

Değişen dosyalar: `src/features/exam-player/interactions/*` (yeni `PickHint.tsx`), `session/{useAnswerSync.ts,ExamSessionContext.tsx,LiveExamSessionProvider.tsx}`, `styles.ts` (`epBlankInline`, `epCta`), `app/student/exams/[recipientId]/layout.tsx`. Admin önizlemesi aynı bileşenleri kullanır; önizlemede kayıt yapılmaz.

---

## 04 — Süre takibi, dinleme oynatıcısı, konuşma kaydı, İngilizce cevap etiketleri (2026-10-06)

- **Süre her zaman görünür** (soru üst çubuğu): süre sınırı varsa "Kalan mm:ss", yoksa "Geçen mm:ss" (bağlantı beklenirken durur). Bölüm süresi varken geniş ekranda ayrıca "Sınav mm:ss" (sınavın tamamı). Üst çubuğun altında 4px süre çubuğu: bölüm süresinin kalan oranı; mavi → uyarıda sarı → son dakikada mercan. `role="timer"`.
- **Dinleme (`MediaAudio`)**: tarayıcının ham oynatıcısı yerine kart: 56px oynat düğmesi, çalarken dalga animasyonu (`.ep-eq`) + "Dinleniyor…", geçen/toplam süre, ilerleme çubuğu (ileri sarma serbestse kaydırıcı), sınırlı dinlemede kalan hak noktaları. Sınırlı dinlemede başlatılan kayıt durdurulamaz (hak bir kez sayılır).
- **Konuşma (`AudioResponseView`)**: hazırlık süresi varsa büyük geri sayım ("Hazırım, şimdi başla" ile atlanabilir) → kayıtta nabız atan kırmızı mikrofon, "Kaydediliyor… konuş!", sayaç `0:12 / 1:00`, canlı ses seviyesi çubukları, süre çubuğu; süre dolunca otomatik durur. Sonra "✓ Kaydın gönderildi" + dinleme; kayıt hakkı noktaları. Kayıt süresi artık gerçek süre olarak gönderiliyor (önce üst sınır gönderiliyordu).
- **İngilizce cevap etiketleri** (sınav İngilizce): boşluk seçici "Choose ▾", "Clear"; boş kutular "Empty", seçim varken "Put here"; açık uçlu "Write your answer here…". Yönlendirme ipuçları (PickHint vb.) Türkçe kaldı.

### 04 eki — sakinleştirme ve hiza

- Hareket azaltıldı: nabız (ping) ve yanıp sönme (pulse) kaldırıldı (kayıt mikrofonu, son dakika süre çipi, cihaz kontrolü). Son dakika artık renk + ince çerçeveyle belirtilir. Dalga animasyonu 4 → 3 çubuk, 12px, 1.6 sn döngü; yalnız çalarken durum metninin yanında (düğmenin içinde değil).
- Dinleme ve konuşma aynı satır düzeninde: `[44px daire] [durum · süre / ince çubuk] [hak / eylem]`; sabit satır yükseklikleri (h-5 başlık, h-1.5 çubuk) ile durum değişince hiza kaymaz.
- Tarayıcıya göre farklı görünen `input[type=range]` kaldırıldı; ilerleme her yerde aynı çubuk (ileri sarma serbestse tıklanır, `role=slider`).
- Konuşma: ortalanmış büyük blok + 12 seviye çubuğu + dev geri sayım yerine tek seviye çubuğu, sayaç sağda; hazırlık sayısı dairenin içinde. Kayıt düğmeleri 44px yükseklik, köşeli (`epRecordStart/Stop`), mobilde tam genişlik alt satırda.

### 04 eki 2 — İngilizce soru ekranı, ses kartı hizası

- Ana dinleme kartı `QuestionView`da `justify-end` + `max-w-md` ile sağa yaslıydı; artık sütun genişliğinde.
- Soru ekranı (`sections/[sectionId]`) ve oynatıcıdaki tüm öğrenci metinleri İngilizce: üst/alt çubuk (Question 3/10, Time left, Break, Back, Next, Finish section), diyaloglar, bağlantı katmanı, ipuçları (PickHint), dinleme (Press to listen, Listening…, Plays), konuşma (Start recording, Recording… speak now, Tries), yükleme, kelime sayacı, aria etiketleri. Admin önizlemesine özel metinler (Önizleme, Örnek cevaplar, Değerlendirici notu) Türkçe.
- Ana sayfa, hazırlık, cihaz kontrolü, bölüm listesi ve bitiş ekranı Türkçe kaldı (sınav dışı yönlendirme).
- `KidDialog` için `busyLabel` eklendi.

---

## 05 — Soru alanı admin önizlemesiyle eşlendi (2026-10-06)

Karar: öğrencinin gördüğü soru, admin soru editöründeki **"Öğrenci önizlemesi"** (`QuestionPreviewShell` → `QuestionView`) ile birebir aynı olmalı; öğretmen önizlemede ne görüyorsa öğrenci de onu görür. Bu yüzden 03/04 bölümlerindeki oynatıcı görsel değişiklikleri geri alındı.

- `src/features/exam-player/{QuestionView.tsx, styles.ts, exam-player-theme.css, media/, interactions/}` commit `534923c` haline döndürüldü (PickHint silindi; dinleme kartı, konuşma kartı, format düzenleri, İngilizce metinler geri alındı).
- `student-theme.css` içindeki `.exam-player` ezmeleri (büyük metin, seçenek kartı, yönerge şeridi, `data-ep`) silindi. Tek eşitleme kuralı: soru içinde panel fontu yerine önizlemedeki font (Source Sans).
- Soru kabı önizlemeyle aynı: `rounded-lg border border-exam-slate-200 bg-white shadow-sm` + `px-4 py-4 sm:px-6`.
- **Korunan (görünmez) tek değişiklik: cevap kaydetme.** Commit'te yalnız çoktan seçmeli cevaplar sunucuya gidiyordu. Diğer formatlara yalnız `useAnswerSync` / `useSavedAnswer` + `itemId` eklendi; hiçbir JSX/sınıf değişmedi (diff'te markup satırı yok). `answerJson` biçimleri 03'teki tabloyla aynı.
- Öğrenci kabuğu (üst çubuk: süre/sıra, alt çubuk: Önceki · numaralar · Sonraki, diyaloglar) aynen kaldı; bunlar soru içeriği değil.

Kural: soru görünümü değişecekse `exam-player` içinde yapılır ve hem önizlemeye hem öğrenciye yansır; öğrenci kapsamında `.exam-player` ezilmez.

### 05 eki — giriş ekranı görünmeyen metinler

Neden: `student-theme.css` içindeki `[data-panel="student"] { background; color; font-family }` katmansızdı; katmansız CSS Tailwind utility katmanını ezer. Giriş kökündeki `bg-primary-600` açık gri `--bg` ile eziliyor, üzerindeki beyaz metinler ("Sınavlarım", "Personel girişi") görünmüyordu. Bu üç bildirim `@layer base` içine alındı (değişken tanımları katmansız kalır). Kural: tema dosyalarında element stilini (background/color) katmansız yazma.

Ayrıca: kullanıcı adı alanına örnek yer tutucu, alt bağlantı tam beyaz.

### 05 eki 2 — CSS yorum hatası, effect düzeltmeleri

- `student-theme.css` yorumundaki `bg-*/text-*` içindeki `*/` yorumu erken kapatıyordu (Turbopack: "Parsing CSS source code failed"). Metin değiştirildi. Kural: CSS yorumlarında `*/` dizisi geçmesin.
- `react-hooks/set-state-in-effect` (öğrenci akışı): `ExamFlowProvider` ilk yükleme ve `auth-provider` oturum sorgusu mikro görevde başlıyor; `useExamClock` sunucu saatini effect yerine render sırasında eşitliyor (önceki-değer kalıbı). Admin/yazım tarafındaki aynı türden mevcut hatalar (MediaPicker, ExamPages, QuestionEditor, LibraryPages, DataGrid ref, Toaster…) bu kapsamda değil, dokunulmadı.

### 05 eki 3 — onay penceresi düzeni

`KidDialog`: ikon artık üstte tek başına bir satırda değil, solda (44px); başlık (`text-lg`) ve açıklama sağında. Açıklamadaki madde listeleri küçük noktalı. Düğmeler geniş ekranda sağa yaslı ve içerik genişliğinde (Vazgeç · Başla), mobilde tam genişlik ve asıl eylem üstte. Pencere `max-w-lg`.

### 05 eki 4 — kenar gezinme

Geniş ekranda (`lg`, ≥1024px) Back / Next (son soruda Finish) sayfanın sol/sağ kenarında, dikeyde ortalı ve `fixed`: 56px yuvarlak ok + altında etiket (Back beyaz, Next mavi, Finish güneş sarısı). Soru alanı bu ekranlarda `lg:px-24 xl:px-28` yan boşlukla düğmelerin altına girmez. Alt çubukta lg+ yalnız soru numaraları kalır; telefon/dikey tablette Back/Next alt çubukta (kenarda yer yok). Kurallar aynı: geri dönüş kapalıysa Back yok, cevapsız ve atlama kapalıysa Next pasif.

### 05 eki 5 — istek döngüsü önlemleri

Belirti: soru sayfasının adresine art arda yüzlerce GET (heartbeat aralarında). Öğrenci akışında sayfa isteği üreten tek yer `ExamFlowProvider`daki `router.replace` çağrıları.

- `navigateOnce`: adres çubuğundaki gerçek yol (`window.location.pathname`) zaten hedefse yönlendirme yapılmaz (`usePathname` bir an geride kalabiliyordu); aynı hedefe 1 sn içinde ikinci kez gidilmez; tekrarlarsa geliştirmede konsola `[exam-flow] yönlendirme döngüsü engellendi` yazılır. Eski `redirectTo` ref, eşitlikte sıfırlandığı için her state değişiminde yeniden tetiklenebiliyordu; kaldırıldı. Geri tuşu (`popstate`) da aynı yoldan.
- Soru ekranında süre 0 olunca gönderilen heartbeat 5 sn kilitli (sunucu `running` döndürürse her yanıtta yeniden POST atılıyordu).

Döngü sürerse tarayıcı konsolundaki uyarı (to / reason / path) nedeni gösterir.

### 05 eki 6 — boşluk seçici kırpılması, geçen süre kalıcılığı

- `FillBlanksView` › `BlankPicker` listesi `absolute` idi; soru kabı (`overflow-hidden`, öğrenci ekranı ve admin önizlemesi aynı) listeyi kesiyordu. Liste artık `useFloatingPanel` + `createPortal` ile `fixed` (CLAUDE.md açılır panel kuralı); dışarı tıklama paneli de içeride sayar; uzun listede kaydırma (`max-h-72`). Ortak bileşen olduğu için önizlemeye de yansır; metinler değişmedi.
- Süresiz bölümdeki "Time" sayacı sayfa yenilenince sıfırlanıyordu. Backend saatinde (`clock`) geçen süre alanı yok (yalnız kalan süre). Sayaç `sessionStorage` `ilc-elapsed:{applicationId}:{sectionId}` anahtarında tutuluyor: yenilemede kaldığı yerden sürer, bölüm başına ayrı, bağlantı beklenirken durur. Sekme kapanırsa sıfırlanır; kalıcı ve cihazlar arası doğru değer için backend clock içine `sectionElapsedMs` eklenmeli.

---

## 06 — Genel review: davranış hataları ve cihaz uyumu (2026-10-06)

**Hatalar**
- **Hızlı geçişte cevap kaybı:** `useAnswerSync` cevabı 400 ms gecikmeyle gönderiyor, bileşen kapanırken zamanlayıcıyı iptal ediyordu; öğrenci seçip hemen Next'e basarsa cevap gitmiyordu (commit'teki çoktan seçmelide de vardı). Kapanışta bekleyen cevap artık hemen gönderiliyor.
- **Next 5 sn kilitli kalıyordu:** "cevaplandı" bilgisi yalnız sunucunun `answeredItemIds` listesinden (heartbeat, 5 sn) geliyordu; atlama kapalı bölümde cevap verdikten sonra "Answer this question to continue" görünmeye devam ediyordu. `LiveExamSessionProvider` `onSaved(partId)` ile kayıt anında haber veriyor; sayfa part → soru eşlemesiyle yerel kümeye ekliyor (sunucu listesiyle birleşir). Numara da anında yeşile döner. Not: ses/video/görsel yükleme cevapları `saveAnswer` kullanmaz; onlarda sunucu listesi beklenir.

**Cihaz uyumu**
- Laptop/geniş ekran: kenar Back/Next düğmeleri pencere kenarı yerine içerik kabının (`student-container`) kenarına hizalı; büyük monitörde içerikten kopmaz.
- Ana sayfa 1024–1279px: yan panel varken sınav kartları tek sütun (iki sütunda bilgi kutuları sıkışıyordu); `xl` ve `md` (yan panelsiz) iki sütun.
- "Devam et: …" düğmesinde uzun sınav adı kısaltılıyor (`min-w-0`); bölüm sayaç rozeti `text-sm` 24px.
- 380px altı telefonda adım çubuğunda yalnız etkin adımın adı görünür (diğerleri numara + ekran okuyucu metni).

Gözden geçirilip sorun bulunmayanlar: hazırlık (mobilde aside altta, `lg` yapışkan), bölüm listesi (`md` iki sütun), cihaz kontrolü, bitiş, onay penceresi (mobilde alttan, düğmeler tam genişlik), soru üst çubuğu (mobilde etiketsiz saat + ara ver ikonu), alt çubuk (mobilde ikon düğmeler + kaydırılabilir numaralar, güvenli alan boşluğu).

### 06 eki — tablet alt çubuk düğmeleri

Back / Next / Finish farklı genişlikteydi ("Finish section" uzun) ve yalnız Next/Finish'te 3px kabartma gölgesi vardı; numaralar ortadan kayıyor, Back alçak ve sönük duruyordu. Artık `FOOTER_BTN`: tablette (sm–lg) üçü de 7.5rem eşit genişlik, 44px yükseklik; Back'e de aynı kabartma (açık mavi) eklendi; Finish etiketi her yerde "Finish" (ekran okuyucuya "Finish section"). Telefonda Back/Next 44px kare ikon (`FOOTER_ICON`). Not: `cn` sınıf birleştirmiyor; KidButton'ın `px-4`ünü ezmek için `!` kullanıldı.

## 07 — Cihaz kontrolü (mikrofon/kamera) yeniden yazıldı (2026-10-06)

Dosya: `app/student/exams/[recipientId]/checks/page.tsx`.

Sorunlar: kayıt sabit 5/6 sn `setTimeout` ile çalışıyordu — durdurma/vazgeç yoktu, geri sayım yoktu, öğrenci hazırlanmadan kayıt başlıyordu; sayfadan çıkınca kayıt ve yükleme sürüyor, unmount sonrası setState oluyordu; `NotFoundError` / `NotReadableError` (cihaz yok / başka uygulamada açık) tek "Kayıt alınamadı" mesajına düşüyordu; HTTP veya MediaRecorder yoksa çöküyordu; canlı video `ref` callback'i her render'da `srcObject` atıyordu; mikrofon ölçeri kartı her karede yeniden çiziyordu; webm kayıtlarında süre `Infinity` olduğundan oynatıcı çubuğu bozuktu; blob URL'leri serbest bırakılmıyordu.

Çözüm: aşamalar `idle → requesting → countdown (3-2-1) → recording → uploading → review`. Canlı önizleme (ayna) geri sayımda da görünür; kayıtta kalan saniye + ilerleme çubuğu, "Bitir" (en az 1,5 sn sonra) ve her aşamada "Vazgeç". Her deneme numaralı (`runRef`); vazgeç/unmount eski sonuçları yok sayar ve izleri kapatır (kamera ışığı söner). Hata adları ayrı Türkçe mesajlara çevrildi, çok kısa kayıt reddedilir, `fixInfiniteDuration` ile oynatıcı süresi düzeltilir, ölçer DOM'a doğrudan yazar.

### 07 eki — cihaz kartı sabit sahne

Aşama değiştikçe kart yüksekliği zıplıyordu ("Mikrofon açılıyor…" tek satır metin, kayıt ölçer, inceleme oynatıcı hep farklı boyda). Artık kart: başlık → tek satırlık durum satırı (`min-h-6`, `aria-live`) → **sahne** (kamera `aspect-video`, mikrofon `h-44`) → düğmeler (`mt-auto`, iki kart yan yana eşit boy). Sahne içinde: adım listesi (numara rozetleri) / izin bekleme (cihaz ikonu + yavaş dönen halka + "İzin ver"e bas) / geri sayım (kamerada görüntü üstünde büyük rakam, mikrofonda büyük rakam + ölçer) / kayıt (kalan sn rozeti, alt kenarda ilerleme şeridi) / hazırlanıyor / inceleme (video sahneyi doldurur, ses oynatıcısı ortada).

## 08 — PLAN: Sınav ekranı UX revizyonu (2026-10-06, onay bekliyor)

Hedef kitle ilkokul–ortaokul (7–14), öncelik tablet (dokunmatik), sonra web ve mobil. Soru alanı `exam-player` admin önizlemesiyle ortak: her değişiklik iki tarafa da yansır; önizlemede (`preview`) dinleme limiti/kilit uygulanmaz, doğru cevap gösterimi bozulmaz.

### Ön bulgular (koddan)
- Sürükle-bırak native HTML5 DnD (`onDragStart/onDragOver`) — **iPad/Android tablette dokunmayla çalışmaz**; yalnız tıkla-seç yolu var ve görünür değil. Kaymaların ana kaynağı bu.
- `QuestionView` içinde Türkçe metinler var ("Yönerge yok", "Henüz part yok", Placeholder "Görsel/Ses"). Ana sayfa, hazırlık, bölüm listesi, bitti ekranı, status.ts tamamen Türkçe.
- Yönerge sesi (`instructionAudio`) veri modelinde ve oynatıcıda var (ikon), ama dikkat çekmiyor / bazı soru tiplerinde boş geliyor olabilir — doğrulanacak.
- Galeri `columns` destekliyor; video/ses bloklar ve seçenekler tek sütun.
- Writing `textarea` ve görsel/video yükleme `ResponseViews.tsx` içinde.
- Giriş hakkı (`attemptsLeft`) ana sayfada gösteriliyor; yeniden giriş akışı bitti ekranına düşüyor.

### Faz A — Altyapı (diğer her şeyin temeli)
A1. **Ortak etkileşim katmanı** `interactions/dnd.ts`: Pointer Events tabanlı sürükle-bırak (fare + dokunma + kalem), sürüklenen öğenin "hayaleti", bırakma alanı vurgusu, `touch-action: none`, kaydırma ile çakışmaz. Klavye/tıkla-seç yolu korunur (tıkla → seçili → hedefe tıkla). Grouping, Matching, Ordering, FillBlanks, Hotspot-drag aynı katmanı kullanır.
A2. **Ortak "geri alma" modeli**: yerleştirilen her öğede × düğmesi + öğeye tıklayınca havuza dönüş (tüm formatlarda aynı davranış), alt kısımda "Start over / Reset" (onaylı, KidDialog). Bugünkü tutarsızlık (bazısında dönüyor, bazısında dönmüyor) kalkar.
A3. **Medya kilidi** `MediaContext`: bir oynatıcı çalarken global `mediaBusy`; diğer ses/video başlatılamaz, Back/Next/Finish/bölüm değişimi kilitli ("Wait for the audio to end"). Önizlemede kilit yok. Çalarken duraklat/geri sar yok (seekable=false varsayılanı öğrenci tarafında), bitene kadar sürer; hak sayısı kadar çalınır (zaten var, sertleştirilecek: yenilemede hak sessionStorage'da korunur).
A4. **Format etiketi** üst-sol: her part başında "Format rozeti + 1 satır nasıl yapılır" (`FORMAT_HELP` sözlüğü, A1–A2 İngilizce): örn. *Drag and drop* — "Drag each word to a box. Tap × to take it back." Admin önizlemesinde de görünür (öğretmen de anlar).

### Faz B — Format bazında
B1. **Çoktan seçmeli / görsel seçmeli**: tüm kart tıklanabilir (sadece küçük daire değil), min 44–56px, seçili halde kalın çerçeve + ✓ rozeti + renk (yalnız renk değil). Sadece görsel seçenekler → yan yana ızgara (2 sütun tablet/mobil, 3–4 geniş), eşit kare kart.
B2. **Görsel/video blokları ve gruplu görsel alanlar**: video ve görseller `@container` ile 2 sütun; çalan video/ses kartı odak çerçevesi alır, diğerleri soluklaşır ve kilitli.
B3. **Dinleme düğmesi**: oynatırken "Listening…" durumu (dalga + ilerleme, düğme devre dışı), kalan hak noktaları; bitince "Done" / "No more plays". Ses bitmeden eşleştirme/cevap alanı başlamaz (opsiyonel kural: mainAudio en az bir kez dinlenmeden cevap alanı "Listen first" kilidi — **karar gerekli**).
B4. **Yönerge sesi**: mavi yönerge bandında görünür "🔊 Listen" düğmesi; `instructionAudio` varsa kullan, yoksa gizle (TTS üretimi bu kapsam dışı — **karar gerekli**).
B5. **Boşluk doldurma (kelime havuzlu)**: boşluk = kesik çizgili, hafif renkli "tap here" yuvası + küçük ok/el ikonu, odaklı boşluk belirgin; seçilen kelime yuvada çip, × ile geri. Açılır seçici portal'da kalır, tasarımı tema ile uyumlu.
B6. **Açık uçlu boşluk doldurma**: tıklanınca oluşan çirkin kutu yerine satır içi alt çizgili input, odakta yumuşak halka (exam-player paleti), genişlik içeriğe göre büyür.
B7. **Eşleştirme**: iki sütun kart (sol hedef, sağ seçenek), eşleşen çiftler aynı renk/numara rozeti, çizgi yok (tablette kaymaz). Görsel eşleştirmede havuz görselleri büyük (incelemek için), hedef yuvaya yerleşince küçük küçük önizleme; havuz altta, hedefler üstte.
B8. **Gruplama / sıralama**: sütunlar sabit min-yükseklik (bırakınca zıplama yok), sıralamada yuvalar numaralı; görsel öğelerde havuzda büyük, sütunda küçük.
B9. **Görsel/video yükleme**: yüklendikten sonra input gizli, düzgün önizleme (oran korunur) + çöp kutusu ikonu → onay → kaldır, yükleme alanı tekrar açılır. Yükleniyor/hata durumu.
B10. **Writing (textarea)**: otomatik kaydetme yok; "Save answer" düğmesi, durum "Saved ✓ / Not saved yet" ve kelime sayısı. Kaydedilmemişken Next/Back'te KidDialog uyarısı ("Save your answer?" Save / Leave). Not: bugünkü genel autosave yalnız bu format için kapatılır.

### Faz C — Sınav kabuğu
C1. **Süre**: süre limiti varsa geri sayım (Time left), yoksa sayaç gizli (geçen süre gösterilmez) — **karar: hiç mi gösterme, yoksa "Time spent" kalsın mı?** Varsayılan: gizle.
C2. **Giriş hakkı**: hak varken "Start again" doğrudan yeni deneme açar (bitti ekranına düşmez); bitti ekranında kalan hak varsa "Try again (2 left)" düğmesi, yoksa açık mesaj. Backend'in yeni attempt açma uç noktası kontrol edilecek.
C3. **Tamamen İngilizce öğrenci paneli**: ana sayfa, hazırlık, cihaz kontrolü, bölümler, bitti, sonuçlar, status.ts, giriş ekranı, hata/yükleme metinleri — A1–A2 dil seviyesi, kısa cümle. exam-player içindeki Türkçe kalıntılar İngilizce (admin önizleme bandı Türkçe kalır, yalnız `preview`te).
C4. Duyarlılık: tablet dikey/yatay, 375px telefon, masaüstü; dokunma hedefi ≥44px; sürüklemede sayfa kaydırması kilidi.

### Uygulama sırası
A1+A2 → B7/B8/B5 (sürükle-bırak formatları) → A3+B3+B2 → B1 → B6 → B9/B10 → A4 → C2 → C3 → C1/C4 → review + build. Her faz sonunda bu belgeye bölüm + CLAUDE.md günlüğü.

### Kararlar (2026-10-06)
1. Sürükle-bırak: `@dnd-kit` eklenecek.
2. Ana ses: yalnız çalarken kilit (geçiş/diğer medya); cevaplama serbest.
3. Yönerge sesi: yalnız kayıtlı `instructionAudio`; yoksa düğme yok (TTS yok).
4. Süre limiti yoksa sayaç gizli; limit varsa geri sayım.

## 09 — Sınav ekranı UX revizyonu uygulandı (2026-10-06)

08'deki planın uygulaması. Soru alanı değişiklikleri `exam-player` içinde → admin/staff "Öğrenci önizlemesi" de aynı görünür; önizlemede kilitler (dinleme hakkı, medya kilidi, kaydet uyarısı) çalışmaz.

**Altyapı**
- `@dnd-kit/core` + `@dnd-kit/sortable` eklendi. `dnd/PlaceBoard.tsx`: `PlaceBoard` (sürükle **veya** dokun-seç → kutuya dokun), `DragItem` (havuzda büyük, kutuda küçük; kutudaki karta dokununca havuza döner, × rozeti), `DropZone` (boş / hazır / üstünde / dolu durumları, `inline` = metin içi boşluk), `DragPool` (duruma göre yönlendirme metni, havuza geri sürükleme), `StartOver` (iki adımlı onay), `EmptySlot`. Sürüklenen kartın yeri soluk kalır (kayma yok), sürüklenen kopya body'ye portal (kırpılmaz). Dokunmada 120 ms basılı tutunca sürükleme başlar; hızlı kaydırma sayfayı kaydırır. Eski `usePickAndPlace` (HTML5 DnD, tablette çalışmıyordu) silindi.
- `session/playerGuard.ts`: aynı anda tek medya (`claimMedia/releaseMedia`), kaydedilmemiş cevaplar (`setUnsaved`, `saveAllUnsaved`). Sınav sayfası `usePlayerGuard` ile okur.
- `FormatHint`: her sorunun sol üstünde tür rozeti + A1–A2 tek cümle "ne yapacağım". Tüm bölümler aynı türdeyse bir kez en üstte.

**Medya**
- Ses kartı: büyük oynat düğmesi, çalarken "Listening… Please listen to the end." + dalga + ilerleme; öğrencide duraklatma/ileri sarma yok, hak noktaları ("2 plays left"). Yönerge sesi mavi bandın yanında "Listen" düğmesi (yalnız kayıtlı ses varsa).
- Video: öğrencide kendi oynat katmanı, sonuna kadar oynar, hak sayısı, çalarken kart çerçeveli ve ekrana kaydırılır; bekleyen diğer medya soluk ve kilitli. Önizlemede yerel denetimler.
- Ses/video çalarken sınav sayfasında Back/Next/Finish/soru numaraları/Break kilitli ("Please wait. Listen or watch to the end.").
- Arka arkaya gelen video/görsel blokları 2 sütun; galeri dar alanda en fazla 2 sütun.

**Formatlar**
- Çoktan seçmeli / çoklu seçim: kartın tamamı dokunma alanı (`role=radio/checkbox`), seçili = kalın çerçeve + ✓ işaret (+ görselde "Chosen"); görsel seçenekler 2–4 sütun ızgara, video 2 sütun; ses/video oynatma seçimi tetiklemez. Çoklu seçimde "Choose 2. Chosen: 1 / 2".
- Doğru/Yanlış: ✓ + kalın çerçeve, `aria-pressed`.
- Eşleştirme: numaralı satır (sol) + kutu (sağ), cevap havuzu altta (görseller büyük ızgara), kutuda küçük önizleme.
- Gruplama: grup sütunları (başlık + sayaç, sabit min yükseklik), havuz altta.
- Sıralama: `@dnd-kit/sortable` (diğer kartlar yer açar) + her kartta yukarı/aşağı düğmeleri; "Start over" ilk sıraya döner.
- Boşluk doldurma (seçmeli): numaralı, kesik çerçeveli "Choose ▾" yuvası; liste başlığı "Gap 2 · Choose a word", "Empty this gap". Kelime havuzlu: metin içi bırakma yuvaları + havuz.
- Açık uçlu boşluk: numaralı değil, "Write here" yer tutuculu kutu; boşken kesik mavi, doluyken düz; yazdıkça genişler.
- Görsel üstü seçme: seçilen yer ✓, bölgeler gizli olsa da seçim görünür. Görsel üstü yerleştirme: PlaceBoard.
- Writing: otomatik kaydetme kaldırıldı → "Save answer" + "Not saved yet / Saved". Kaydedilmemişken geçişte KidDialog "Save your answer?" (Save and go / Stay here); süre bitince bekleyen metin kaydedilir.
- Görsel/video yükleme: büyük yükleme alanı → önizleme kartı + "Remove" (onaylı); kaldırınca yükleme alanı geri gelir. Yüklenen dosyalar cevap olarak (`{ mediaIds }`) kaydedilir: soru "cevaplandı" sayılır, kaldırma da yansır, soruya dönünce önizleme geri yüklenir.

**Sınav akışı**
- Giriş hakkı: biten denemenin oturumu okununca bitti ekranına atıyordu. Artık durum `FINISHED` ve hak varsa oturum temizlenir, hoş geldin ekranı yeni deneme (kutu yeniden işaretlenir, "Start again", "Try 2 of 3") gösterir. Bitti ekranında hak varsa "Try again (N tries left)".
- Süre: sınır varsa geri sayım, yoksa sayaç yok (soru ekranı ve bölüm listesi). Geçen süre sayacı kaldırıldı.
- Öğrenci paneli tamamen İngilizce (A1–A2): giriş, ana sayfa, hazırlık, cihaz kontrolü, bölümler, soru ekranı, bitti, durum etiketleri, tarih biçimi (en-GB), hata metinleri; kabukta `lang="en"`. Admin önizleme bandı/doğru cevap notları Türkçe kalır.

**Kontrol**: `tsc` temiz, `next build` temiz; lint'te yalnız önceden var olan PreviewRubricPanel hatası + iki eski uyarı.

**Sonraki adımlar**: gerçek tablette (iPad/Android) sürükleme hissi ve 120 ms gecikme ayarı; görsel/video kaldırmanın değerlendirme ekranına yansıması (backend `mediaIds` okuyor mu) doğrulanmalı; uzun metinli sürükle-bırakta otomatik kaydırma testi.

## 10 — 09'un review'u: hatalar ve eksikler (2026-10-06)

**Sınav güvenliği**
- Dinleme hakkı soru değişince / sayfa yenilenince sıfırlanıyordu → hak sınav oturumunda (`sessionStorage`, uygulama + medya kimliği) saklanır. Konuşma kaydı ve video yükleme deneme sayısı da aynı şekilde (`useAttempts`).
- Hızlı çift dokunuş iki hak düşürebiliyordu → hak, oynatma başlarken hemen düşer; çalınamazsa geri verilir.
- Medya tuşu / kulaklık düğmesiyle öğrenci sesi duraklatıp kilidi açabiliyordu → öğrencide duraklatma olursa ses kaldığı yerden sürer (bileşen kapanmışsa sürmez).
- `QuestionView` soru değişince yeniden kurulmuyordu (ana ses / yönerge sesi önceki sorunun oynatıcısını kullanabiliyordu) → soru kimliğiyle `key`.
- Konuşma kaydı: süre sınırında kendiliğinden durur; sunucuya gerçek süre gider (önce sınır süresi gidiyordu); kayıt sürerken soru geçişi ve diğer medya kilitli; soru kapanırsa mikrofon kapatılır.

**Görünüm (sınıf çakışmaları)** — `cn` birleştirmez (tailwind-merge yok); aynı özelliğe iki sınıf verilince sonucu CSS sırası belirliyordu.
- `DropZone` varyantlı: `box | pool | overlay` + `correct`; renk/kenarlık bileşen içinde tek seçilir, `className` yalnız yerleşim. `DragItem` `compact`. `DragPool` `listClassName` varsayılanın yerine geçer (`POOL_IMAGE_GRID`); flex+grid çakışması giderildi.
- Kart seçiliyken havuz da hedef gibi parlıyordu (dokununca bir şey olmuyordu) → havuz yalnız sürüklerken hedef.
- Ses kartı/düğmeleri, açık uçlu boşluk, Writing kutusu: durum sınıfları tek dal.
- Görsel üstü yerleştirmede çokgen alan tüm görseli kaplıyordu (bırakma her yerde o alana düşüyordu) → sınırlayıcı dikdörtgen.

**Kullanılabilirlik**
- Sıralama: kartlar zaten doğru sıradaysa cevap hiç kaydedilmiyordu (atlama kapalıysa Next açılmıyordu) → "Keep this order".
- Tek seçimde `radiogroup` rolü; "Start over" onayı dar ekranda satır kırar; havuz sürüklerken "Drop it here to take it back" der.
- Kullanılmayan `epChip`, `epDrop`, `epCta` silindi; son Türkçe kalıntılar (yükleme hatası, şema hatası) İngilizce.

**Kontrol**: `tsc` ve `next build` temiz. Lint: yalnız önceden var olan `PreviewRubricPanel` hatası ve iki eski bağımlılık uyarısı.

**Hâlâ cihazda doğrulanmalı**: iPad/Android'de 120 ms sürükleme gecikmesi ve kaydırma; iOS'ta medya tuşuyla duraklatma sonrası otomatik devam; değerlendirme ekranının `{ mediaIds }` / `{ mediaId }` cevaplarını okuması (backend).


## 11 — Backend uyumu, iOS/tablet ve dokunuş güvenilirliği (2026-10-06)

**Backend sözleşmesi** (`openapi/openapi.json` › `AnswerRequest { answerJson, mediaId?, seq }`)
- Medya cevapları (konuşma, video, görsel) artık üst düzey `mediaId` ile de gönderilir (`saveAnswer(itemId, answer, mediaId)`; kuyruk bunu taşır). `answerJson` içinde `{ mediaId }` / `{ mediaIds }` kalır (ekrana geri yükleme için).
- Diğer formatların cevap anahtarları değişmedi: `optionId, optionIds, answers, choiceIds, pairs, order, groupOf, regionIds, zoneOf, text`.
- Not: değerlendirme ekranı (`GradingSection`) cevabı ham metin/JSON gösteriyor; medya cevapları orada yalnız kimlik olarak görünür. Oynatılabilir önizleme staff tarafında ayrı iş. Görsel kaldırıldığında üst düzey `mediaId` boş gönderilir; backend'in eski bağı silip silmediği doğrulanmalı.

**Dokunuş güvenilirliği**
- dnd-kit dokunmada 120 ms basılı tutunca sürüklemeyi başlatıyor ve başladıktan sonra tıklamayı yutuyor (kaynakta doğrulandı) → yavaş dokunan çocuğun "seç" dokunuşu kayboluyordu. Hareketsiz (< 8 px) biten sürükleme artık dokunuş: havuzdaki kart seçilir / seçim kalkar; kutudaki kart havuza döner, elde başka kart varsa o kart bu kutuya (`DragItem zone`).

**iOS / tablet**
- Sürüklenebilir kartlarda `-webkit-touch-callout: none` (basılı tutunca sistem menüsü / görsel önizlemesi açılmaz); görseller `draggable=false`.
- Sürüklenen kopya panel köküne portal (`overlayRoot`): öğrenci fontu/teması korunur, kırpılmaz.
- Konuşma kaydı uzantısı türden: iOS `audio/mp4` → `.m4a`, Chrome/Android `.webm`.
- Video kapak karesi `#t=0.1` (iOS Safari metadata ile kare çizmiyordu, siyah kutu).
- Dokunma hedefleri ≥ 44 px: sıralama okları, Start over / Remove ve onay düğmeleri, "Keep this order"; kutudaki kart en az 40 px.
- Ekran okuyucu yönergesi dokun-seç yoluna göre (`DND_A11Y`); dnd-kit'in varsayılan "boşlukla kaldır" metni kaldırıldı (klavye sürükleyici yok).
- Yazı alanları 16 px (iOS odakta yakınlaştırmasın): açık uçlu boşluk ve Writing kutusu.
- Container query (iOS 16+) kullanan ızgaralar eski iOS'ta tek sütuna düşer (bozulmaz).

**Temizlik**: `PreviewRubricPanel` effect içi senkron setState lint hatası giderildi (önceden vardı). exam-player lint temiz; `tsc` ve `next build` temiz. Kalan iki uyarı (bölüm sayfası `resumeItemId`, ExamFlowProvider `state`) bilinçli bağımlılık eksiltmeleri, önceden var.


## 12 — Önce izle/dinle kilidi, video/görsel kartlar yan yana (2026-10-06)

Sorun (ekran görüntüsü, gruplama): video kartları izlenmeden taşınabiliyordu; videolar alt alta tam genişlikte, çok yer kaplıyor ve taşımak zor.

- **Önce izle / dinle**: ses/video seçenekli kart, medya en az bir kez sonuna kadar oynatılmadan taşınamaz ve seçilemez. Kartın altında kilit uyarısı: "Watch the video to the end first." / "Listen to the end first."; kartın içindeki oynat düğmesi çalışır. Kapsam: gruplama, eşleştirme, görsel üstüne yerleştirme (`OptionDragItem`), sıralama (satır sürükleme + oklar), çoktan seçmeli/çoklu seçim (`OptionButton`). Önizlemede kilit yok.
- "İzlendi" bilgisi `playerGuard` › `markHeard / useHeard` (oturumda saklanır: soruya geri dönünce / yenilemede yeniden izletmez). Medya sonuna kadar oynayınca ya da hakkı bitince (yarıda kesilse bile) işaretlenir; böylece hakkı biten kart kilitli kalmaz.
- **Yan yana**: havuzda video kartları 2 sütun (`POOL_VIDEO_GRID`, çok dar alanda tek), görseller 2–4 sütun; dizilim `poolListClass(format)` ile tek yerden. Çoktan seçmelide video 2 sütun (`@xs`). Sıralamada görsel/video kartları kutu ızgarası (video 2 sütun); önceden dikey sıralamada video yalnız ikon çiziliyordu (izlenemiyordu).
- Kutuya yerleşen video kartı küçük kapak karesiyle görünür (`VideoThumb`), hangi video olduğu anlaşılır.


## 13 — Sürüklenen kart imleçten kopuyordu (2026-10-06)

- Neden: dnd-kit `DragOverlay` kutusunu kaynak kartın genişlik/yükseklik ve sol üst köşesiyle konumlar (`PositionedOverlay`: `width, height, top, left` = kaynak). İçeride küçük kopya (`size="sm"`) çizildiği için kopya kutunun sol üst köşesinde kalıyor; büyük video/görsel kartı ortasından tutulunca kopya imlecin çok üstünde/solunda görünüyordu.
- Çözüm: `OVERLAY_STYLE` (`width/height: auto`, dnd-kit kullanıcı stilini en son uygular) + `followPointer` modifier: farede kopyanın ortası imlecin altında, dokunmada kopya parmağın 16px üstünde (parmak kartı kapatmasın). Kopya genişliği `w-max`, en fazla 18–20rem / %80 ekran. Hem `PlaceBoard` hem sıralama (`OrderingView`) kullanır.


## 14 — Yerleşen görsel kutuyu doldurur (puzzle) (2026-10-06)

- `DragItem fill` + `OptionContent size="fill"`: kutuya yerleşen görsel/video kartı kabını tamamen kaplar (`object-cover`, altta yazı şeridi, köşede beyaz × rozeti); küçük ikon/küçük resim yerine tam görsel.
- Görsel üstüne yerleştirme: parça alanı tamamen kaplar (birden fazla parça yan yana paylaşır, elips alanda köşeler kırpılır).
- Gruplama: görseller grubun içinde kare tam görsel kutucuklar (2–3 sütun, grup kendi `@container`ı).
- Eşleştirme: eşleşen görsel 128–144px yüksek kutuyu doldurur.
- `MediaImageSlot` artık className verilince `object-contain` zorlamaz (cover/contain çağıran seçer; sınıf çakışması giderildi).


## 15 — Boşluklar düz metin gibi (2026-10-06)

- Sorun: seçilen kelime numaralı, çerçeveli "Choose ▾" kutusunda kalın yazılıyordu; cümle akışı bozuluyor, metin rahat okunmuyordu. Kelime HTML'inde `<p>` varsa satır içinde blok gibi kırılıyordu.
- Yeni (eski düz hâlden ilham): boşluk cümlenin parçası, yalnız alt çizgi. Boş = kesik mavi çizgi + açık mavi zemin + küçük numara + ok (dokunulacağı belli); dolu = düz koyu çizgi, kelime normal metin boyunda ve yarı kalın, numara gizli; açıkken mavi zemin. `gapClass` (seçmeli), `DropZone variant="gap"` + `DragItem plain` (kelime havuzu, küçük × yanında), `InlineWord` (p/div satır içi).
- Açık uçlu boşluk (`epBlankInline`) aynı alt çizgili görünüm; satır aralığı 2.4.


## 16 — Boşluk hizası ve okunaklı noktalar (2026-10-06)

- Sorun (ekran görüntüsü): boş boşluktaki numara dairesi ve kesik çizgi metnin taban çizgisinden aşağı kayıyordu (`inline-flex` + `items-baseline` + `self-center`); numara anlaşılmıyordu.
- Eski tasarım temel alındı: boş boşlukta numara yok, okunaklı "•••" (mavi, kalın, aralıklı); sıra numarası yalnız ekran okuyucuda ("Gap 2"). Hafif iyileştirme: mavi kesik alt çizgi, açık zemin, küçük ok.
- Hizalama: boşluk, kelime havuzu yuvası ve yerleşen kelime `inline-block` + `align-baseline` + `leading-normal` + `whitespace-nowrap` → metnin taban çizgisine oturur, ok `align-middle`.


## 17 — Boşluk zemini şeffaf, yalnız dolu boşluk altı çizili (2026-10-06)

- Eski tasarıma dönüş: boşluğun zemini hep şeffaf (boş/dolu/açık). Boş = yalnız "•••" + küçük ok, çizgi yok. Dolu = kelime boşluğu doldurur, metin altı çizili (`underline decoration-2 underline-offset-4`, koyu; liste açıkken mavi).
- Kelime havuzu yuvası da şeffaf; yalnız sürüklerken / kelime seçiliyken bırakılacak yer hafif mavi yanar (nereye bırakılacağı belli olsun). Yerleşen kelime aynı altı çizili düz metin.

## 18 — Yönerge sesi öğrencide görünmüyordu; önizlemelerle model eşlendi (2026-10-07)

- Kök neden: öğrenci bölüm sayfası `QuestionViewModel`'i `body`'den alan alan kuruyordu ve `instructionAudio`'yu atlıyordu. Soru düzenleyici önizlemesi (`previewModelFromDetail` / editör modeli) bu alanı veriyordu; bu yüzden yönerge yanındaki "Listen" düğmesi yalnız önizlemede çıkıyordu.
- Öğrenci sayfası ve admin sınav "Önizleme" sekmesi (`ExamExtraTabs` › `modelOf`) artık `instructionAudio`'yu da aktarıyor.
- Sınav önizleme sekmesi soruyu öğrenci ekranı / `QuestionPreviewShell` ile aynı kapta çiziyor (`rounded-lg border-exam-slate-200`, `px-4 sm:px-6`).
- Bilerek farklı kalanlar (önizleme modu): sarı "Önizleme modu" şeridi, oynatıcıda duraklat düğmesi ve sınırsız dinleme, doğru cevap işaretleri. Öğrencide: hak sayacı, "Listening…" ve çalarken kilit.
- Sonraki adım: model kurulumu üç yerde tekrarlanıyor (öğrenci sayfası, `modelOf`, `previewModelFromDetail`). Tek bir `toQuestionViewModel(body, parts)` yardımcısına toplanmalı; böylece yeni bir alan bir ekranda unutulamaz.

## 19 — Sıralama alt alta; video kapak + modal oynatıcı (2026-10-07)

- Sorun: sıralama sorularında görsel/video kartları 2–4 sütunlu ızgaradaydı, sıra (1, 2, 3…) satır satır okunmak zorundaydı ve anlaşılmıyordu. Videolar büyük oynatıcıyla yer kaplıyordu.
- `OrderingView`: her format tek sütun, alt alta (`verticalListSortingStrategy`). Satır = sıra no · tutamak · içerik · ↑/↓. Görsel küçük kare (`h-20 w-28`, sm'de `h-24 w-36`), metin/ses aynı. `orientation: HORIZONTAL` ayarı öğrenci görünümünde artık uygulanmıyor (bilinçli).
- Yeni `MediaVideoPopup` (MediaContext): satırda küçük kapak (`w-32`/`w-40`, 16:9) + durum (Tap to watch / Watch again / Watched) + hak noktaları. Kapağa dokununca modal açılır ve video oynar.
- Öğrenci kuralları değişmedi, aynı `usePlayback`: hak sayısı, aynı anda tek medya + soru geçiş kilidi, duraklatılamaz, bitince `markHeard` → "Watch the video to the end first" kilidi açılır. Modal video bitene kadar kapanmaz: Kapat düğmesi kilitli, Esc ve dış tıklama işlemez. Oynatılamazsa (hata) kapatılabilir.
- Video öğesi modal kapalıyken de bağlı (gizli) kalır; `play()` dokunuşun içinde çağrılır (iOS otomatik oynatma kısıtı). Modal panel köküne (`[data-panel]`) portal, `.exam-player` kapsamında.
- Önizleme (admin): modalda kontroller açık, istenince kapanır (kapanınca durur), sınır yok.

## 20 — Tüm soru videoları kapak + modal (2026-10-07)

- `MediaVideo` artık `MediaVideoPopup layout="tile"` çiziyor: kabı dolduran kapak (16:9, `max-h-56`) + altında durum ve hak noktaları; dokununca modal. Böylece uyaran/kök videoları (`ContentBlockView`) ve tüm seçenek videoları (`OptionContent`: çoktan seçmeli kartlar, sürükle havuzu, eşleştirme, gruplama, hotspot) tek yapıda. Sıralama `layout="row"` (küçük kapak, yanında durum).
- Eski satır içi oynatıcı (büyük video + alt bilgi şeridi, çalınca scrollIntoView) kaldırıldı; kurallar aynı `usePlayback`.
- Olay sızıntısı: portal olayları React ağacında yukarı taşınır. Modal kökünde pointer/mouse/touch/key/click durduruluyor (modal içi tıklama kartı seçmesin, sürüklemesin). Kapak düğmesi de kendi olaylarını durduruyor; sarmalayıcıdaki durdurma kaldırıldı → kart açıklamadan tutularak sürüklenebilir.
- Kapsam dışı (soru videosu değil): öğrencinin kendi video cevabı önizlemesi (`ResponseViews`), cihaz kontrolü, admin medya/değerlendirme ekranları. Kutuya yerleşmiş küçük `VideoThumb` (sm/fill) oynatıcı değil, olduğu gibi.

## 21 — Video kartları küçük ve düzenli dizilim (2026-10-07)

- Sorun: gruplama/eşleştirme/hotspot havuzunda ve video seçeneklerinde sabit 2 sütun vardı; 3 videoda 2 üstte, 1 altta tek başına büyük duruyordu. Video artık modalda oynadığı için kartta büyük oynatıcıya gerek yok.
- `POOL_VIDEO_GRID` ve `OptionGrid` (VIDEO): `repeat(auto-fill, minmax(9.5rem | 10.5rem, 1fr))` eşit sütunlar → genişte 3–5 video tek satır, dar alanda düzenli kırılım; kartlar aynı boy.
- `MediaVideoPopup` tile: en fazla `max-w-64`, 16:9 kapak + 40px oynat rozeti, altında kısa durum ve hak noktaları (sıkı). Uyaran/kök videoları da bu boyda.
- Görsel havuzları, kutuya yerleşmiş kareler (fill) ve sıralama satırı değişmedi.

## 22 — Admin önizlemesi = öğrenci sınav ekranı: tek bileşen, tek dönüştürücü, tek kap (2026-10-07)

Denetim: soru içeriği dört yerde çiziliyor ve dördü de aynı `QuestionView` (exam-player) bileşenini kullanıyor:

| Ekran | Veri kaynağı | Mod |
|---|---|---|
| Soru düzenleyici sağ panel (`/admin|staff/content/questions/[id]`, `QuestionPreviewShell`) | editör durumu (canlı taslak) | `preview` |
| Sınav kurucu üzerine gelme önizlemesi (`QuestionPreviewLoader`) | `/authoring/questions/versions/{id}` | `preview` |
| Sınav › Önizleme sekmesi (`ExamPreviewTab`) | `/authoring/exams/{id}/preview?seed` | `preview` |
| Öğrenci sınav ekranı | `/applications/{id}/sections/{sid}/content` | öğrenci |

Sorun bileşende değil beslemedeydi: gövde → model dönüşümü her ekranda ayrı elle yazılmıştı (öğrenci ve sınav önizlemesi `instructionAudio`'yu düşürüyordu); kap (çerçeve + iç boşluk) üç yerde kopyaydı.

- `viewBodyOf(body)` (`exam-player/types.ts`): instruction, instructionAudio, mainAudio, stimulus tek yerde. Öğrenci sayfası, `ExamPreviewTab`, `previewModelFromDetail` bunu kullanıyor. Editör canlı taslağı kendi durumundan kurar (alanlar aynı).
- `QuestionFrame` (`QuestionView.tsx`): öğrenci ekranı, `QuestionPreviewShell`, sınav önizlemesi aynı kap.
- Bilinçli farklar yalnız `preview` bayrağından gelir: sarı önizleme şeridi, sınırsız/duraklatılabilir medya, kilit yok, doğru cevap işaretleri, "Yönerge yok" yer tutucu.
- Kalan dış bağımlılık: öğrenci yanıtı (`sections/{sid}/content`) `question.body.instructionAudio` döndürmezse yönerge sesi yine görünmez (backend).

### 22 eki — Lint temizliği (değişen dosyalar)

- `useAnswerSync`: "Saving…/Saved" durumu son kayıt sonucundan türetiliyor (effect içinde senkron setState yok). `useSavedAnswer`: geç yüklenen cevap, revision değişince render sırasında bir kez alınıyor (effect yerine React'in "render sırasında durum ayarı" kalıbı).
- Öğrenci bölüm sayfası: kaldığı soru `useEffectEvent` ile yükleme anında okunuyor (bağımlılık uyarısı; içerik her geçişte yeniden yüklenmiyor).
- `ExamExtraTabs`: önizleme ve lisans listesi effect içinde iptal edilebilir istek; lisans verilince `version` artar ve liste yeniden çekilir.
- Değişen dosyalarda lint 0. Projenin geri kalanında önceden kalma 26 hata + 14 uyarı var (çoğu aynı kural: effect içinde setState, render sırasında ref okuma).

### 22 eki 2 — Değişiklik incelemesi

- **Hata (düzeltildi):** video modalı `z-90` idi; sınav uyarıları daha altta (bağlantı/odak 40, KidDialog 50, tam ekran kapısı 80). Video çalarken tam ekrandan çıkılırsa video dondurulur, "oynuyor" durumda kaldığı için modal kapanmaz ve kapının üstünde kalırdı → öğrenci "tam ekrana dön"e basamaz, sınav kilitlenirdi (portal, kapının `invisible` sarmalayıcısının dışında). Artık öğrencide `z-35` (alt çubuk 30'un üstü, uyarıların altı), önizlemede `z-60` (admin kabuğu ≤50'nin üstü).
- Modal açılınca klavye odağı modala geçiyor (`tabIndex=-1` + focus).
- İncelenip sorunsuz bulunanlar: `viewBodyOf` eski alanlarla aynı sonucu veriyor; tam ekran dondurma modal videosunda da çalışıyor (kapaklar sessiz ve hiç oynamıyor); oynatılamayan video modalı kilitlemiyor; hakkı biten video açılmıyor; sıralamada kilitli satırın kapağı tıklanabiliyor; `useAnswerSync` durumu ve `useSavedAnswer` geri yükleme aynı davranıyor.
- Derleme: `jspdf` / `jspdf-autotable` package.json'da var ama kurulu değil (`npm install` gerekli; bu değişiklikle ilgisiz).

## 23 — Video kartları eşit boy, sade kilit gösterimi (2026-10-07)

- Sorun (gruplama havuzu ve diğer havuzlar, video seçenekleri): kilitli kartın altına iki satıra taşabilen sarı "Watch the video to the end first." kutusu ekleniyordu; kilidi açılan kartta yoktu → aynı satırda kart yükseklikleri farklı. Soldaki tutamak ikonu videoyu daraltıyordu; hak noktaları ayrı satırdı.
- Yeni kart (`MediaVideoPopup layout="tile"`): 16:9 kapak · hak noktaları kapağın sağ alt köşesinde · altında **sabit tek satır** durum (kilitli: kilit + "Watch to the end", amber; izlendi: ✓ "Watched", yeşil; diğer: "Tap to watch") · açıklama tek satır (`line-clamp-1`).
- `DragItem tile`: video havuz kartı dikey, `h-full` (ızgara satırını eşit doldurur), tutamak ikonu ve sarı kutu yok; tam kilit cümlesi `aria-label`da kalır. `OptionButton` video kartı da `h-full`, sarı kutu yerine aynı tek satır.
- Kilit kuralları değişmedi (`useOptionLock`); yalnız gösterim. Sıralama satırı ve metin/görsel/ses kartları aynı.

## 24 — Video kartı kapağından da sürüklenir; dokunuş yine "izle" (2026-10-07)

- Önce: kapak düğmesi pointer/mouse/touch olaylarını durduruyordu → kart yalnız kapak dışından tutulabiliyordu (video kartında bu alan çok dar).
- Şimdi kapak da tutma yeri. Ayrım dnd-kit eşikleriyle: fare 6px hareket / dokunma 120ms basılı tut = sürükle; kısa dokunuş/tık = izle (modal).
- Yavaş dokunuş: dokunmada 120ms'yi geçen hareketsiz dokunuş sürükleme olarak başlar ve tıklama yutulur. `tapMediaTrigger(activatorEvent)` (PlaceBoard): hareketsiz biten sürükleme `data-media-trigger` kapağında başladıysa kapağı tıklar → video açılır (kart seçilmez). touchend içinde çalıştığı için iOS oynatma izni korunur. Aynısı `OrderingView` onDragEnd'de.
- Fareyle kapaktan sürükleyip kapağın üstünde bırakma: kapak pointerdown konumunu saklar; tıklama 6px'ten uzaksa oynatmaz. Programatik tıklama (`detail = 0`) bu kontrolden muaf.
- Kapak tıklaması yine `stopPropagation`: havuzda kartı seçmez, çoktan seçmelide işaretlemez. Kilitli kart (henüz izlenmedi) sürüklenemez; kapağa her türlü dokunuş izle'yi açar. Modal kökündeki olay durdurma aynı.

## 25 — Hakkı biten medya kartı her yerinden taşınır (2026-10-07)

- Sorun: izleme/dinleme hakkı bitince (veya başka medya çalarken) kapak/oynat düğmesi native `disabled` oluyordu. Tarayıcı devre dışı düğmeye fare olaylarını iletmez → dnd-kit (mousedown) başlamaz, kart kapağın üstünden tutulamıyordu. Ses kartının oynat düğmesi ayrıca her durumda pointer/mouse/touch durduruyordu.
- Video kapağı ve ses oynat düğmesi: `disabled` yerine `aria-disabled`; devre dışıyken tıklama işlenmez ve **karta geçer** (havuzda seç, çoktan seçmelide işaretle), imleç kartınkini alır. Etkinken tıklama durdurulur (izle/dinle). İkisi de `data-media-trigger`: basılı tut/sürükle = taşı, kısa ya da yavaş dokunuş = oynat (`tapMediaTrigger`, devre dışıysa normal kart dokunuşu).
- Ses seçeneğinde sarmalayıcıdaki tıklama durdurma kaldırıldı: açıklamaya dokunmak kartı seçer.
- Kilit kuralı aynı: henüz sonuna kadar izlenmemiş/dinlenmemiş kart taşınamaz (önce izle). Hak bitmişse kart zaten izlenmiş sayılır (`markHeard`) → serbest.

## 26 — Tüm soru türlerinde video denetimi (2026-10-07)

Taranan video noktaları: havuz kartı (gruplama, eşleştirme sağ, hotspot), yerleşmiş kart (grup/kutu/alan: `fill` ve `sm`), sürüklenen kopya, sıralama satırı, çoktan seçmeli kart, eşleştirme sol sütun, uyaran/kök blokları.

- **Hata (düzeltildi):** yerleşmiş video kartında (`VideoThumb`) ortada ▶ vardı; yerleşmiş karta dokunmak kartı havuza geri alır → çocuk "izle" diye dokununca kart kayboluyordu. ▶ kaldırıldı; köşede küçük "VIDEO" etiketi (tür belli, oynatma vaadi yok). Yeniden izlemek için kart havuza alınır (kapaktan izle).
- Uyaran/kökte art arda videolar: 2 sütun yerine havuzla aynı otomatik dolan eşit sütunlar (3 video "2 + 1" olmuyor). Görseller 2 sütun kaldı.
- Sorunsuz: sürüklenen kopya küçük kapak + etiket; eşleştirme sol video kartı (sürüklenmez, kapak izle); çoktan seçmeli kart (kapak izle, kart/açıklama seç; hak bitince kapak da seçer); sıralama (24–25 kuralları); havuz kartları (23–25).

## 27 — Öğrenci hata mesajları İngilizce ve sebebi söylüyor (2026-10-07)

- Sorun: yükleme (görsel/ses/video cevap) ve sınav akışı hatalarında backend'in ham `error` metni (çoğu Türkçe, teknik) "Upload failed: …" ile öğrenciye basılıyordu; ne olduğu ve ne yapılacağı anlaşılmıyordu. Ön yüz yalnız `NO_ATTEMPTS` / `SESSION_REPLACED` kodlarını tanıyordu.
- Yeni `src/features/exam-flow/studentErrors.ts` › `studentErrorMessage({ status, code, raw }, "upload" | "exam")`: sıra = bilinen kod → kesin HTTP durumu (401/413/415/429) → ham metindeki ipucu (TR + EN anahtar kelime: hak/deneme, boyut/büyük/MB, tür/format/uzantı, süre uzun, boş, oturum, kapalı/doldu) → HTTP durumu → genel. Çıktı A1–A2 İngilizce, "ne oldu + ne yap" (ör. "This file is too big. Please choose a smaller file.", "You have no tries left for this question.", "No internet connection. Check your internet and try again.").
- Ham metin öğrenciye gösterilmez; `console.warn("[student-error:…]", { status, code, raw })` ile öğretmen/geliştirici görür.
- Bağlantılar: `uploadApplicationMedia` (ağ hatası dahil), `ResponseViews` (önek kaldırıldı), `asExamError` (tüm sınav akışı çağrıları + cihaz kontrolü yüklemesi). Kod/durum alanları korunur (ExamFlowProvider yönlendirmeleri aynı).
- Backend'e öneri: hatalarda kararlı `code` (ör. FILE_TOO_LARGE, UNSUPPORTED_MEDIA_TYPE, ATTEMPT_LIMIT, SESSION_EXPIRED) dönsün; ipucu tahmini yerine kesin eşleme olur.

## 28 — İzin penceresi / dosya seçici tam ekrandan atınca sınav durmuyor (2026-10-07)

- Sorun: tarayıcı, mikrofon/kamera izin penceresi ve dosya seçici açılırken güvenlik gereği tam ekrandan çıkar (sayfa engelleyemez). Her çıkış `FULLSCREEN_EXIT` ihlali yazıyor, süreyi durduruyor ve "The test is paused" kapısını açıyordu — öğrencinin istenen işi (kayıt, yükleme) ihlal sayılıyordu.
- `fullscreen.ts`: beklenen çıkış penceresi (`EXPECTED_EXIT_MS` = 90 sn). `expectFullscreenExit()` öğrencinin dokunuşuyla başlayan işlemden önce; `settleExpectedExit()` işlem tam ekrandan çıkmadan bittiyse pencereyi kapatır; `withExpectedExit(work)` ikisini sarar.
- Bağlanan noktalar: dosya yükleme düğmesi (tıkta aç, `change`'de kapat), ses cevabı ve video cevabı `getUserMedia`, cihaz kontrolü `getUserMedia`.
- `ExamFlowProvider` yumuşak mod (`softExit`): pencere içindeki çıkışta ihlal yazılmaz, kapı açılmaz, süre/heartbeat sürer; üstte küçük şerit "Tap anywhere to go back to full screen" ve **öğrencinin sonraki dokunuşu/tuşu** (`click`/`keydown`, capture) tam ekranı geri açar. Pencere dolar ve hâlâ tam ekran dışındaysa eski kural: `FULLSCREEN_EXIT` yazılır, medya dondurulur, kapı açılır.
- Sınır: tarayıcı tam ekranı yalnız kullanıcı hareketiyle açar; izin/dosya penceresi kapandıktan sonra otomatik dönüş mümkün değil, bu yüzden "sonraki dokunuş". Pencere yalnız öğrencinin kendi başlattığı işlemle açılır; Esc ile normal çıkış eskisi gibi ihlal.
- İyileştirme önerisi: sınavda kayıt sorusu varsa izinleri cihaz kontrolünde (tam ekrandan önce) almak; Chrome izni oturum boyunca hatırlar, sınav içinde pencere hiç açılmaz.

## 29 — "Soru atlayabilir" öğrenciye söyleniyor; kaydetme hatası İngilizce (2026-10-07)

- Denetim: öğrenci sınav ekranında ayrı bir "boş bırak / clear answer" düğmesi hiçbir commit'te yoktu. Admin "Soru atlayabilir" (`navigation.allowSkip`) → öğrencide yalnız cevapsız Next ve ileri numaraya atlama açılıyordu; ekranda söylenmiyordu.
- Backend (OpenAPI): öğrenci cevabı için yalnız `PUT /applications/{id}/answers/{itemId}` (`answerJson` zorunlu, `mediaId`, `seq`). Cevap silme / "atlandı" işareti yok; `answeredItemIds` listesinden çıkarmanın yolu yok → **"Clear my answer" mevcut backend ile yapılamaz** (backend'e öneri: `DELETE /applications/{id}/answers/{itemId}` ya da boş `answerJson` = sil + answeredItemIds'ten çıkar, `allowSkip` kapalıysa red).
- Ön yüz (mevcut backend ile): `allowSkip` açık ve soru cevapsızken footer'da gri ipucu — "You can skip this question. Tap Next." / son soruda "You can leave this question blank." Kapalıyken eski "Answer this question to continue." aynı.
- `LiveExamSessionProvider`: cevap kaydedilemezse öğrenciye giden hata `studentErrorMessage` ile İngilizce (önce sabit "Cevap kaydedilemedi" ya da ham backend metni).

## 30 — "Clear my answer": mevcut backend ile cevabı boşaltma (2026-10-07)

29'daki "mevcut backend ile yapılamaz" tespiti düzeltildi: ayrı silme uç noktası olmadan, mevcut `PUT /applications/{id}/answers/{itemId}` ile kuruldu.

- Sözleşme (ön yüz): **boş cevap `{}` = boş bırakıldı.** Gerçek cevaplar her zaman en az bir alan taşır (`optionId`, `answers`, `order`, `pairs`…), karışma yok. `isClearedAnswer()` (`ExamSessionContext`).
- `LiveExamSessionProvider.clearAnswer(itemId)`: önce ekranı "cevapsız" yapar (`onCleared`), taslağa `{}` yazar, mevcut kuyrukla (`seq`) `{}` gönderir. Sunucu reddederse (ör. tür doğrulaması, medya cevabında mediaId zorunluluğu) önceki cevap taslağa geri yazılır, soru yeniden "cevaplı" olur ve İngilizce hata gösterilir. `getAnswer` boş cevabı döndürmez (soru boş açılır); `isCleared` sorgusu.
- Yenileme / başka sekme: hidrasyonda sunucudaki ya da taslaktaki `{}` → `onCleared` (cevaplı sayılmaz); taslak `{}` ama sunucuda eski cevap → `{}` yeniden kuyruğa.
- Sınav sayfası: `localCleared` (sunucunun `answeredItemIds` listesi temizlenen soruyu hâlâ içerir; ekranda override), `isAnswered` önce buna bakar; yeniden cevaplanınca (`markAnswered`) çıkar. Alt numara griye döner, "unanswered" sayacı ve "You can skip…" ipucu geri gelir.
- UI: yalnız `allowSkip` açık + soru cevaplı + medya/kayıt yokken soru kartının altında sağda "Clear my answer" (ghost, çöp ikonu). Onay `KidDialog`: "Clear your answer?" / "This question will be empty again. You can answer it later." / "Clear answer" · "Keep my answer". Başarıda soru bileşeni yeniden açılır (`clearRound` key) → seçim/sıra/yerleşimler boş.
- Bilinen sınırlar (backend davranışı doğrulanamadı): puanlama `{}` cevabını 0 sayar (boş ile aynı) — beklenen; sunucu tarafı "cevaplanan" istatistiği `{}`'yi cevap sayabilir; manuel değerlendirilen (yazma/konuşma) bir soru temizlenirse öğretmen kuyruğunda boş cevap görünebilir. Backend `{}`'yi reddederse özellik zararsızca hata verir (cevap korunur).

## 31 — 30 geri alındı: "Start again" yalnız ekranda sıfırlar (2026-10-07)

- Karar: cevabı sunucuda boşaltmaya gerek yok; soru yalnız ekranda ilk hâline dönsün. 30'daki `{}` kaydı, `clearAnswer` / `isCleared` / `isClearedAnswer`, `onCleared`, sayfadaki `localCleared` takibi ve `RestoreAnsweredMarks` değişikliği **tamamen kaldırıldı** (29'daki İngilizce kaydetme hatası korunuyor).
- Yeni: `discardDraft(itemId)` (`ExamSessionContext`, `LiveExamSessionProvider`) — yalnız bu tarayıcıdaki ekran taslağını (sessionStorage) siler; **sunucuya istek yok**.
- Sınav sayfası: soru cevaplıyken (medya/kayıt yokken) kartın altında sağda "Start again" (ghost, yenile ikonu); `allowSkip`'e bağlı değil. Onay: "Start this question again?" / "The question will look new again. Your last answer stays saved until you give a new one." Onayda partların taslağı silinir ve soru bileşeni yeniden açılır (`resetRound` key) → seçim/sıra/yerleşim/yazı boş.
- Davranış: kayıtlı cevap sunucuda kalır, soru "cevaplı" sayılmaya devam eder; öğrenci yeni cevap verince o kaydedilir. Sayfa yenilenirse sunucudaki son cevap yeniden görünür.

## 32 — Telefon / tablet duyarlılık denetimi (2026-10-07)

Kod üzerinden denetim (tarayıcı aracı yok): 320–390 telefon, 768 tablet dikey, 1024–1180 tablet yatay.

Düzeltilenler:
- **Metin + soru düzeni** (`QuestionView`): uyaranlı soruda iki sütun `@md` (28rem) → `@3xl` (48rem). Tablet dikeyde (~670px alan) metin ve soru ~320px'lik iki sütuna sıkışıyordu (havuz/kutular daralıyordu); artık alt alta. Tablet yatay (≥ ~784px alan) ve masaüstünde yan yana. Admin önizlemesine de yansır (aynı bileşen).
- **Dokunma hedefleri ≥ 44px**: alt çubuktaki soru numaraları 32 → 44px (`size-11`, yatay kaydırmalı liste); üst çubuktaki "Break" 32 → 44px (`h-11 min-w-11`).
- **Dil**: öğrenci kabuğundaki "Ana sayfa" → "Home" (panel tamamen İngilizce).

Kontrol edilip sorunsuz: `min-h-dvh` + `pb-safe` (iPhone ana çizgi), üst çubuk 48px + başlık `truncate`, telefonda süre etiketi/"Break" metni gizli (ikon), alt çubuk ikon düğmeleri 44px, lg+ kenar düğmeleri; girdiler ≥ 16px (yazma `text-base`, boşluk girdisi metinden miras `text-base`, giriş `text-base`) → iOS odak yakınlaştırması yok; ana sayfa ve sınav girişi bilgi kutuları dar ekranda dikey; Ordering ↑/↓ 44px; seçenek kartları `min-h-14`.

Cihazda doğrulanmalı: iOS'ta yazma sorusunda klavye açıkken yapışkan alt çubuğun metin alanını örtmemesi; tablet yatayda kenar düğmelerinin içerikle çakışmaması; 320px'te çok uzun bölüm adlarının üst çubukta kısalması.

## 33 — Commit öncesi inceleme (2026-10-07)

Tüm commit edilmemiş değişiklikler (25 dosya) gözden geçirildi.

Düzeltilen hatalar:
- **Yumuşak tam ekran zamanlayıcısı uzamıyordu** (`ExamFlowProvider`): yumuşak moddayken yeni bir izin/dosya işlemi pencereyi uzatırsa zamanlayıcı ilk süreye göre kalıyordu → kapı erken açılabilirdi. Süre dolunca pencere hâlâ geçerliyse yeniden kurulur.
- **Dosya seçici iptalinde pencere 90 sn açık kalıyordu** (`ResponseViews`): seçici tam ekrandan çıkarmadan kapanırsa (iptal / Safari) sayfa odağı dönünce `settleExpectedExit` → pencere kapanır, gerçek Esc çıkışı yine ihlal.
- **Hata çevirici yanlış sebep üretiyordu** (`studentErrors`): anahtar kelimeler kelime içinde eşleşiyordu ("mul**tip**art" → dosya türü; "**hak**kında" → hak bitti). Artık kelime başında ve belirgin ifadelerle; 11 örnek mesajla doğrulandı (boyut, tür, hak, oturum, kapalı, ağ, 413, 500, SESSION_REPLACED, ilgisiz metin → genel).

Doğrulandı: tip kontrolü temiz; değişen dosyalarda lint 0; **üretim derlemesi başarılı** (42 sayfa). Derleme için eksik `jspdf` / `jspdf-autotable` `--no-save` ile yalnız `node_modules`'a kuruldu (package.json / lock değişmedi; ekipte `npm install` gerekli).

## 34 — Ana sayfa tablet/laptop'ta ilk ekran kesiksiz (2026-10-07)

- **Neden:** `/student` ilk açılışta tablet ve laptopta kartlar ekranın altında kesiliyordu. Hedef: ilk ekranda her şey tam görünsün, fazladan sınav varsa sayfa normal kaysın.
- İlk denemede sabit yükseklik + sütun içi kaydırma vardı. Geri alındı (kabuk değişmedi), yerine içerik sıkılaştırıldı:
  - Karşılama kartı tek satır: metin solda, "Continue" düğmesi sağda; süs bulutları kaldırıldı.
  - Sınav kartı: iki büyük bilgi kutusu ve ayrı "Tries left" satırı yerine tek satır bilgi çipleri (`Fact`: Time · Parts · Questions · Tries left), düğme normal boyda.
  - "Before the test" ipuçları kaldırıldı. Bölüm başlıkları `text-lg`, boşluklar 5.
  - Izgara md'den itibaren iki sütun (sol 1fr, sağda sonuçlar 17–20rem). Kartlar: sm 2, md 1, lg 2 sütun.

## 35 — Tam ekran: izin / dosya / klavye sonrası geri dönüş (2026-10-07)

- **Sorun:** Tablette mikrofon/kamera izni verildikten (ve görsel yükledikten) sonra sınav tam ekrana dönmüyor, bazen kapı ekranı açılıyordu.
- **Kök nedenler ve düzeltmeler:**
  1. **Geç gelen çıkış olayı:** Android Chrome / iPadOS `fullscreenchange`'i izin penceresi kapanırken, `getUserMedia` çözüldükten *sonra* gönderebiliyor. Beklenen çıkış penceresi hemen kapandığı için bu çıkış ihlal sayılıyordu (kapı). Pencere artık 1,5 sn gecikmeyle kapanıyor (`settleExpectedExitSoon`; `withExpectedExit`, dosya seçici `onChange`/`focus`).
  2. **Dokunuş algılanmıyordu:** geri dönüş yalnız `click`/`keydown` dinliyordu. Dokunmatikte sürükle-bırak ve kaydırma `click`i yutuyor. Artık tarayıcının kullanıcı hareketi saydığı `pointerup`, `touchend`, `click`, `keydown` dinleniyor (capture). Çift istek `enterPromiseRef` ile engelleniyor.
  3. **Konuşma kaydı 90 sn'yi aşınca kapı açılıyordu:** öğrenci kayıt sırasında dokunmadığı için pencere doluyordu. Medya/kayıt sürerken (`isMediaActive`, playerGuard) ya da iOS'ta yazı alanı odaktayken pencere uzatılıyor.
  4. **iPad/iPhone ekran klavyesi:** Safari klavye açılınca tam ekrandan çıkıyor. Yazı alanına odak artık beklenen çıkış (`isAppleTouchDevice`); yazarken tuş vuruşları tam ekranı zorlamıyor, alan dışına dokununca geri dönüyor.
- Gerçek cihazda doğrulanmadı (Android tablet + iPad'de: ilk izin, dosya seçici iptali/seçimi, Writing yazımı denenmeli).

### 35 eki — derin analiz (2026-10-07)

- **Yeni bulunan:** Android'de dosya seçici / kamera ayrı ekran açar → `visibilitychange` (gizli) → `VISIBILITY_HIDDEN` odak kaybı ihlali yazılıyordu ("You left the test screen", hak düşüyordu). Beklenen çıkış penceresi içindeki gizlenme ve eşleşen görünür olayı artık gönderilmiyor; süre yine duruyor.
- **Çözülemeyen / platform sınırı:** iPhone Safari öğe tam ekranını desteklemez (kapı "desteklenmiyor" der); iPad'de tam ekran sırasında Safari'nin kendi uyarı/çıkış davranışları sürüme göre değişir; tam ekrana dönüş her zaman bir dokunuş ister (tarayıcı kuralı).
- **Bilinçli ödün:** iOS'ta yazı alanı odaktayken ve medya/kayıt sürerken beklenen çıkış penceresi dolmaz; bu sırada gerçek bir çıkış da ihlal sayılmaz.
