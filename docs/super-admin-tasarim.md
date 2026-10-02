# Super Admin tasarım yaklaşımı

> **Kapsam:** yalnız Super Admin paneli (`/admin/**`).
> Staff, student, login ve landing **bu belgeyi kullanmaz**; onların görsel dili ayrıdır.
>
> Kaynak: eticaret admin/satıcı paneli (`PanelChrome`, `AdminList`, `DetailShell`, `src/ui`).
> Bu proje kopyası: `ilc-app/src/ui`, `ilc-app/src/features/shell/PanelChrome.tsx`.
> Agent kuralı: `.cursor/rules/super-admin-ui.mdc`.

---

## 1. Genel ilkeler

1. **Tek panel dili.** Koyu sidebar + açık içerik alanı. Panel kökünde `data-panel` ile tema açık kilitlenir (uzun operasyon ekranı; vitrin/landing koyu-açık ayrımından bağımsız).
2. **Token’sız değer yok.** Renk, radius, gölge semantic token’lardan gelir (`bg`, `surface`, `border`, `fg`, `fg-muted`, `fg-subtle`, `primary`, `success|warning|danger|info`). Ham `#hex` / keyfi `rounded-[7px]` yazılmaz.
3. **Kendi UI kit’i.** Üçüncü parti komponent kütüphanesi yok. Form ve layout `@/src/ui` üzerinden. `ui/` domain ve API bilmez.
4. **Admin varyantı.** Admin layout `UiVariantProvider variant="admin"` sarmalar → Input/Select/Button kompakt (`h-8`, ~13px). Sayfa sayfa tekrar sarmalamaya gerek yok.
5. **Dört hâl zorunlu.** Her ekran: `loading` (Skeleton) / `empty` (EmptyState) / `error` (ErrorState) / `success`. Üçü eksikse ekran bitmemiş sayılır.
6. **URL = durum.** Filtreler, sekmeler, detay bölümleri mümkün olduğunca URL’de. Paylaşılabilir link, geri tuşu, derin link.
7. **Kart içinde kart yok.** Bir surface kartın içinde ikinci “kutu” açılmaz. Uzun form → yan yana/alt alta birden çok `FormCard`.
8. **Türkçe UI, İngilizce kod.** Etiketler `tr-TR`; path/segment/enum kodları İngilizce. Büyük harf: `toLocaleUpperCase("tr-TR")` (CSS `uppercase` yok).

---

## 2. Kabuk (`PanelChrome`)

| Bölge | Davranış |
|---|---|
| Sidebar | Koyu gradient (`neutral-800 → 900`), grup başlıkları uppercase küçük, ikon + etiket |
| Aktif nav | `bg-white/10`, solda `primary` şerit, `aria-current="page"` |
| Üst şerit | Yapışkan; breadcrumb = `Grup / Sayfa`; mobilde hamburger |
| Kullanıcı | Avatar baş harf, rol etiketi (“Süper yönetici”), çıkış ikonu |
| İçerik | `main#main`, `px-4/6/8`, odak programatik taşınabilir (route değişiminde) |

Nav grupları: `src/config/nav.ts`. Yeni Super Admin sayfası önce buraya eklenir.

---

## 3. Liste sayfası kalıbı

Eticaretteki `AdminList` mantığı:

```
┌─ PageHeader ─────────────────────────────────────────┐
│  Başlık  [CountBadge]              [Birincil aksiyon]│
│  Kısa açıklama                                        │
└───────────────────────────────────────────────────────┘
┌─ surface kart (rounded-xl border shadow-sm) ─────────┐
│  [FilterTabs: Tümü | Aktif | …]     [FilterBar …]    │
│ ─────────────────────────────────────────────────────│
│  DataGrid / tablo satırları                           │
│  veya EmptyState / TableSkeleton                      │
└───────────────────────────────────────────────────────┘
```

### 3.1 PageHeader

- `title`, opsiyonel `description`, sağda `actions` (`Button` / `ButtonLink`).
- Liste ise `count` veya Suspense’li `countSlot` (`CountBadge`).
- Alt form/detayda `back={{ href, label }}` ile üst listeye dönüş.

### 3.2 Filtre şeridi

- **GET + URL.** Form gönderimi veya select `onChange` → query string. Gizli alanlarla sekme/parametre korunur (`keep`).
- Üstte ayrı etiket satırı yok: aramada bağlam **placeholder**’da; select/tarihte **inlineLabel** (kontrolün içinde soluk etiket).
- “Filtreleri temizle” yalnız en az bir filtre aktifken.
- Az seçenekli durum filtresi → **FilterTabs** (link; JS Tabs değil). Diğer filtrelerle aynı kartın üstünde; mobilde sekmeler altta kalacak şekilde `flex-col-reverse`.

### 3.3 Tablo

- Başlık + filtreler **hemen** çizilir; veri gelene kadar yalnız gövde Skeleton (yazılmakta olan arama/odak kaybolmaz).
- Satır → detay URL. Durum sütunu: tonlu `Badge` + Türkçe etiket (ham `ACTIVE` gösterme).
- İkinci satır bağlamı için `subField` (ör. adın altında kod); ayrı sütun açmadan.
- Sayı/tutar sağa yaslı, `numeric` / tabular-nums.
- Boş liste: `EmptyState` (filtre yüzünden boşsa farklı metin: “Filtreleri temizleyin”).

### 3.4 Kullanılacak bileşenler

`PageHeader`, `CountBadge`, `DataGrid`, `EmptyState`, `ErrorState`, `Skeleton` / `TableSkeleton`, `Input`/`Select` (admin), `Badge`, `Button`.

---

## 4. Detay sayfası kalıbı

Eticaretteki `DetailShell` + yatay iki seviye sekme:

```
BackLink → Listeye dön

┌─ başlık kartı ───────────────────────────────────────┐
│  EntityHeader                                         │
│   avatar | ad + Badge | kimlik                        │
│   metrik şeridi                    ActionBar (sağda)  │
│  [opsiyonel notice / uyarı şeritleri]                 │
│ ─────────────────────────────────────────────────────│
│  DetailGroupTabs     Genel | Yapı | Sonuç | …         │  ← 1. seviye
│ ─────────────────────────────────────────────────────│
│  DetailSectionPills  [Özet] [Ayarlar] …               │  ← 2. seviye (gri şerit)
└───────────────────────────────────────────────────────┘

┌─ bölüm kartı ────────────────────────────────────────┐
│  h2: Grup / Sayfa adı                                 │
│  içerik: DefinitionList | FormCard | DataGrid | …     │
└───────────────────────────────────────────────────────┘
```

### 4.1 Gezinme kuralları

- **1. seviye (grup):** başlık kartının alt kenarında alt çizgili sekmeler. Grup linki grubun **ilk** sayfasına gider.
- **2. seviye (sayfa):** seçili grubun sayfaları gri şeritte pill. Grupta tek sayfa varsa pill **çizilmez**.
- Ana gezinme = **route segmenti** (`/admin/companies/[id]/overview`, `.../users`, …). Client `Tabs` yalnız bir bölümün *içinde* ikincil ayrım için.
- Varsayılan segment URL’de yazılmayabilir (`overview` gizlenebilir); diğerleri yazılır.
- Yetkisiz bölüm: menüde yok **ve** URL ile gelinirse `notFound()`.

### 4.2 EntityHeader

- Sol: avatar (görsel veya baş harf), başlık, durum `Badge`.
- Altında kimlik (id/kod; gerekirse dış link).
- Metrik şeridi: etiket + değer; ton (`success|warning|danger|muted`) anlamı metinle birlikte.
- Sağda / mobilde altta `ActionBar` (birincil + ikincil + yıkıcı).

### 4.3 Bölüm içeriği

| Tür | Bileşen |
|---|---|
| Salt okunur özet | `DefinitionList` |
| Düzenleme formu | `FormCard` + `FormGrid` + `Field` |
| Alt liste | gömülü `DataGrid` veya `SectionTable` |
| Zaman çizelgesi | `StatusTimeline` |
| Yıkıcı onay | `ConfirmDialog` (gerekçe zorunlu olabilir) |

Bölüm kartı başlığı: `sectionGroup / sectionTitle` (grup adı sayfa adıyla aynıysa grup yazılmaz).

---

## 5. Form kalıbı

- Her kontrol `Field` içinde: `label`, `hint`, `error`, `required`.
- `FormCard`: başlık + açıklama + alanlar + alt footer (sağa yaslı Kaydet / Vazgeç; solda `FormMessage`).
- `FormGrid`: `sm:grid-cols-2`; geniş alan `sm:col-span-2`.
- Admin Input odakta: kenar `primary` + hafif halka; native date yerine `DatePicker` (admin/storefront).
- Select uzun listede `searchable`; ağaç seçenekleri `"— — Ad"` girinti kalıbı.
- Submit sırasında `Button loading` → genişlik zıplamaz, `aria-busy`.

---

## 6. Görsel dil (kısa)

| Öğe | Değer |
|---|---|
| Kart | `rounded-xl border border-border bg-surface shadow-sm` |
| Panel zemin | `bg-bg` (neutral-50) |
| Birincil aksiyon | `primary-600` turuncu (mevcut tema paleti) |
| Vurgu / odak | aynı primary ailesi |
| Tehlike | `danger` + metin; admin’de çerçeveli danger buton, onayda dolu `danger-solid` |
| Tipografi | sans (Source Sans); başlık `font-semibold tracking-tight` |
| Yoğunluk | Operasyon paneli: kompakt, süs yok, emoji yok |

Landing’deki ILC marka renkleri (`ilc-ink`, `ilc-navy`, …) **Super Admin panelinde kullanılmaz**; panel semantic token’larla yaşar.

---

## 7. Yeni ekran kontrol listesi

**Liste**

- [ ] `PageHeader` + sayı + birincil aksiyon
- [ ] Filtreler URL’de; varsa `FilterTabs`
- [ ] Surface kart + tablo / EmptyState / Skeleton
- [ ] Satır → detay linki; durum rozetli

**Detay**

- [ ] `BackLink` + `DetailShell` + `EntityHeader`
- [ ] Grup / alt sekmeler URL segmenti
- [ ] Bölüm kartı başlıklı; içerik doğru composite
- [ ] Yıkıcı işlemde `ConfirmDialog`

**Ortak**

- [ ] Yalnız `@/src/ui` kontrolleri
- [ ] Dört hâl tasarlandı
- [ ] Staff/student stillerine karışılmadı

---

## 8. Bilinçli sapmalar (ILC)

- Eticaretteki “Mağazaya git” üst linki yok (vitrin yok).
- Para/komisyon bileşenleri (`MoneyBreakdown`, …) kitte durur; sınav domaininde gerekmedikçe kullanılmaz.
- Rich text editör (Tiptap) taşınmadı; gerekirse ayrıca eklenir.
- Detay nav config (`detail-nav.ts`) ilk karmaşık varlıkta eklenecek; şimdilik kalıp aynı.
