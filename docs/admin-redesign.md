# Admin paneli yeniden tasarımı

> Super Admin (`/admin/**`) tasarım ve UX revizyonunun adım adım kaydı. Yeni değişiklikte bu dosyanın sonuna yeni bir “## NN — …” bölümü eklenir.

## İçindekiler

- [01 — Admin teması ve konteyner sistemi](#adim-01)
- [02 — İç sayfalar ve ortak bileşenler](#adim-02)
- [03 — Hata / yükleme / boş durumlar, tablolar ve UX düzeltmeleri](#adim-03)
- [04 — Tablo hizalama ve liste araç çubukları](#adim-04)
- [05 — Tam genişlik layout, sabit yan boşluk](#adim-05)
- [06 — Soru editörü ve form düzeni](#adim-06)
- [07 — Soru editörü iç bileşenleri ve İçerik sekmesi](#adim-07)
- [08 — Sınavlar: liste, yeni sınav sihirbazı, sınav kurucu](#adim-08)
- [09 — Sayısal alanlar, birimler ve sıralama ikonları](#adim-09)
- [10 — İçerik kütüphanesi sayfaları: İnceleme, Medya, Rubrikler, Formatlar, Ayarlar](#adim-10)
- [11 — Özet, Kurumlar ve Lisanslar (ikinci geçiş)](#adim-11)
- [12 — Tarih ve tarih-saat alanları](#adim-12)
- [13 — Açılır paneller: kırpılma ve katman sorunu (Select, takvim)](#adim-13)
- [14 — Genel review (commit öncesi)](#adim-14)
- [15 — Staff paneline entegrasyon](#adim-15)
- [16 — Staff paneli ikinci review](#adim-16)
- [17 — Tablo kartı bütünlüğü ve boş durum tasarımı](#adim-17)
- [18 — Sihirbazlar: tam genişlik + canlı özet](#adim-18)

---

<a id="adim-01"></a>

## 01 — Admin teması ve konteyner sistemi

**Tarih:** 2026-10-05 · **Kapsam:** yalnız `/admin/**` (Super Admin) · **Dal:** `dev`

### Neden

- Panel paleti bir e-ticaret sitesinden (dissepetim, turuncu `#EB5C05`) alınmıştı; sınav platformu kimliği yoktu. Nötr griler kahverengimsiydi.
- İçerik tam genişlikte akıyor, sabit `px-4 / px-6 / px-8` kullanıyordu. Geniş ekranda (1920px+) tablolar ve kartlar aşırı uzuyor, header ile içerik farklı hizalarda başlıyordu.

### Ne değişti

| Dosya | Değişiklik |
|---|---|
| `src/styles/admin-theme.css` (yeni) | Admin'e özel palet, semantik tokenlar, sidebar tokenları, vurgu tonları, konteyner değişkenleri ve `panel-container` / `panel-container-narrow` utility'leri |
| `app/globals.css` | `admin-theme.css` import edildi |
| `src/features/shell/PanelChrome.tsx` | `data-panel="admin"`; mürekkep sidebar; optik-form marka işareti; sayfa bazlı ikonlar; aktif nav "işaretli baloncuk"; nav açıklaması `title` ile; header ve main aynı `panel-container` içinde |
| `app/admin/page.tsx` | Stat kartları renk-kodlu (üst şerit + ikon kutusu + serif rakam) |

### Renk sistemi — "sınav kâğıdı + mürekkep"

Tailwind v4 utility'leri `var(--color-*)` okur. Ölçekler `[data-panel="admin"]` kapsamında yeniden tanımlandığı için `src/ui` bileşenleri **kod değişmeden** yeni paleti alır. Staff / öğrenci / landing etkilenmez.

| Ölçek | Anlam | Ana ton |
|---|---|---|
| `primary` | Mürekkep mavisi — CTA, link, odak, aktif | `600 #3a45de` |
| `neutral` | Soğuk kâğıt grisi — yüzey, çizgi, metin | `950 #0e1320` |
| `secondary` | Fosforlu kalem — vurgu, işaretleme | `300 #ffd546` |
| `--accent-teal / marker / plum / red` | Kategori / metrik ayrımı (+ `-bg` çifti) | — |

Semantik tokenlar: `--bg #f3f5f9`, `--surface #fff`, `--primary` = primary-600, `--focus` = primary-500. Sidebar: `--sidebar-bg #111832 → #0b1126`.

**Kural:** yeni admin ekranında ham hex yazılmaz; `bg-primary-*`, `text-fg-muted`, `bg-(--accent-teal-bg)` gibi tokenlar kullanılır.

### Konteyner sistemi

```css
--gutter: clamp(1rem, 0.4rem + 2.2vw, 2.75rem); /* ekranla akışkan */
--container-wide: 1560px;   /* liste, tablo, dashboard (varsayılan) */
--container-narrow: 960px;  /* form, ayar sayfası */
```

- `main#main` ve header iç satırı `panel-container` kullanır → breadcrumb ile sayfa başlığı aynı çizgiden başlar.
- İçerik 1560px'i aşınca kalan boşluk iki yana eşit dağılır; altında gutter ekranla büyür (mobil 16px → geniş 44px).
- **Geçersiz (bkz. 05):** max-width ve ortalama kaldırıldı; sabit yan boşluk kullanılıyor.

### Tipografi

- `PageHeader` başlığı admin'de Fraunces (serif, `font-display`), akışkan boyut `1.5 → 1.875rem`.
- Sidebar marka adı ve stat rakamları da `font-display`.

### Sonraki adımlar

- [ ] Liste sayfaları (Kurumlar, Lisanslar) — tablo başlığı, satır yoğunluğu, durum rozetleri
- [ ] Kurum detay çerçevesi (`CompanyDetailFrame`) sekmeleri
- [ ] İçerik yazarlığı (`AuthoringFrame`) — soru bankası, sınav kurucu
- [ ] Form sayfalarında dar konteyner

---

<a id="adim-02"></a>

## 02 — İç sayfalar ve ortak bileşenler

**Tarih:** 2026-10-05 · **Kapsam:** `/admin/**` iç sayfaları + `src/ui` ortak bileşenleri · **Önceki adım:** [01](#adim-01)

### Yaklaşım

Admin'de ~30 sayfa var; çoğu aynı bileşenleri (DataGrid, DetailShell, FormCard, Badge…) kullanıyor. Bu yüzden önce **ortak bileşenler** güncellendi (tüm iç sayfalara yayılır), sonra **sayfa düzeyinde** içerik hiyerarşisi iyileştirildi.

> `src/ui` staff paneliyle de paylaşılır. Değişiklikler yalnız token kullanır (`primary`, `neutral`, `fg-*`); staff kendi tokenlarıyla kendi renginde görünür. Admin'e özel renkler `[data-panel="admin"]` kapsamında kalır.

### Ortak bileşenler

| Bileşen | Değişiklik |
|---|---|
| `Badge` | İnce iç halka (`ring-current/15`), `brand` tonu `primary-50`; nötr rozet tek tanım. Tüm durum rozetleri daha net |
| `Tabs` | Sabit `slate-*` renkleri kaldırıldı → token (`neutral-100`, `surface`, `fg-muted`) |
| `DetailShell` | Bölüm başlığının önünde `primary` dikey işaret; alt sekme şeridi `neutral-50` |
| `DetailGroupTabs` | Seçili grup sekmesi `primary` renk + kalın |
| `EntityHeader` | Avatar mürekkep gradyanı (beyaz harf); başlık serif `font-display` 22px |
| `FormCard` | Başlık şeridi hafif `neutral-50` zemin — form bölümleri ayrışır |
| `DataGrid` | Başlık satırı `neutral-50`, 11.5px aralıklı etiket; satır hover'ı `primary-50/40` |
| `FilterTabs` (yeni) | Liste kartı üst şeridi için alt çizgili durum filtresi, opsiyonel sayı rozeti. `@/src/ui`'dan export |

### Sayfalar

| Sayfa | Değişiklik |
|---|---|
| **Özet** `/admin` | Sağda **Hızlı işlemler** paneli (yeni kurum, soru bankası, sınav kur, inceleme kuyruğu, lisans ver); geniş ekranda `1fr + 22rem` ızgara |
| **Kurumlar** `/admin/companies` | `FilterTabs` ile durum filtresi; kurum satırında baş harf avatarı + mono kod; arama `type=search` |
| **Lisanslar** `/admin/exams` | Başlık menüyle uyumlu ("Lisanslar") ve açıklayıcı; sınav satırında teal ikon kutusu + mono kod |
| **Kurum genel bakış** `/admin/companies/[id]` | "Kimlik" başlığı + sağda Düzenle; altında 6 renk-kodlu **Hızlı erişim** kartı (Öğrenciler, Personel, Lisanslı sınavlar, Atamalar, Üyelik, Kampüsler) |
| **İçerik çerçevesi** `/admin/content/**` | Kiracı bilgisi kutu yerine kompakt hap (`İçerik kiracısı · ad · kod · HQ`); hata hâli `role=alert` uyarı rengi |
| **Soru bankası** | "Yükleniyor…" metni yerine tablo iskeleti; satıra tıklayınca editör; CEFR seviyesi mor rozet |

Kurum alt sayfaları (üyelik, kampüs, personel, öğrenci, atama, rapor…) `DetailShell` + `DataGrid` + `FormCard` üzerinden yeni görünümü otomatik alır.

### Doğrulama

- `tsc --noEmit`: temiz.
- `eslint`: değişen satırlarda hata yok. Önceden var olan 6 React Compiler kuralı ihlali duruyor (`DataGrid` ref-in-render, `Toaster` ve `QuestionBankPage` effect içinde setState) — bu adımın kapsamı dışında, ayrı ele alınmalı.
- Tarayıcıda görsel kontrol yapılmadı.

### Sonraki adımlar

- [ ] Sınav kurucu (`ExamPages`, 1300 satır) ve soru editörü (`QuestionEditor`) — iki panelli düzen, yapışkan kenar çubuğu
- [ ] Medya kütüphanesi kart ızgarası, inceleme kuyruğu satırları
- [ ] Yeni kurum formunu dar konteynere al
- [ ] Önceden var olan eslint hatalarının giderilmesi

---

<a id="adim-03"></a>

## 03 — Hata / yükleme / boş durumlar, tablolar ve UX düzeltmeleri

**Tarih:** 2026-10-05 · **Kapsam:** `/admin/**` (ortak bileşenler staff ile paylaşılır) · **Önceki:** [02](#adim-02)

### İnceleme bulguları

| # | Sorun | Etki |
|---|---|---|
| 1 | Kurum alt sayfalarının 11'inde yükleme = 96px gri kutu | Veri gelince sayfa zıplıyor; kullanıcı neyin yüklendiğini bilmiyor |
| 2 | Hata = kalın kırmızı çerçeve + ham mesaj ("Forbidden"), tekrar dene yok | Kullanıcı ne yapacağını bilmiyor, sayfayı yenilemek zorunda |
| 3 | Kampüs **Sil** onaysız, anında | Yanlış tıklamayla veri kaybı |
| 4 | Canlı izleme ham `<table>`: durum kodları çevrilmemiş (`IN_PROGRESS`), yükleme yok, "Atamayı kapat" onaysız, geri bildirim düz metin | Kritik sınav anında hatalı işlem riski |
| 5 | Bölümlerde yalnız sağa itilmiş "Ekle" butonu, kayıt sayısı yok | Bağlam eksik, boş alan |
| 6 | Lisanslar tablosunda işlem sütunu sola yaslı, sıralanabilir | Göz akışı bozuk |
| 7 | Geçici parola düz metin, kopyalama yok, kapatılamıyor | Hatalı iletim, ekranda kalan gizli bilgi |

### Çözümler

#### Ortak bileşenler (`src/ui`)

- **`ErrorState`** — baştan yazıldı. Tonlu ikon, anlaşılır başlık ve "ne yapmalı" açıklaması. Yeni prop'lar: `error` (HTTP durumundan başlık türetir: 401/403/404/409/500/502/503), `onRetry` (**Tekrar dene** butonu), `compact`. Teknik mesaj soluk mono satırda. `message` artık opsiyonel; eski kullanımlar çalışır.
- **`SectionTable`** — `loading` prop: başlıklar gerçek, gövde 4 satır iskelet (sağa yaslı sütunda buton iskeleti). `emptyAction` prop. Başlık satırı DataGrid ile aynı dil (`neutral-50`, 11.5px). `flush` iken ince halka.
- **`SectionToolbar`** (yeni) — solda "**12** kampüs" sayısı, sağda eylemler.
- **`SecretNotice`** (yeni) — tek seferlik gizli değer: vurgu şeridi + mono değer + Kopyala + Kapat + güvenlik notu.

#### Bölümler (`src/features/org`, `src/features/assignments`)

Kampüs, Sezon, Seviye, Sınıf, Personel, Öğrenci, Üyelik, Roller, Raporlar, Atamalar, Lisanslı sınavlar:
- Gri kutu → `SectionTable loading` (gerçek sütun başlıklarıyla).
- Hata → `ErrorState error onRetry={refetch} compact`.
- Tek buton → `SectionToolbar` (sayı + buton).

Özel:
- **Kampüs silme** → `ConfirmDialog` (ad + sonuç açıklaması), buton `danger` tonu.
- **Personel** geçici parola → `SecretNotice`.
- **Canlı izleme** (`MonitorSection`) baştan: `useMonitor` + `refetchInterval` (react-query, effect içi setState kaldırıldı); özet sayaçlar (Toplam / Sınavda / Tamamlayan / Diğer); "Canlı · saat" göstergesi; Türkçe durum rozetleri; "3 dk önce" biçiminde son görülme; **Atamayı kapat** ve **Kalanları bitir** onaylı, sonuç `notify` ile.

#### Sayfalar

- **Lisanslar**: işlem sütunu sağa yaslı ve sıralanamaz; "Amaç" etiket görünümünde; hata `ErrorState error`.
- **Kurumlar / Özet / Kurum detayı**: hata durumları yeni `ErrorState` ile (HTTP'ye göre mesaj).

### Kurallar (yeni ekranlar için)

1. Yükleme: tablo ise `SectionTable loading` / `DataGrid loading`; asla düz gri kutu ya da "Yükleniyor…" metni.
2. Hata: `<ErrorState error={error} onRetry={() => void refetch()} />`.
3. Geri alınamayan her işlem `ConfirmDialog` ister; açıklama "ne olacak, kimi etkiler, geri alınır mı" der.
4. İşlem sütunu: başlığı boş, sağa yaslı, sıralanamaz.
5. Gizli/tek seferlik değer: `SecretNotice`.

### Doğrulama

- `tsc --noEmit` temiz; değişen dosyalarda eslint hatası yok (BranchesSection'da önceden var olan 2 `exhaustive-deps` uyarısı duruyor).
- Tarayıcıda görsel kontrol yapılmadı. Canlı izleme durum kodları (`STATUS` haritası) backend'in gerçek değerleriyle doğrulanmalı; bilinmeyen kod ham hâliyle gösterilir.

### Sonraki adımlar

- [ ] Sınav kurucu ve soru editörü (büyük ekranlar)
- [ ] Değerlendirme (`GradingSection`) ve atama sihirbazı (`AssignWizard`) UX
- [ ] Diğer onaysız yıkıcı işlemlerin taranması (içerik yazarlığı tarafı)

---

<a id="adim-04"></a>

## 04 — Tablo hizalama ve liste araç çubukları

**Tarih:** 2026-10-05 · **Önceki:** [03](#adim-03) · **Tetikleyen:** Soru Bankası ekran görüntüsü

### Sorunlar

- Durum filtresi (`Select`) tüm satırı kaplıyor, "Tip seçerek başla" butonu alt satıra düşüyordu.
- DataGrid başlıklarında sütun genişletme tutamakları her zaman görünür koyu çizgilerdi — başlık satırı "bölmeli" görünüyordu.
- Tip / beceri hücreleri ham enum (`MULTIPLE CHOICE`, `READING`).
- Kısa sütunlar (Seviye, Sürüm) sola yaslı; etiketler alt alta uzuyordu.
- Sınavlar listesinde "Yükleniyor…" metni, satır tıklanamıyordu.

### Değişiklikler

| Dosya | Değişiklik |
|---|---|
| `src/ui/composites/DataGrid.tsx` | Genişletme tutamağı yalnız başlık üzerine gelince, 1px; tutamak üstünde `primary` |
| `QuestionBankPage.tsx` | Select → `FilterTabs` (Tümü/Taslak/İncelemede/Onaylı/Emekli); "Tip seçerek başla" başlık eylemlerine (ikincil), "Yeni soru" → "Hızlı soru"; tip `TEMPLATE_REGISTRY` Türkçe etiketi; beceri `SKILL_LABEL`; etiketler çip (en fazla 3 + "+n"); Seviye ortalı, Sürüm sağa yaslı mono; Kod mono |
| `QuestionEditor.tsx` | `SKILL_LABEL` export edildi |
| `ExamPages.tsx` (liste) | Başlık + mono kod alt satır; Amaç çip; Seviye ortalı mor mono; DataGrid iskelet yükleme, satır tıklanabilir, hata `onRetry` |

### Hizalama kuralı

- Metin: sola. Kısa kod/seviye: ortaya. Sayı, sürüm, işlem: sağa (`align` + `headerAlign`).
- Enum hiçbir zaman ham gösterilmez; Türkçe etiket haritasından gelir.
- Liste filtresi `FilterTabs`; birincil/ikincil oluşturma eylemleri `PageHeader actions`'ta.

---

<a id="adim-05"></a>

## 05 — Tam genişlik layout, sabit yan boşluk

**Tarih:** 2026-10-05 · **Önceki:** [04](#adim-04) · **Bu adım [01](#adim-01)'deki konteyner kararını değiştirir.**

### Sorun

01'de içerik `max-width: 1560px` + `margin-inline: auto` ile sınırlanmış, yan boşluk ekranla akışkan büyüyordu. Büyük ekranlarda (1920px+) içerik ortada sıkışıyor, iki yanda boş alan kalıyordu. İki sihirbaz sayfası da kendi içinde `mx-auto max-w-*` ile ayrıca ortalanıyordu.

### Karar

- **Max-width yok, ortalama yok.** İçerik sidebar'ın sağındaki tüm alanı kullanır.
- **Sabit yan boşluk** (`--gutter`): mobil `16px`, `sm` (≥640px) `24px`, `lg` (≥1024px) `32px`.
- Header ve `main` aynı `panel-container` → breadcrumb ve sayfa başlığı aynı çizgiden başlar.

### Değişiklikler

| Dosya | Değişiklik |
|---|---|
| `src/styles/admin-theme.css` | `--gutter` sabit + breakpoint medya sorguları; `panel-container` yalnız `width:100%` + `padding-inline`; `--container-wide` ve `panel-container-narrow` kaldırıldı |
| `src/features/assignments/AssignWizard.tsx` | `mx-auto` kaldırıldı → sola yaslı `max-w-3xl` |
| `src/features/authoring/exams/ExamPages.tsx` (yeni sınav sihirbazı) | `mx-auto max-w-2xl` → sola yaslı `max-w-3xl` |

### Kural

Sayfa içinde `mx-auto` ile ortalama yapılmaz. Form okunabilirlik için dar olmalıysa sola yaslı `max-w-3xl` kullanılır; tablolar ve listeler tam genişliktir.

---

<a id="adim-06"></a>

## 06 — Soru editörü ve form düzeni

**Tarih:** 2026-10-05 · **Sayfa:** `/admin/content/questions/[id]` · **Önceki:** [05](#adim-05)

### Bulgular

| Alan | Sorun |
|---|---|
| Etiketler | `Field` etiketi + MultiPicker kendi etiketi → çift başlık; `Field` context'i iç arama kutusuna geçip dış etiketi yanlış alana bağlıyordu; Öğrenme çıktılarında bile "Etiket listesini aç" yazıyordu; gri kutu içinde gri kutu |
| Sınıflandırma | 6 sütunluk ızgarada 7 alan → son alan tek başına alt satırda; uzun etiketler (Tahmini süre (sn)) hizayı kaydırıyordu; `items-end` ile alanlar dalgalı |
| Kaydet butonları | Her panelde içeriğin ortasında, sola yaslı yüzüyordu |
| Ham kodlar | `HIGH_STAKES`, `ALL_OR_NOTHING`, `Part 1: MULTIPLE_CHOICE`, açıklamada enum |
| Adım gezinmesi | Soluk hap butonlar; aktif adım dışında kontrast yok |
| Önizleme | Formun altında — görmek için uzun kaydırma |
| Tehlikeli işlemler | Part sil, Arşivle onaysız |
| İnceleme paneli | 7 buton tek satırda karışık; geçmiş `·` ile birleşik tek paragraf |
| Yükleme/hata | Düz "Yükleniyor…" / kırmızı metin |

### Değişiklikler

**`QuestionEditor.tsx`**
- **Adım çubuğu:** numaralı daire + etiket, aktif adım `primary-50` + halka, `aria-current="step"`, dar ekranda yatay kaydırma.
- **İki sütun (≥1536px):** solda form, sağda **yapışkan öğrenci önizlemesi** (kendi içinde kaydırılır). Altında tek sütun.
- **Tip seçimi:** 3 sütun kart; seçili kartta ✓ rozeti; "Otomatik puan / Elle değerlendirme" ve "Rubrik" bilgi çipleri.
- **Sınıflandırma:** `FormGroup` alt başlıklarıyla 3 grup — *Seviye ve beceri* (4 sütun), *Süre ve güvenlik* (3 sütun, açıklamalı, placeholder'lı), *Etiketler* (tam genişlik). Güvenlik düzeyi Türkçe.
- **Kaydet butonları** `FormCard footer`'ına (sağa yaslı, `loading`).
- **Part şeridi:** sekme rolü, "1 Çoktan seçmeli" etiketleri, ayırıcı; ←/→ `aria-label`; **Part sil** onaylı + `danger`.
- **Cevap/puan:** 4 sütun hizalı; skorlama modları Türkçe; Öğrenme çıktıları `FormGroup`.
- **İnceleme:** butonlar *İş akışı* / *Kopya-sürüm* satırlarına ayrıldı, **Arşivle** sağda + onaylı; eksikler sayı rozetli ve tıklanabilir kırmızı kartlar, "eksik yok" yeşil; geçmiş zaman çizelgesi; düşman soru alanı açıklamalı, boşken Ekle pasif.
- Yükleme iskeleti, hata `ErrorState`, kiracı yok → `EmptyState`.
- Yeni yerel yardımcı: `FormGroup` (fieldset + legend + ipucu).

**`src/ui/composites/MultiPicker.tsx`** (paylaşılan)
- Katalog düğmesi metni `label`'dan: "Etiket listesinden seç", "Öğrenme çıktısı listesinden seç".
- Dış kutu `surface`; katalog alanı hafif `neutral-50` iç halka; çipler hap şeklinde, seçiliyken ✓.

### Kurallar

- Form alanları anlamlı gruplara (`FormGroup`) bölünür; tek ızgaraya sığdırılmaya çalışılmaz. Sütun sayısı alan sayısını böler.
- `MultiPicker` `Field` içine sarılmaz (kendi etiketi/araması var); başlık `FormGroup` ile verilir.
- Kaydet / gönder eylemi `FormCard footer`'ında.
- Enum değerleri her zaman Türkçe etiket haritasıyla gösterilir.
- Geri alınamayan işlem onay ister.

### Doğrulama

- `tsc` temiz. Eslint: yeni hata yok; dosyada önceden olan effect/deps uyarıları duruyor.
- Tarayıcıda görsel kontrol yapılmadı. Native `confirm()` mevcut kalıpla tutarlı kullanıldı (tip değiştirme zaten öyleydi); ileride `ConfirmDialog`'a taşınabilir.

---

<a id="adim-07"></a>

## 07 — Soru editörü iç bileşenleri ve İçerik sekmesi

**Tarih:** 2026-10-05 · **Sayfa:** `/admin/content/questions/[id]` sekmeler 3–5 · **Önceki:** [06](#adim-06)

### Bulgular (işlevsel + UX)

| Bileşen | Sorun |
|---|---|
| `ContentBlockList` | Galeriye eklenen görsel **silinemiyordu**, galeri altyazısı **düzenlenemiyordu**; butonlar ham `+ TEXT / + GALLERY`; blok başlığında iç id (`blk_x7f…`); silme onaysız; sütun sayısı Select tam genişlik |
| `MediaPicker` | Dosya yükleme gizli `Input` bileşeniyle (sarmalayıcı yüzünden güvenilmez); modal Escape/dışa tıklama ile kapanmıyordu; görsel seçicide bile tür filtresi açık; yükleme sırasında boş ekran; ses/video oynatıcı seçim **butonunun içinde** (geçersiz HTML, oynat = seç) |
| `OptionListEditor` | "Doğru cevap" onay kutusu metnin altında, kaçırılıyor; ↑↓Sil dikey sütun; harf (A/B/C) yok; boş liste mesajsız; doğru cevap işaretlenmemişse uyarı yok |
| `PlaybackPolicyFields` | Onay kutuları etiketli alanla aynı ızgarada → hizasız; "Seek serbest" |
| `Block/InlineHtmlField` | Etiket `<p>` — alana bağlı değil |
| Tip formları | Hotspot bölgelerinde 6 **etiketsiz** kutu (id, ad, x, y, w, h), bölge silme yok; `Soft/Hard`, `Spellcheck`, `True/False/Not given`, `NOT_GIVEN`, `Max MB`, `RECT ekle`; checkbox'lar ızgarada kayık |
| "Seçenekleri karıştır" | Tek satır, açıklamasız — ne yaptığı, ne zaman kapatılacağı belli değil |
| İçerik sekmesi | "Stem" başlığı + form alt alta; ne yazılacağı, Uyaran'dan farkı açıklanmıyor |

### Çözümler

- **İçerik sekmesi:** Üstte bilgi şeridi (bu part'a özel soru; ortak metin/ses → *3. Uyaran*'a tıklanabilir bağlantı). İki numaralı bölüm: **1. Soru kökü** (örnekli açıklama) ve **2. {Tip} ayarları** (şablon ipucu + "doğru cevabı burada işaretleyebilirsiniz").
- **`SettingToggle`** (InteractionForms içi): kart + başlık + **açıklama** + Açık/Kapalı rozeti; açıkken vurgulu. 13 ayar anahtarına uygulandı. Açıklamalar `SETTING_HELP` haritasında — ör. *Seçenekleri karıştır*: "Her öğrenci farklı sırada görür; kopya riskini azaltır; cevap anahtarı etkilenmez; 'Hepsi/Hiçbiri' gibi sıraya bağlı seçenek varsa kapatın."
- **`OptionListEditor`:** satır = harf rozeti + doğru cevap düğmesi (tekli: daire / çoklu: kare, `role=radio|checkbox`) + içerik + yatay ↑ ↓ ✕ (aria-label'lı). Doğru seçenek yeşil zemin. Başlıkta sayı, altında yönlendirme; doğru cevap yoksa uyarı rengi. Boş durum metni. Alt kısımda kesikli "+ Seçenek ekle". Format seçici "Seçenek türü".
- **`ContentBlockList`:** Türkçe blok meta (ikon + ad + ipucu); başlık "1. Metin" (iç id gizli); boşsa açıklama; içeriği olan blok silinirken onay; galeri: sütun sayısı dar alan, görsel kartları 2 sütun, **görsel silme + altyazı**; alta 5 kesikli ekleme düğmesi.
- **`MediaPicker`:** boşken kesikli "＋ Görsel seç veya yükle" kartı; seçiliyken önizleme + Değiştir / Kaldır. Modal: başlık, Escape ve dışa tıklamayla kapanır, sayfa kaydırması kilitli, `role=dialog`; tür sabitse "Yalnız görsel" rozeti; native gizli `input[type=file]` ile birincil "↑ Dosya yükle"; iskelet yükleme; kartlarda önizleme ayrı, **Seç** düğmesi ayrı; işlenmekte olan medya seçilemez. Yeni prop `hideLabel`.
- **`PlaybackPolicyFields`:** "Dinleme / izleme hakkı (boş = sınırsız)" + yan tarafta anahtarlar; hafif zemin.
- **HTML alanları:** etiket verildiğinde `Field` ile bağlı; `placeholder` / `hint` desteği.
- **Tip formları:** tüm etiketler Türkçe ve birimli; karışık ızgaralar `items-end`; hotspot bölgeleri etiketli (Bölge adı, Sol (x), Üst (y), Genişlik, Yükseklik) + silme + açıklama.

### Doğrulama

- `tsc` temiz. Yeni eslint hatası yok; MediaPicker (2) ve QuestionEditor (3) effect hataları orijinal kodda da mevcut.
- Tarayıcıda görsel kontrol yapılmadı. Native `confirm()` mevcut editör kalıbıyla tutarlı.

### Ek — Öğrenme çıktıları seçicisi (Cevap ve puanlama sekmesi)

**Sorun:** Seçenekler `KOD — açıklama` tek metin olarak birleşikti; seçili çipe bu uzun metin aynen giriyordu. Boş durum ve arama metinleri geneldi.

**Çözüm:**
- `MultiPicker` yeni prop **`codeLabels`**: listede gri mono **kod rozeti** + yanında okunur açıklama (dar ekranda alt alta); seçili çipte yalnız kod (mono), açıklama üzerine gelince ipucunda.
- Kazanımlar `label: code`, `description: açıklama` olarak ayrı veriliyor.
- Başlık "Öğrenme çıktıları (kazanımlar)"; açıklama: karne ve kazanım raporlarının bu eşleşmeyle hesaplandığı, genelde 1–3 kazanımın yeterli olduğu.
- Boş durum: "Henüz kazanım seçilmedi. Aşağıdaki listeden işaretleyin."; arama: "Kazanım kodu veya açıklama ara"; sonuçsuz: "Aramayla eşleşen kazanım yok."

---

<a id="adim-08"></a>

## 08 — Sınavlar: liste, yeni sınav sihirbazı, sınav kurucu

**Tarih:** 2026-10-05 · **Sayfalar:** `/admin/content/exams`, `/new`, `/[id]` · **Dosya:** `src/features/authoring/exams/ExamPages.tsx` · **Önceki:** [07](#adim-07)

### Düzeltilen hatalar (işlevsel)

| Hata | Etki | Çözüm |
|---|---|---|
| Bölüm / alt bölüm formları `defaultValue` + DOM id ile okunuyor, `key` yoktu | Başka bölüme geçince **önceki bölümün değerleri ekranda kalıyor**; Kaydet yanlış değerleri yazıyordu | `FormCard key={section.id}` / `key={sub.id}` / `key={link.id}` |
| Blueprint / banka kriteri JSON hatalıysa sessizce `null` | **Mevcut şablon siliniyordu** | Ayrıştırma hatasında kayıt durur, hata bildirimi |
| Seçim yöntemi listesinde `RANDOM_SUBSET` yoktu (puan hesabı tanıyor) | Bu moddaki alt bölüm kaydedilince `FIXED`'e dönüyordu | 4 mod listede, Türkçe açıklamalı |
| Bölüm/alt bölüm/soru/bant silme, Yayınla onaysız | Yanlış tıklamayla veri kaybı / geri alınamaz yayın | Sonuç açıklamalı onay |
| Soru puanı `onBlur`'da değişmese de istek atıyordu | Gereksiz istek, toast | Yalnız değer değişince |

### Sihirbaz (`/new`)

- Adım göstergesi: 3 kart (ad + ipucu), tamamlanan ✓ yeşil, aktif vurgulu, `aria-current="step"`.
- **Temel bilgiler** gruplu: Kimlik (kod büyük harfe çevrilir, kullanımdaysa alan hatası) · Sınav amacı (4 açıklamalı radyo kart: Başarı / Seviye tespit / Tanılama / Alıştırma) · Hedef kitle (seviye + yaş, min>max doğrulaması) · Puan ve süre (**dakika** girilir, saniyeye çevrilir).
- **Başlangıç noktası:** 3 açıklamalı kart; format/kaynak seçilmeden ilerlenemez; kopyanın neleri taşıdığı yazılı.
- **Öğrenci metinleri:** "Karşılama metni", "Sınav açıklaması" (nerede görüneceği yazılı) + oluşturma öncesi **özet**.
- Footer: ← Geri / Devam et → (adım geçersizse pasif) / Sınavı oluştur.

### Sınav kurucu (`/[id]`)

- Başlıkta kod · sürüm · amaç · seviye; "Kaydediliyor…" göstergesi; iskelet yükleme, `ErrorState` + tekrar dene.
- Puan şeridi: eşitse yeşil ✓, değilse kırmızı ⚠ + "Toplamı X yap".
- Sekmeler `FilterTabs`: **Yapı ve ayarlar** / **Soru ataması (n)**.
- **Yapı ağacı** (yapışkan): ⚙ Genel ayarlar; numaralı bölümler + beceri; alt bölümlerde doluluk rozeti (dolu yeşil / eksik sarı, ör. 3/5); "+ Alt bölüm ekle", kesikli "+ Bölüm ekle"; sıralama okları `aria-label`'lı.
- **Genel ayarlar:** Temel bilgiler (başlık, toplam puan, süre dk, yaş, karşılama metni). **Sınav kuralları** 4 gruba ayrıldı — Oturum ve süre · Gezinme ve sıralama · Puanlama ve sonuç · Gözetim; 11 anahtar `SettingToggle` (açıklamalı). Tüm ham kodlar Türkçe (`UNTIMED` → Süresiz, vb.).
- **Puan bantları:** sıralı tablo (aralık, etiket, CEFR, Geçti/Kaldı rozeti), etiketli yeni bant formu, 0–100 ve alt<üst doğrulaması, eklendikten sonra bir sonraki aralık önerilir.
- **Bölüm formu:** Kimlik / Süre ve puanlama grupları; süreler dakika; ağırlık ve baraj açıklamalı; footer'da Bölümü sil (solda) / Bölümü kaydet.
- **Alt bölüm formu:** Kimlik; Soru seçimi (yöntem + adet, 4 yöntemin açıklaması); JSON alanları "Gelişmiş" katlanır bölümde, mono yazı ve örnekli; bağlı sorular kod + tip + rol + puan satırları; boşsa Soru ataması sekmesine bağlantı; "Bankadan otomatik doldur" açıklamalı.
- **Soru bağlantısı:** başlıkta soru kodu, "Soruyu düzenle →"; rol Türkçe + açıklama (Puanlı / Örnek / Deneme); puan.
- **Yayın:** iş akışı açıklaması; hatalar HATA/UYARI rozetli kartlar.
- **Soru ataması:** sol banka (yapışkan) — sonuç sayısı, "Eklenecek yer: Bölüm › Alt bölüm" şeridi, tip Türkçe, CEFR rozeti, ekliyse ✓ yeşil; sağda bölüm/alt bölüm kartları "Hedef yap / Eklenecek yer", satırlar ızgarada (sıra, kod/tip/rol, puan, ✕), toplam puan rozeti.

### Ortak

- `src/features/authoring/shared/FormGroup.tsx` (yeni): `FormGroup` ve `SettingToggle` — soru editörü, tip formları ve sınav kurucu aynı bileşeni kullanır.
- Liste: amaç etiketi Türkçe (`purposeLabel`).

### Doğrulama

- `tsc` temiz. Yeni eslint hatası yok (ExamPages'teki 4 effect hatası öncekiyle aynı yükleme effect'leri).
- Tarayıcıda görsel kontrol yapılmadı.

### Ek — Puan bantları editörü (UX)

**Sorun:** Bantların %0–100'ü kapsayıp kapsamadığı görülemiyordu; boşluk ve çakışma kontrolü yoktu; çakışan bant eklenebiliyordu; her seferinde aralık elle hesaplanıyordu; "Geçti" bir onay kutusuydu.

**Çözüm (`ScoreBandsEditor`, API çağrıları aynı):**
- **Kapsama çubuğu:** 0–100 üzerinde her bant orantılı dilim (geçti = yeşil, kaldı = gri, etiket içinde), kapsanmayan alan kırmızı zemin, çakışmalar sarı tarama; %0/25/50/75/100 cetveli; dilim ipucunda ayrıntı.
- **Durum satırı:** "✓ eksiksiz kapsıyor" ya da tıklanabilir "Boşluk %50–59 → doldur" hapları (formu doldurur) + "Çakışma" uyarıları. Hesap tam sayı yüzdeyle: %0–49 ve %50–100 bitişik.
- **Hazır kalıplar** (bant yokken): Geçti/Kaldı · Dört kademe · CEFR seviyeleri — tek tıkla sırayla eklenir.
- **Tablo:** Aralık (mono) · Sonuç etiketi · CEFR rozeti · Geçti/Kaldı rozeti · sil (onaylı, ikon).
- **Yeni bant formu:** Alt/üst sınır `%` birimli sayısal alan; aralık **ilk boşluktan otomatik önerilir**, eklemeden sonra bir sonraki boşluğa geçer; doğrulama: boş, 0–100, alt ≤ üst ve **mevcut bantla çakışma** (hangi bantla olduğu yazılır); etiket zorunlu, karnede göründüğü belirtilir; "Kaldı sayılır / Geçti sayılır" segment seçici; ekleme sırasında yükleniyor durumu.

---

<a id="adim-09"></a>

## 09 — Sayısal alanlar, birimler ve sıralama ikonları

**Tarih:** 2026-10-05 · **Kapsam:** admin varyantındaki tüm `Input type="number"` (59 kullanım) + yazarlık ekranlarındaki metin glifleri · **Önceki:** [08](#adim-08)

### Sorunlar

- Native sayı alanı: tarayıcıya göre değişen küçük ▲▼ okları, admin tasarımıyla uyumsuz.
- Alan odaktayken fare tekerleği değeri değiştiriyordu (kaydırırken puan/süre kazara değişir).
- `e`, `+`, negatif değer yazılabiliyordu; min/max yalnız tarayıcı uyarısıydı, değer sınır dışında kaydedilebiliyordu.
- Birim etikette ("Süre (dk)") — alanda ne girildiği akılda kalmıyordu.
- Sıralama/silme düğmeleri metin gliflerdi (↑ ↓ ← → ✕): fonta göre farklı boyut/hizada.

### Çözüm

#### `src/ui/primitives/NumberInput.tsx` (yeni)

`Input` admin varyantında `type="number"` görünce bunu çizer (tarihte DatePicker ile aynı kalıp) → **sayfalarda değişiklik yok**.

**Backend sözleşmesi korunur:** alan hâlâ native `<input type="number">`; `onChange`/`onBlur` aynı olayla, `e.target.value` string. Çağıranlar `Number(...)` ile aynı biçimde gönderir. Kontrollü (`value`) ve kontrolsüz (`defaultValue` + `onBlur` kayıt) kullanım ikisi de çalışır.

| Davranış | Ayrıntı |
|---|---|
| Adım düğmeleri | Sağda dikey ▲▼ (chevron ikon), hover/odakta belirgin; min/max'ta pasif; `tabIndex=-1` (klavye zaten ok tuşu kullanır) |
| Odak | Düğme `mousedown`'da odağı çalmaz; alan odakta değilse adım sonrası odaklanır → `onBlur` kaydı tetiklenir |
| Hızlı adım | Shift + ↑/↓ ya da Shift + düğme = 10 adım |
| Tekerlek | Odaklı alanda tekerlek değeri değiştirmez |
| Tuş filtresi | `e`, `E`, `+` ve `min ≥ 0` ise `-` engelli |
| Sınır | Odak bırakılınca değer [min, max]'a çekilir, `step` ondalığına yuvarlanır |
| Klavye | `inputMode` numeric/decimal (mobil klavye) |
| Birim | `suffix` prop: alanın içinde sağda ("dk", "%", "sn", "MB", "px") |

#### `Input` — yeni prop `suffix`

Yazarlık ekranlarında birimli etiketler otomatik dönüştürüldü: `Field label="X (dk)"` → `label="X"` + `<Input suffix="dk">` (22 alan: ExamPages 10, InteractionForms 10, QuestionEditor 2).

#### İkonlar (`src/ui/icons.tsx`)

Yeni: `IconChevronUp`, `IconChevronDown`, `IconChevronLeft`, `IconArrowUp`, `IconArrowDown`.
Metin glifleri ikonla değiştirildi: ↑ → `IconArrowUp`, ↓ → `IconArrowDown`, ← → `IconChevronLeft`, → → `IconChevronRight`, ✕ → `IconX` (ExamPages, QuestionEditor, InteractionForms, OptionListEditor, ContentBlockList, MediaPicker, RubricEditor — 17 yer). "Dosya yükle" `IconUpload` ile.

### Kurallar

- Sayısal alan için `<Input type="number" min max step suffix>` — native spinner'a, kendi +/- düğmesine gerek yok.
- Birimi etikete parantezle yazma; `suffix` kullan.
- Sıralama/silme düğmelerinde metin glif değil `@/src/ui` ikonları (`size-3.5`, `aria-hidden`) + düğmede `aria-label`.

### Doğrulama

- `tsc` ve değişen dosyalarda `eslint` temiz (önceden var olan effect hataları hariç).
- Tarayıcıda görsel kontrol yapılmadı. Staff / storefront varyantları değişmedi (yalnız `admin` varyantı).

### Ek — Buton içi ikon/metin hizası

**Sorun:** `Button`/`ButtonLink` içeriği satır içi bir `<span>`'e sarıyordu. Tailwind preflight `svg { display: block }` olduğundan `<Button><IconPlus/> Bandı ekle</Button>` gibi kullanımlarda ikon kendi satırına geçti, metin alta düştü. Yükleme hâlinde ortaya basılan "Kaydediliyor" metni küçük butonlardan taşıyordu ve "Sil" gibi eylemlerde yanlıştı.

**Çözüm (`src/ui/primitives/Button.tsx`):**
- İçerik sarmalayıcısı `inline-flex items-center gap-1.5` → ikon + metin her zaman tek satır, ikon küçülmez.
- Buton tabanı `whitespace-nowrap shrink-0`, aralık `gap-1.5`.
- Yükleme: metin yerine ortada dönen halka (renk butondan), ekran okuyucuya "İşleniyor"; genişlik değişmez.
- `FormCard` alt şeridi `sm:flex-wrap` — uzun etiketli birden çok buton dar kartta taşmaz.

**Kural:** Butona ikon `icon` prop'uyla ya da doğrudan çocuk olarak verilebilir; ikisi de tek satır kalır. İkon boyutu `size-3.5` (sm) / `size-4` (md).

---

<a id="adim-10"></a>

## 10 — İçerik kütüphanesi sayfaları: İnceleme, Medya, Rubrikler, Formatlar, Ayarlar

**Tarih:** 2026-10-05 · **Dosyalar:** `src/features/authoring/shared/LibraryPages.tsx`, `src/features/authoring/rubrics/RubricEditor.tsx` · **Önceki:** [09](#adim-09)

API çağrıları ve veri biçimi değişmedi; yalnız arayüz, akış ve açıklamalar.

### İnceleme kuyruğu (`/admin/content/review`)

| Önce | Sonra |
|---|---|
| `QUESTION_VERSION · 3f2a…` | Tür rozeti (Soru/Sınav) + kısa kimlik, tam kimlik ipucunda |
| Yalnız sorular açılabiliyordu | Sınav öğeleri de "İncele →" ile sınav kurucuya gider |
| Filtre yok, sıra rastgele | `FilterTabs` durum (sayılı) + içerik türü seçici; en eski gönderim üstte |
| Tam tarih-saat | "3 sa önce" (tam zaman ipucunda) |
| Düz liste, metin yükleniyor | `SectionTable` (iskelet, boş durum), hata + tekrar dene |
| — | Açıklamada inceleme iş akışı (yazar kendi içeriğini onaylayamaz; editörde onayla/taslağa döndür) |

### Medya kütüphanesi (`/admin/content/media`)

- **Tür filtresi ile yükleme türü ayrıldı:** önceden varsayılan "Görsel" filtresi ses ve videoyu gizliyordu. Artık tüm medya yüklenir; `FilterTabs` Tümü/Görsel/Ses/Video sayılarıyla; dosya adı/açıklama araması.
- **Yükleme paneli** (sağda, yapışkan): tür segment seçici; görselde *Alternatif metin*, ses/videoda *Transkript* (neden gerektiği açıklamalı); lisans/kaynak; büyük kesikli bırakma alanı, kabul edilen biçimler yazılı.
- **Kartlar:** 16:9 önizleme alanı, dosya adı + Türkçe tür rozeti, boyut/süre/çözünürlük meta, açıklama 2 satır, lisans; UUID yerine "Kimliği kopyala".
- İskelet yükleme, boş/sonuçsuz durumları, hata + tekrar dene.

### Rubrikler (`/admin/content/rubrics`)

- `CHECK / SCALE / PENALTY` → **Kriter / Ölçek / Ceza**, renkli rozet + ne işe yaradığı (ekleme kartlarında açıklama). Beceri Türkçe.
- **Toplam göstergesi:** büyük sayı + ilerleme çubuğu (tam = yeşil, eksik = mavi, fazla = kırmızı) + "12 puan eksik / 5 puan fazla"; nasıl hesaplandığı yazılı (kriter + ölçeğin en yüksek seviyesi; ceza dahil değil).
- **Kaydedilmemiş değişiklik:** "Kaydedilmedi" rozeti; başka gruba geçerken onay; "Maddeleri kaydet" yalnız değişiklik varsa aktif.
- **Onay** footer'da, onay penceresiyle; salt okunur sürümde neden düzenlenemediği bilgi şeridinde.
- **Madde kartı:** başlık şeridinde sıra + tür + "en çok X puan / −X puan"; açıklama alanı örnekli; puan `puan` birimli; ölçek seviyeleri numaralı satırlar (ad + puan + sil, en az 2); madde kimliği ve grup "Gelişmiş" katlanır bölümde. Maddeler Ana ölçütler / Cezalar başlıklarıyla gruplanır.
- Sol liste: arama, Türkçe beceri rozeti, ✓ Onaylı / Taslak. Yeni grup formu başlık düğmesiyle açılır, grup adı zorunlu, başlangıç maddeleri açıklanır.
- Madde silme onaylı.

### Sınav formatları (`/admin/content/formats`)

- Kart ızgarası: ad + kod, seviye rozeti, açıklama, **özet** (bölüm / alt bölüm / soru sayısı), bölümlerin beceri ve alt bölüm listesi (ör. "Part 1 (5) · Part 2 (5)"); boş iskelet uyarısı.
- JSON düzenleyici "İskeleti düzenle" katlanır bölümde; canlı geçerlilik kontrolü + beklenen yapı ipucu; geçersizse Kaydet pasif.
- "YLE Starters ekle" → "+ Örnek format (YLE Starters)" (ne eklediği ipucunda), yükleniyor durumu. Boş durumda formatın ne olduğu açıklanır.

### İçerik ayarları (`/admin/content/settings`)

5 uzun kart alt alta yerine **sekmeli** (`FilterTabs`, sayılı): Etiketler · Yaş bantları · Kazanımlar · Toplu içe aktarma · Geliştirici araçları.

- **Etiketler:** hap (chip) görünümü, üzerinde düzenle/sil ikonları, satır içi düzenleme (Enter kaydeder), arama; ne için kullanıldığı açıklamalı.
- **Yaş bantları:** tablo (sıra, kod, görünen ad, kaynak: Kurum / HQ varsayılanı), satır içi düzenleme; ekleme formu açıklamalı (sıra boş = sona).
- **Kazanımlar:** "+ Yeni kazanım" ile açılan form; arama + beceri filtresi; satırda kod rozeti, açıklama, çerçeve/beceri/CEFR/MEB etiketleri, ikon düğmeler. Form: kod büyük harf + benzersizlik ipucu, düzenlemede "Değiştirilemez", MEB sınıfı `. sınıf` birimli, açıklamada "Can …" kalıbı ipucu.
- **Toplu içe aktarma:** canlı JSON doğrulama ("3 satır okunacak" / "Geçerli JSON değil"), alan sözlüğü yan panelde, geçersizken buton pasif, sonuç mesajı footer'da.
- **Geliştirici araçları:** TTS / STT testleri ayrı sekmede, ne yaptıkları açıklamalı.

### Doğrulama

- `tsc` temiz. Yeni eslint hatası yok (LibraryPages 4 ve RubricEditor 1 yükleme effect hatası orijinal kodda da var).
- Tarayıcıda görsel kontrol yapılmadı. İnceleme kuyruğunda sınav türü için `targetType` değerinin `EXAM…` ile başladığı varsayıldı.

### Ek — Sınav formatları: ana-detay düzeni ve görsel iskelet düzenleyici

**Eksikler / hatalar:** Kendi formatınızı oluşturmanın yolu yoktu (yalnız sabit örnek); iskelet yalnız ham JSON'la düzenlenebiliyordu; iki sütunlu kart ızgarasında JSON düzenleyici açılınca kartlar farklı boylara uzayıp sütun hizası bozuluyordu.

**Yeni düzen:** solda yapışkan format listesi (arama, seviye rozeti, kod, "2 bölüm · 3 alt bölüm · 15 soru" özeti), sağda seçili formatın düzenleyicisi.

- **+ Yeni format** (başlıkta): ad (zorunlu), kod (boş = otomatik, büyük harf), açıklama, amaç, seviye aralığı (doğrulamalı), başlangıç iskeleti seçimi (tek bölüm / YLE Starters örneği). `createFormat` örnek düğmesiyle aynı alanları gönderir.
- **Görsel iskelet düzenleyici:** her bölüm numaralı kart — bölüm adı, beceri, yukarı/aşağı/sil (onaylı); alt bölümler hizalı sütunlarda (Ad · Görev türü · Soru sayısı · Seviye · sil), sütun başlıkları geniş ekranda; görev türü için öneri listesi (MCQ, MATCHING…); "+ Alt bölüm", "+ Bölüm ekle"; bölüm başına ve toplam soru sayısı.
- **Kaydetme:** "Kaydedilmedi" rozeti, "Değişiklikleri geri al", "İskeleti kaydet" (yalnız değişiklik varsa); `updateFormat(id, { skeleton })` — önceki gibi yalnız iskelet gönderilir.
- **Veri güvenliği:** düzenleyicinin bilmediği alanlar (blueprint'teki ek kriterler vb.) korunarak geri yazılır.
- **JSON** "Gelişmiş" katlanır bölümde, canlı doğrulama ve "JSON'u uygula" (önce görsel düzenleyiciye aktarır, kaydetmeden önce gözden geçirilir).

### Ek — Alan + buton satırlarında yükseklik hizası

**Sorun:** Ayarlar › Etiketler'de "Yeni etiket" alanı + "Ekle" butonu + arama kutusu aynı satırda `items-end` ile hizalanıyordu. `Field` = etiket + kontrol + **ipucu** olduğundan, ipucu ("Enter ile ekleyin") satırı uzatıyor; buton ve arama kutusu input yerine ipucu satırının altına iniyordu. Yaş bantlarında aynı sorun `pt-[22px]` sabit boşlukla örtülmüştü (yazı boyutu/varyant değişince kırılır).

**Çözüm:**
- `src/ui/primitives/Field.tsx` → yeni **`FieldAction`** (`@/src/ui`'dan export): etiket yüksekliğinde görünmez boşluk + eylem; satır `items-start` olduğunda buton her zaman input hizasında kalır, alanın ipucu/hatası olsa da kaymaz. Varyanta göre (admin/staff) etiket ölçüsünü kendisi alır.
- Etiketler: ekleme formu `FormGroup` "Yeni etiket" içinde (alan + `FieldAction` Ekle, en fazla `xl` genişlik); arama formdan ayrıldı → liste üstünde "N etiket · M eşleşme" + arama kutusu kendi satırında.
- Yaş bantları: `pt-[22px]` kaldırıldı → `FieldAction`.

**Kural:** Alanların yanında buton varsa satır `items-start` + butonu `FieldAction` ile sar; `items-end` ya da sabit `pt-[…]` kullanma.

---

<a id="adim-11"></a>

## 11 — Özet, Kurumlar ve Lisanslar (ikinci geçiş)

**Tarih:** 2026-10-05 · **Sayfalar:** `/admin`, `/admin/companies`, `/admin/exams` · **Önceki:** [10](#adim-10) · İlk geçiş: [02](#adim-02)

API ve veri biçimi değişmedi.

### Özet (`/admin`)

| Önce | Sonra |
|---|---|
| Statik metrik kartları | Kartlar **bağlantı**: Kurumlar → liste, Askıdaki kurum → `?status=SUSPENDED`, sınav/lisans → Lisanslar; hover'da yükselme + ok |
| "12 aktif" metni | Aktif/toplam **oran çubuğu** + yüzde |
| Dikkat gerektiren durum gizli | Üstte uyarı şeridi: "N üyelik 7 gün içinde bitiyor" (listeye kayar), "N kurum askıda" (filtreli listeye) |
| Ham bitiş tarihi, sırasız | Kalan gün rozeti — ≤7 gün / doldu kırmızı, ≤30 sarı; en yakın üstte; "5 Kas 2026" biçimi; kota "sınırsız / N öğrenci"; **Uzat →** üyelik sekmesine |
| Kurum adı düz metin | Baş harf avatarı + ad (detaya bağlantı) + mono kod |
| — | Başlıkta bugünün tarihi; bölüm açıklaması (süresi dolan kurumda öğrenci sınava giremez) |
| Gri kutu yükleme | `Skeleton`; hata `ErrorState` + tekrar dene |

Hızlı işlemlere "Lisans ver" eklendi, sıra iş akışına göre.

### Lisanslar (`/admin/exams`)

- Başlıkta genel **+ Lisans ver** (sınav seçimi diyalogda); satırdaki düğme o sınava kilitli.
- **Süreç şeridi:** 1 Sınav yayınlanır → 2 Kuruma lisans verilir → 3 Kurum atar.
- Araç çubuğu: sonuç sayısı, **amaç filtresi**, **arama** (ad/kod/kısa açıklama), "Filtreleri temizle".
- Yeni sütunlar: **Seviye** (mor mono rozet, tek seviyede tek değer) ve **Yayın tarihi**; amaç Türkçe; satırda kısa açıklama.
- Boş durum: neden boş olduğu + "Sınavlara git"; altta "Taslak/incelemedeki sınavlar burada görünmez · Tüm sınavlar →".

### Kurumlar (`/admin/companies`)

- Açıklama: kurum detayında neler yönetildiği.
- Arama: ikon, "(Enter)" ipucu, URL'deki aramayla eşitlenir (`key={q}`).
- Aktif arama özeti şeridi: “x” için N sonuç · **Aramayı temizle**.
- `logoUrl` varsa logo, yoksa baş harf avatarı.
- Oluşturulma tarihi "5 Eki 2026" biçiminde.

### Doğrulama

- `tsc` ve `eslint` temiz. Tarayıcıda görsel kontrol yapılmadı.

---

<a id="adim-12"></a>

## 12 — Tarih ve tarih-saat alanları

**Tarih:** 2026-10-05 · **Önceki:** [11](#adim-11)

### Envanter

| Yer | Tür | Önceki görünüm |
|---|---|---|
| Yeni kurum — üyelik başlangıç/bitiş, sezon başlangıç/bitiş | `date` | Proje takvimi (DatePicker) ✓ |
| Kurum › Üyelik — yeni üyelik | `date` | DatePicker ✓ |
| Kurum › Sezonlar — yeni sezon | `date` | DatePicker ✓ |
| Lisans ver penceresi — geçerlilik başlangıç/bitiş | `datetime-local` | **Native tarayıcı alanı** (stilsiz, tarayıcıya göre farklı, İngilizce/ABD biçimi olabilir) |
| Atama sihirbazı — açılış/kapanış | `datetime-local` | **Native tarayıcı alanı** |

Uyumsuzluk `datetime-local` alanlarındaydı; `Input` yalnız `date` türünü DatePicker'a yönlendiriyordu.

### Çözüm

#### `src/ui/primitives/DateTimePicker.tsx` (yeni)

`Input type="datetime-local"` admin / staff / vitrin varyantında otomatik bunu çizer (sayfalarda değişiklik yok).

- **Tarih:** projenin takvimi (DatePicker — Türkçe ay/gün, pazartesi başlangıç, klavye desteği).
- **Saat:** saat (00–23) + dakika (5 dk adım; mevcut değer 5'in katı değilse listeye eklenir) — proje Select'i. Tarih seçilmeden pasif ("Önce tarih seçin").
- Tarih seçilip saat seçilmezse varsayılan **09:00**.
- `min` / `max` (tarih kısmı) takvime aktarılır.

**Backend sözleşmesi aynı:** değer native ile birebir `yyyy-MM-ddTHH:mm`.
- `name` → gizli input; FormData aynı (GrantDialog `new Date(fd.get(...)).toISOString()` değişmeden çalışır).
- `onChange` → native olay biçimi, `e.target.value` (AssignWizard `setFrom(e.target.value)` değişmeden çalışır).

#### Entegrasyon ve doğrulama (yalnız gereken yerler)

| Yer | Eklenen |
|---|---|
| Atama sihirbazı | "Sınav açılışı / kapanışı" etiketleri + ne anlama geldiği; kapanış takviminde açılıştan önceki günler pasif (`min`); kapanış < açılış → alan hatası ve gönderim durur |
| Lisans ver | "Geçerlilik başlangıcı / bitişi" + ipuçları (kurum ne zamandan atayabilir, boş = süresiz); bitiş < başlangıç → form hatası |
| Kurum › Üyelik | Başlangıç/bitiş yan yana; "Bu günün sonunda erişim kapanır"; bitiş < başlangıç kontrolü; "En fazla öğrenci" |
| Kurum › Sezonlar | Başlangıç/bitiş yan yana; bitiş < başlangıç kontrolü |
| Yeni kurum | Üyelik/sezon etiketleri netleşti ("Boş = bugün" ipucu); iki aralık için gönderim öncesi kontrol |

Karşılaştırmalar ISO dizgisi üzerinden (`yyyy-MM-dd[THH:mm]` sözlük sırası = zaman sırası); backend'e giden değerler değişmedi.

### Doğrulama

- `tsc` ve değişen dosyalarda `eslint` temiz (önceden var olan bir `exhaustive-deps` uyarısı hariç).
- Tarayıcıda görsel kontrol yapılmadı.

---

<a id="adim-13"></a>

## 13 — Açılır paneller: kırpılma ve katman sorunu (Select, takvim)

**Tarih:** 2026-10-05 · **Etkilenen:** tüm `Select` (admin/staff/vitrin liste kutusu) ve `DatePicker` / `DateTimePicker` · **Önceki:** [12](#adim-12)

### Analiz

Select listesi ve takvim paneli tetikleyicinin içinde `position: absolute; z-index: 20` ile çiziliyordu. Bu iki soruna yol açıyordu:

1. **Kırpılma:** `overflow-hidden` / `overflow-auto` olan her ata panelin taşan kısmını kesiyor. Admin'de bunlar çok: bölüm kartları (Formatlar, içerik blokları, rubrik maddeleri — `overflow-hidden rounded-lg`), tablolar (`overflow-x-auto`), yapışkan yan paneller ve listeler (`max-h-… overflow-y-auto`). Formatlar sayfasında alt bölüm satırındaki "Seviye" seçicisi bu yüzden kart sınırında kesiliyordu.
2. **Katman:** `sticky`, `backdrop-blur`, `transform` (hover'da yükselen kartlar) kendi yığın bağlamını oluşturur; z-20 panel sonraki kardeşlerin arkasında kalabiliyor ya da kayıyordu.

### Çözüm

`src/ui/primitives/floating.ts` → **`useFloatingPanel(anchor, open, { upward, alignRight, matchWidth })`**

- Panel **portal** ile kapsayıcıdan çıkarılır: modal `<dialog>` içindeyse o dialog'a (tarayıcı üst katmanında kalır, arkasında kalmaz), değilse `document.body`'ye.
- `position: fixed; z-index: 70` — tetikleyicinin `getBoundingClientRect()` konumuna yerleşir; yukarı açılma ve sağa yaslanma kararları korunur; Select'te en az tetikleyici genişliği; ekran kenarından 8px pay.
- Konum `useLayoutEffect` içinde **DOM'a doğrudan** yazılır (ilk karede yanlış yerde görünmez, render tetiklenmez); tüm kaydırılabilir ataların kaydırmasında (capture) ve pencere boyutunda güncellenir.
- Dışarı tıklama kontrolü artık panel öğesini de içeride sayar (portal kök öğenin dışında).

`Select.tsx` ve `DatePicker.tsx` bu kancayı kullanır; `DateTimePicker` ikisini kullandığı için otomatik düzeldi. Klavye, seçim, form/FormData ve `onChange` davranışı değişmedi.

### Kural

Yeni açılır panel (menü, popover, öneri listesi) yazılırsa `useFloatingPanel` + `createPortal` kullanılır; `absolute` panel kart/tablo içinde kırpılır.

### Doğrulama

- `tsc` ve `eslint` temiz. Tarayıcıda görsel kontrol yapılmadı; özellikle Formatlar (alt bölüm seviye seçicisi), sınav kurucu, lisans penceresi (modal içi Select + takvim) ve tablo içi seçicilerde denenmeli.

### Ek — Native `<datalist>` kaldırıldı → `Combobox`

**Sorun (ekran görüntüsü, Formatlar › Görev türü):** alan HTML `<datalist>` ile öneri gösteriyordu. Tarayıcının çizdiği bu liste stillenemez: siyah ▼ oku, alanın altından kayık, gri gölgeli kutu, alan genişliğiyle hizasız; ayrıca açık/koyu temaya ve yazı tipine uymaz. Portal düzeltmesi bunu kapsamaz çünkü panel tarayıcıya ait.

**Çözüm:** `src/ui/primitives/Combobox.tsx` (yeni, `@/src/ui`'dan export)
- Serbest metin + öneri listesi; değer düz string (backend'e giden `taskType` aynı).
- Görünüm admin `Input` ile aynı (h-8, 13px, odak halkası), sağda proje chevron ikonu.
- Liste `useFloatingPanel` + portal: alanın tam altında, en az alan genişliğinde, kart içinde kırpılmaz; yer yoksa yukarı açılır.
- Öneri satırı: kod (mono) + Türkçe karşılık (MCQ · Çoktan seçmeli…). Yazdıkça süzülür; tam eşleşmede tüm liste (değiştirmek kolay).
- Klavye: ↓/↑, Enter, Esc, Tab; `role="combobox"`, `aria-activedescendant`.
- Formatlar'daki `<datalist id="format-task-types">` kaldırıldı; projede başka `datalist` kalmadı.

**Kural:** `<datalist>` kullanma; öneri listeli serbest alan için `Combobox`.

### Ek 2 — Görev türü: Combobox → Select

**Analiz:** Görev türü değerleri sabit bir kümeden (MCQ, MATCHING…) geliyor. Serbest metin kutusu (Combobox) bu alanda yanlış sinyal veriyordu: yazılabilir imleç, metin gibi görünen değer, yanındaki "Seviye" Select'inden farklı görünüm ve davranış (satırda iki ayrı kontrol dili). Kullanıcı "seçilecek bir liste" beklerken "yazılacak bir alan" görüyordu.

**Çözüm:** Proje `Select`'i (aynı satırdaki Seviye ile birebir aynı görünüm, portal liste, klavye).
- Seçenekler Türkçe ("Çoktan seçmeli", "Eşleştirme"…); kaydedilen değer kod olarak aynı (`MCQ`…) — backend değişmedi.
- "— Belirtilmemiş" boş seçeneği.
- Kayıtlı veride listede olmayan değer varsa kaybolmasın diye "XYZ (özel)" olarak listeye eklenir.

**Kural (güncellendi):** Değer sabit kümeden seçiliyorsa **Select**. `Combobox` yalnız gerçekten serbest metin + öneri gereken yerde (ör. kullanıcı tanımlı etiket). `<datalist>` hiç kullanılmaz.

---

<a id="adim-14"></a>

## 14 — Genel review (commit öncesi)

**Tarih:** 2026-10-05 · Kapsam: commit edilmemiş tüm değişiklikler (55 dosya + 9 yeni).

### Bulunan ve düzeltilen hatalar

| # | Sorun | Etki | Düzeltme |
|---|---|---|---|
| 1 | Sınav kurucu bölüm/alt bölüm kaydı `getElementById("sec-skill"/"sub-mode").value` okuyordu; admin Select'te `id` görünen **butona** gider | Beceri ve seçim yöntemi **boş string** olarak backend'e gidiyordu (önceden var olan hata, admin Select'e geçişle tetikleniyor) | `name` verildi, gizli native `<select name>` okunuyor (`selectValue`) |
| 2 | Kod alanları `toLocaleUpperCase("tr-TR")` | `i` → `İ`: "a2-speaking" → "A2-SPEAKİNG" olur; backend kodları ve aramalar bozulur | ASCII `toUpperCase()` (sınav, rubrik, format, kazanım) |
| 3 | NumberInput `step` yokken tam sayıya yuvarlıyordu | Puan 2.5 → 3 kaydediliyordu | `step` yoksa yuvarlama yok (yalnız kayan nokta artığı temizlenir) |
| 4 | NumberInput genişlik regex'i `max-w-40`'ı `w-40` sanıyordu | Rubrik puan alanında genişlik kayması | Yalnız bağımsız `w-*` sınıfı taşınır |
| 5 | Dakika gösterimi `Math.round(sn/60)` | 90 sn → "2 dk" görünüp kayıtta 120 sn'ye yazılıyordu (veri değişimi) | Tam bölüm gösterilir, kayıtta `Math.round(dk*60)` |
| 6 | Bölüm süresi `min={1}` | 30 sn'lik mevcut değer odaktan çıkınca 1 dk'ya çekiliyordu | `min={0}` |
| 7 | Format iskeletine boş `taskType: ""` yazılıyordu | Backend'e önceden olmayan boş alan | Boşsa alan gönderilmez |
| 8 | Button `whitespace-nowrap` tüm varyantlarda | Staff/öğrenci/vitrin dar ekranda uzun buton taşar | Yalnız admin varyantında |
| 9 | Kullanılmayan `Combobox` | Ölü kod | Kaldırıldı |

### Kontrol edilenler (sorun yok)

- Backend yükleri: API çağrılarının imzaları ve alanları aynı (yalnız toast metinleri değişti). Tarih/saat değerleri native biçimde (`yyyy-MM-dd`, `yyyy-MM-ddTHH:mm`).
- Ortak bileşenler staff paneline yalnız token üzerinden yansır; admin paleti `[data-panel="admin"]` kapsamında.
- Portal paneller: dışarı tıklama, modal içi (dialog'a portal), kaydırmada konum.
- `npm run build` başarılı, uyarı yok. `tsc` temiz.

### Bilinen / bilinçli kalanlar

- ESLint: 15 `set-state-in-effect`, 4 `refs` (DataGrid), birkaç `exhaustive-deps` — hepsi değişiklik öncesi koddan; build'i engellemiyor.
- `app/api/backend` proxy'sine eklenen `ilc_access_token` çerezi geçici canlı API bağlantısı içindir; gerçek backend env'i gelince kaldırılabilir.
- İnceleme kuyruğunda sınav `targetType`'ının `EXAM…` ile başladığı varsayımı; Formatlar'da ad/açıklama düzenleme ve silme backend ucu bekliyor.

---

<a id="adim-15"></a>

## 15 — Staff paneline entegrasyon

**Tarih:** 2026-10-06 · **Kapsam:** `/staff/**` + paylaşılan bölümler (`src/features/org`, `src/features/assignments`) · **Önceki:** [14](#adim-14)

### Analiz (staff paneli, değişiklik öncesi)

| # | Bulgu | Etki |
|---|---|---|
| 1 | `StaffShell` ayrı ve eski kabuk: `data-panel=""`, `#f3f0ea` bej zemin, `ilc-*` renkleri, `max-w-6xl mx-auto` ortalama | Admin'deki palet, mürekkep sidebar, breadcrumb ve tam genişlik konteyner (01, 05) staff'a hiç yansımıyordu |
| 2 | Paylaşılan içerik ekranları (soru bankası, sınav kurucu, kütüphane) staff'ta admin tokenları olmadan çiziliyordu | Aynı ekran iki panelde farklı renk/yoğunlukta |
| 3 | Staff sayfalarında **başlık yok** — bölüm bileşeni doğrudan gri zemine basılıyordu (admin'de `CompanyDetailFrame` başlığı veriyordu) | Kullanıcı hangi sayfada olduğunu yalnız menüden anlıyordu; tablolar kartsız |
| 4 | Ana sayfa: tek beyaz kutu + bağlantı listesi, yükleme = gri kutu | Hiçbir durum bilgisi yok (açık atama, öğrenci sayısı) |
| 5 | Atama sihirbazı: adım göstergesi yok, Türkçe olmayan/teknik etiketler ("Şube", "Kim"), sayı alanı native, son adımda özet yok, `ilc-navy` başlık | Öğretmen nerede olduğunu, neyi açtığını göremiyordu |
| 6 | Değerlendirme: cevap ham `JSON.stringify`, tip kodu (`ESSAY`), puan serbest metin, **"Sonuçları yayınla" onaysız**, yükleme/hata durumu yok (effect içi fetch) | Geri alınamayan yayın tek tıkla; puanlanacak metin okunmuyordu |
| 7 | Canlı izleme: öğrenci sütununda UUID, başlık/geri dönüş yok | Öğretmen öğrenciyi tanıyamıyordu |
| 8 | Atamalar: durum filtresi ve sayı yok, pencere `toLocaleString` uzun metin | Çok atamada arama zor |
| 9 | Öğrenci/Personel listelerinde arama yok | 300+ öğrencide kişi bulunamıyor |
| 10 | Kurum ayarları sekmeleri elle yazılmış `slate-100` buton şeridi; "yakında" ve "erişim yok" ekranları `ilc-*` | Ortak bileşen ve tokenların dışında |
| 11 | `NumberInput` yalnız `admin` varyantında | Staff'taki sayı alanlarında tekerlek kazası/min-max koruması yoktu |

### Çözüm

#### Kabuk ve tema

- **`PanelChrome`** genelleştirildi: `panel` (`admin` | `staff`), `homeHref`, `roleLabel`, `navLoading` (koyu sidebar'da iskelet). Staff menü öğelerine ikonlar (takvim, kalem, kupa, grafik, kep, ekip, kalkan).
- **`StaffShell`** artık `PanelChrome` kullanır (`data-panel="staff"`). Yetki kontrolü aynı; yetkisiz sayfa `EmptyState` + "Panele dön"; ilk yükleme iskeleti.
- **`admin-theme.css`** seçicileri `[data-panel]:is([data-panel="admin"], [data-panel="staff"])` → palet, semantik tokenlar, `--accent-*`, gutter, serif `PageHeader`, gölge, seçim rengi staff'ta da geçerli.
- `UiVariant` staff'ta **`staff`** kalır: kontroller tablet için en az 44px. Admin'e özel kompakt ölçüler (h-8, `whitespace-nowrap` buton) bilerek taşınmadı.
- **`NumberInput`** staff'ta da otomatik (`Input type="number"`); `touch` ile adım düğmeleri 36px genişlik. `globals.css`: staff input'larında native arama "x"i ve odak outline'ı admin gibi gizli (yerine halka + temizle düğmesi).

#### Sayfa çerçevesi

- **`StaffPage`** (`src/features/staff/StaffPage.tsx`, `StaffBound` yerine): `PageHeader` + beyaz bölüm kartı; kurum kimliği yoksa açıklamalı `EmptyState`. `bare` → kendi başlığını çizen ekranlar (sihirbaz, izleme, değerlendirme).
- Tüm staff sayfalarına başlık + "bu sayfa ne işe yarar" açıklaması eklendi.
- `SectionTable` zemini `bg-surface` (kart dışında da okunur).

#### Ekranlar

| Ekran | Değişiklik |
|---|---|
| **Panel** `/staff` | Admin Özet dili: tarihli selamlama, yetkiye göre metrik kartları (açık atama, lisanslı sınav, öğrenci, personel — yalnız yetkili sorgu atılır), menü gruplarına göre kısayol kartları |
| **Lisanslı sınavlar** | Başlık + açıklama, kart içinde tablo |
| **Atamalar / Değerlendirme** | `FilterTabs` (Tümü/Açık/Taslak/Kapalı + sayılar), `SectionToolbar` + "Yeni atama", kısa pencere biçimi ("Hemen → Kapatılana kadar"), Değerlendirme menüsünde birincil eylem "Değerlendir" |
| **Atama sihirbazı** | 08'deki sihirbaz deseni: 4 adımlı çubuk, `FormCard` footer (Geri / Devam / Önizle / Atamayı aç), adım doğrulaması, hedef türü açıklamalı kartlar (Seviye/Sınıf/Öğrenci), sınıflar seçilen kampüse göre süzülür, tarih aralığı + deneme hakkı doğrulaması, `suffix="hak"`, son adımda `DefinitionList` özet + öğrenci listesi, lisans yok/yükleme/hata durumları |
| **Değerlendirme** | `useQuery` (yükleme iskeleti, `ErrorState` + tekrar dene), Bekleyen/Puanlanan/Tümü filtresi, Türkçe tip etiketi (`TEMPLATE_REGISTRY`), okunur cevap metni, puan `NumberInput` (`step 0.5`, "puan"), durum rozeti, **yayın `ConfirmDialog`** (puanlanmamış cevap sayısını uyarır) |
| **Canlı izleme** | Başlık + Atamalar'a dönüş, öğrenci adı (UUID yerine) |
| **Öğrenciler / Personel** | Arama (ad, numara, kullanıcı adı), aramaya göre boş durum |
| **Kurum ayarları** | Ortak `Tabs` |
| **Sınav sonuçları** | `PageHeader` + `EmptyState` + "Raporlara git" |

Paylaşılan bölümler admin kurum detayında da aynı iyileştirmeleri alır (sihirbaz, değerlendirme, izleme, atamalar, öğrenci/personel araması).

### Doğrulama

- `tsc --noEmit` temiz; değişen dosyalarda eslint hatası yok (BranchesSection'daki eski 2 `exhaustive-deps` uyarısı duruyor).
- Rotalar dev sunucuda derleniyor (oturumsuz 307 → giriş). **Tarayıcıda oturum açılarak görsel kontrol yapılmadı.**

### Sonraki adımlar

- [ ] Rol/yetki düzenleme ekranı (şu an yalnız liste)
- [ ] Sınav sonuçları ekranı
- [ ] Değerlendirmede rubrik kriterlerine göre puanlama (şu an tek "Genel" kriter)
- [ ] Monitor için öğrenci adının API'den gelmesi (şu an öğrenci listesiyle eşleştiriliyor)

---

<a id="adim-16"></a>

## 16 — Staff paneli ikinci review

**Tarih:** 2026-10-06 · **Kapsam:** `/staff/**` tüm sayfalar (paylaşılan bölümler admin kurum detayına da yansır) · **Önceki:** [15](#adim-15)

### Bulunan hatalar / eksikler

| # | Ekran | Sorun | Çözüm |
|---|---|---|---|
| 1 | Kurum ayarları › Sınıflar | **Sezon yokken sonsuz iskelet** (sorgu hiç başlamıyor); `items-end` hizası; kampüs/seviye yokken boş seçimli form | Eksik önkoşulu söyleyen `EmptyState`; sezon + kampüs filtresi toolbar'da; sayı; "Seçin" seçeneği, tek kampüste otomatik seçim; pasif seviyeler gizli; doğal sıralama |
| 2 | Kampüsler / Seviyeler | Düzenleme yoktu; boş durumda eylem yok; seviyeler sırasız | `Düzenle` (ad, kod / ad, sıra, durum), açıklamalı boş durum + "İlk … ekle", sıraya göre liste, yeni seviyede sıra önerisi |
| 3 | Sezonlar | Ham ISO tarih, onaysız "Aktifleştir", aralık yalnız gönderimde kontrol | TR tarih, en yeni üstte, aktifleştirme `ConfirmDialog`, bitişte anlık hata + `min` |
| 4 | Öğrenciler | Sınıf seçilemiyordu (API `branchId` destekliyor), "Kayıtlar" yalnız sayı, düzenleme/durum yok | Sınıf sütunu (aktif sezon sınıf · seviye), `FilterTabs` (Aktif/Pasif/Kilitli), `FormGroup` Kimlik/Kayıt, zincirli sezon→kampüs→seviye→sınıf, `Düzenle` (ad, durum) |
| 5 | Personel | **Parola sıfırlama onaysız**; rol eklenebiliyor ama görülüp kaldırılamıyordu; düzenleme yok | Sıfırlama `ConfirmDialog` + kişi adıyla `SecretNotice`; Roller penceresi (mevcut roller + kapsam + kaldır + kampüs kapsamlı ekleme); "Rol yok" uyarısı; `Düzenle` |
| 6 | Raporlar | Satırda **sınav adı yoktu** | Sınav adı + kampüs + pencere, tamamlama çubuğu, durum filtresi, genel oran, "Ayrıntı" → canlı izleme |
| 7 | Roller | Tek sütun liste | Sayı + rol başına personel sayısı ve kişiler |
| 8 | Lisanslı sınavlar | Staff için yanlış boş mesajı, "∞" | Staff'a uygun boş metin, "Sınırsız / Süresiz", TR tarih, "Atama aç" belirgin |
| 9 | İçerik (soru/sınav/format) | **Yetki kontrolü yoktu**: okuma yetkili personel "Yeni sınav / Hızlı soru / Yeni format" görüp 403 alıyordu | `useCan(...perms)` (`PanelContext`); düğmeler yetkiye bağlı |

### Kurallar (eklenen)

- Liste bölümü: `SectionToolbar loading` + `SectionTable loading` aynı ağaçta; boş durumda açıklama + birincil eylem.
- Bağımlı veri eksikse sonsuz yükleme değil, neyin eksik olduğunu söyleyen boş durum.
- Kimliği geçersiz kılan / görünürlüğü değiştiren işlem (parola sıfırla, sezon aktifleştir, sonuç yayınla) onaylı.
- Yetki gerektiren oluşturma düğmesi `useCan` ile gizlenir.

### Doğrulama

- `tsc --noEmit` temiz; değişen dosyalarda eslint temiz. `src/features/authoring`'deki 16 eslint hatası (effect içi setState) önceden vardı, sayı değişmedi.
- **Tarayıcıda oturum açılarak görsel kontrol yapılmadı.**

### Ek — Soru editörü: önizleme yerleşimi içerik genişliğine bağlandı

- **Sorun:** Öğrenci önizlemesi yalnız `2xl` (ekran ≥ 1536px) iken sağa geçiyordu. Yerleşim içerik alanına değil ekrana bakıyordu; 1366–1520px ekranlarda ve yakınlaştırmada önizleme formun altına düşüyordu. Staff'ta (44px kontroller) bu daha sık görülüyordu.
- **Çözüm (`QuestionEditor.tsx`):** Sayfa kökü `@container`. İçerik ≥ 60rem → form + yapışkan önizleme yan yana (`22–32rem`); ≥ 90rem → `26–38rem`. Form sütunu `@container/form`: içindeki alan ızgaraları (tip kartları, kimlik/sınıflandırma, puanlama satırları) ekran yerine sütun genişliğine göre bölünür; önizleme sağdayken dar sütunda sıkışmaz.
- Admin ve staff aynı bileşeni kullanır; ikisinde de geçerli.
- **Kural:** Yan panelli düzenlerde kırılma noktası viewport (`2xl:`) değil container (`@container` + `@min-[..]:`).

---

<a id="adim-17"></a>

## 17 — Tablo kartı bütünlüğü ve boş durum tasarımı

**Tarih:** 2026-10-06 · **Kapsam:** `src/ui` (SectionTable, EmptyState, DataGrid, DetailShell) → admin + staff tüm tablolu sayfalar · **Önceki:** [16](#adim-16)

### Analiz

| # | Sorun | Etki |
|---|---|---|
| 1 | `SectionTable` sayfalarında filtre sekmeleri, sayı/arama/"Ekle" şeridi ve tablo **üç ayrı yüzen parça**ydı (aralarında boşluk, farklı zemin). DataGrid'de ise hepsi tek kartta | "Ekle" düğmesi tabloya ait görünmüyor; iki tablo dili |
| 2 | Staff'ta `StaffPage` beyaz kartı + içinde tablonun halkası → kart içinde kart | Gereksiz çerçeve, sıkışık görünüm |
| 3 | `EmptyState`: kesik çizgili gri çerçeve, 40px gri ikon, 13px soluk metin | Sayfa "yüklenmemiş/bozuk" gibi; "henüz kayıt yok, şunu yap" mesajı zayıf |
| 4 | Boş durumda çoğu yerde eylem yok; arama sonucu boş ile gerçekten boş aynı görünüyor | Kullanıcı ne yapacağını bilmiyor |
| 5 | Editörlerde (blok, seçenek, medya seçici, bölüm, etiket, kazanım, rubrik) elle yazılmış kesik çizgili `<p>` boş metinleri | Tutarsız dil |

### Çözüm

- **`SectionTable`** artık her zaman tek kart: `tabs` (FilterTabs) → `toolbar` (SectionToolbar: sayı · arama · eylemler, hafif zeminli şerit) → tablo / iskelet / boş durum. Yeni prop'lar: `tabs`, `toolbar`, `emptyTone`, `emptyIcon`. `flush` artık etkisiz (geriye uyum). İlk/son hücre kart kenarıyla hizalı (`sm:first:pl-4`).
- **`SectionToolbar`** dar ekranda dikey: sayı üstte, arama + düğmeler altta tam genişlik.
- Tüm bölümler (Kampüs, Sezon, Seviye, Sınıf, Öğrenci, Personel, Rol, Rapor, Üyelik, Atama, Lisanslı sınav) bu yapıya taşındı.
- **`StaffPage`** dış kartı kaldırıldı (tablo kendi kartında). **`DetailShell`** içindeki tablo kartı gölgesiz (`[data-section-table]`).
- **`EmptyState`** yeniden: tonlu gradyan zemin (`primary` / `neutral` / `warning`), katmanlı ikon rozeti (eğik arka kart), 16px başlık, açıklama `ReactNode`, `action` + `secondaryAction`, `embedded` (kart içinde çerçevesiz), `compact`.
  - `primary`: gerçekten boş, ilk kaydı oluştur (eylemli).
  - `neutral`: arama/filtre sonucu boş (eylemsiz, "filtreyi değiştirin").
  - `warning`: önkoşul eksik (ör. Sınıflar: önce sezon/kampüs/seviye).
- **DataGrid** boş durumu `EmptyState embedded` kullanır (arama boş → neutral).
- **Formatlar** boş durumu: açıklama + örnek iskelet kartı (Cambridge YLE Starters: bölüm · part · soru) + "İlk formatı oluştur"; yetkisi olmayana not. Uydurma "örnek iskeletle başlayın" ifadesi kaldırıldı.
- Medya, rubrik listesi/seçimi, etiket, kazanım, içerik bloğu, seçenek, medya seçici, sınav bölümleri boş metinleri `EmptyState` (compact) oldu.

### Kurallar

- Tablolu bölüm: `<SectionTable tabs={<FilterTabs/>} toolbar={<SectionToolbar>…</SectionToolbar>} …/>` — sekme/araç çubuğunu tablonun dışına ayrı satır olarak koyma.
- Boş durumda: gerçekten boşsa açıklama + birincil eylem; filtre/arama boşsa `neutral` ve eylemsiz; önkoşul eksikse `warning` ve neyin eksik olduğu.
- Elle kesik çizgili boş metin yazma; `EmptyState compact`.

### Doğrulama

- `tsc --noEmit` temiz. Değişen dosyalarda yeni eslint hatası yok (DataGrid ref, Toaster, MediaPicker'daki effect hataları önceden vardı).
- **Tarayıcıda görsel kontrol yapılmadı.**

---

<a id="adim-18"></a>

## 18 — Sihirbazlar: dar sütun yerine tam genişlik + canlı özet

**Tarih:** 2026-10-06 · **Kapsam:** Yeni sınav sihirbazı (`/admin|staff/content/exams/new`, `ExamPages.tsx`), atama sihirbazı (`AssignWizard.tsx`) · **Önceki:** [17](#adim-17)

### Analiz

- İki sihirbaz da `max-w-3xl` (768px) ile sınırlı ve sola yaslıydı (05'teki "dar form → sola yaslı max-w-3xl" kuralı). Geniş ekranda sayfa ~8/12 sütun kaplıyor, sağda büyük boş alan kalıyordu; başlık/adım çubuğu ile form arasında görsel kopukluk vardı.
- Aynı 768px içinde "Hedef kitle" satırı `sm:grid-cols-4` (viewport'a göre) → her alan ~170px; staff'ta 44px alanlarla sıkışık. Izgaralar kabın değil ekranın genişliğine bakıyordu.
- Girilen değerlerin özeti yalnız son adımda görünüyordu.

### Çözüm

- Sayfa kökü `@container`, tam genişlik. İçerik ≥ 60rem → `form | özet` iki sütun (`19rem`, ≥ 80rem'de `22rem`); dar alanda özet formun altına iner.
- **Canlı özet paneli** (yapışkan): Yeni sınavda başlık, kod, amaç, seviye, yaş, puan/süre, başlangıç; atamada sınav, kampüs, sezon, hedef, açılış/kapanış, deneme hakkı. Son adımdaki tekrar eden özet kaldırıldı.
- Form kartı `@container/form`: iç ızgaralar sütun genişliğine göre (`@min-[28rem]/form:grid-cols-2`, hedef kitle `@min-[46rem]/form:grid-cols-4`, başlangıç kartları `@min-[36rem]/form:grid-cols-3`).

### Kural (05'in güncellemesi)

- Sayfa düzeyinde `max-w-*` ile daraltma yok. Az alanlı form/sihirbaz: tam genişlik + sağda bağlamsal panel (özet, yardım, önizleme). Yan panelli düzende kırılma noktası container query.

### Doğrulama

- `tsc --noEmit` temiz; ExamPages'teki 4 eslint hatası (effect içi setState) önceden vardı. Tarayıcıda görsel kontrol yapılmadı.

### Ek — Kurum ayarları (`/staff/company`) yerleşimi

- **Sorun:** Bölüm sekmeleri tam genişlik gri hap şeridiydi (içinde sola yığılmış 4 küçük düğme); altındaki tablo kartıyla farklı görsel dil, farklı aralık (`mt-4` vs başlık `mb-6`). Sekmeler bilgi taşımıyordu (sayı, sıra, eksik adım). Sınıf eklenince toplam sayaç yenilenmiyordu; sezon seçeneği etiketi iki ayrı metin düğümüydü.
- **Çözüm (`StructureSection.tsx`):** Sekmeler sihirbaz adım kartı dilinde 4 kart (`grid-cols-2 lg:grid-cols-4`): sıra numarası / tamamsa ✓, ad, kayıt sayısı rozeti (0 ise uyarı tonu, "Henüz eklenmedi"), kısa açıklama. İlk açılışta kurulumun eksik ilk adımı seçili gelir. Sekme ↔ tablo kartı aralığı `gap-4`. ARIA: `tablist` / `tab` / `tabpanel` bağlı.
- `BranchesSection`: geçersiz kılma `getBranchesQueryKey(id)` önekiyle (sezon listesi + sayaç birlikte); sezon seçeneği tek metin.
- Sayfa açıklaması kurulum sırasını söyler.

### Ek 2 — Araç çubuğunda Select kayması

- **Belirti:** Sınıflar araç çubuğunda sezon seçimi ve "Sınıf ekle" alt alta düşüyor, "1 sınıf" sayacı iki satırlık yüksekliğin ortasında kalıyordu.
- **Kök neden:** `Select` (liste kutusu) sarmalayıcısı sabit `relative w-full`; verilen `className` (`sm:w-52`) yalnız içteki düğmeye uygulanıyordu. Sarmalayıcı satırı doldurup komşu düğmeyi alt satıra itiyordu.
- **Çözüm (`Select.tsx`):** Yerleşim sınıfları (`w-*`, `min-w-*`, `max-w-*`, `flex-*`, `basis-*`, `grow/shrink`, `self-*`, `col-span-*`, `order-*`; varyant önekleriyle) sarmalayıcıya, görünüm sınıfları düğmeye gider. Genişlik verilmezse sarmalayıcı eskisi gibi `w-full`; düğme her zaman sarmalayıcıyı doldurur. Diğer kullanımlar etkilenmez.

### Ek 3 — Araç çubuğu ölçüsü ve tek satır hizası

- **Belirti:** Staff'ta araç çubuğu kontrolleri 44px (seçim kutusu, `sm` düğme `min-h-11`), sayaç 13px metin → şerit ~64px, kontroller "iri", sayaç havada. Admin'de de düğme `sm` 28px, arama/seçim 32px → 4px uyumsuzluk.
- **Çözüm (`SectionTable.tsx`):**
  - Araç çubuğu şeridi `UiVariantProvider variant="admin"`: her panelde aynı sıkı ölçü (FormDialog / ConfirmDialog ile aynı yaklaşım). Şerit `py-2`, toplam ~49px.
  - `SectionToolbar`: tek satır `flex-wrap items-center`; sayaç `mr-auto h-8` (kontrollerle aynı çizgi); eylem grubu `sm:flex-nowrap`, dar ekranda tam genişlik alt satır.
  - Doğrudan düğme/bağlantılar `h-8 px-3 text-[13px]` → arama (32px) ve seçimle (32px) birebir aynı yükseklik.
  - Sayaç `<p>` içinde iskelet (`div`) geçersiz iç içe yerleşimdi → `div`.
- **Bilinçli ödün:** Staff'ta araç çubuğu kontrolleri 44px yerine 32px (tablet). Satır içi eylemler ve formlar 44px kalır.

### Ek 4 — Sayaç metni boşluğu

- **Belirti:** Araç çubuğunda "1öğrenci" bitişik ya da "1" / "öğrenci" alt alta.
- **Kök neden:** Ek 3te sayaç kabı `flex` yapıldı; içindeki sayı `<span>` ve " öğrenci" metni ayrı flex öğesi oldu, aradaki boşluk yutuldu, dar alanda kırıldı.
- **Çözüm:** Sayı + ad tek `inline-flex gap-1 whitespace-nowrap` öğe. Kural: flex kapta metin + `<span>` karıştırma; ya tek sarmalayıcı ya `gap`.
