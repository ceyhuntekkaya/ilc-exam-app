@AGENTS.md

# Proje notları

## Admin ve staff paneli (`/admin/**`, `/staff/**`) tasarımı

- Kaynak belge: `docs/super-admin-tasarim.md`. Tüm tasarım adımları tek belgede: `docs/admin-redesign.md` (tarih, neden, değişen dosyalar, sonraki adımlar). **Her değişiklikten sonra bu belgenin sonuna yeni bölüm ekle ve günlüğü güncelle; ayrı dosya açma.**
- Tema: `src/styles/admin-theme.css` — "sınav kâğıdı + mürekkep". Paletler `[data-panel="admin"]` ve `[data-panel="staff"]` kapsamında yeniden tanımlanır (primary = mürekkep mavisi, neutral = soğuk kâğıt grisi, secondary = fosforlu kalem, `--accent-teal|marker|plum|red` + `-bg`). Öğrenci/landing etkilenmez.
- Staff: kabuk `PanelChrome panel="staff"` (StaffShell); sayfa `StaffPage` (PageHeader + bölüm kartı, `bare` = kendi başlığını çizen ekran). UiVariant `staff` kalır (44px dokunma hedefi); admin kuralları staff sayfalarında da geçerli.
- Ham hex yazma; tokenları kullan (`bg-primary-600`, `text-fg-muted`, `bg-(--accent-teal-bg)`).
- Layout: header ve `main#main` `panel-container` kullanır: **tam genişlik, max-width/ortalama yok**, iki yanda sabit boşluk (16 / 24 / 32px: mobil / sm / lg). Sayfa içinde `mx-auto` ile ortalama ya da `max-w-*` daraltma yapma; az alanlı form/sihirbaz tam genişlik + sağda bağlamsal panel (özet/yardım/önizleme), kırılma `@container` ile.
- Sayfa başlığı `PageHeader` ile; admin'de serif (`font-display`) otomatik.
- Liste kartlarında durum filtresi için `FilterTabs` (`@/src/ui`) kullan; elle buton sekmesi yazma.
- Tablolu bölüm: `SectionTable tabs={FilterTabs} toolbar={SectionToolbar}` tek kart; araç çubuğunu ayrı satır yapma. Boş durum `EmptyState` (primary=ilk kayıt+eylem, neutral=filtre boş, warning=önkoşul eksik; kart içinde `embedded`, dar alanda `compact`), elle kesik çizgili metin yazma.
- Durumlar: yükleme `SectionTable loading` / `DataGrid loading` (gri kutu yok); hata `<ErrorState error={error} onRetry={() => void refetch()} />`; geri alınamayan işlem `ConfirmDialog`; işlem sütunu sağa yaslı; tek seferlik gizli değer `SecretNotice`. Ayrıntı: `docs/admin-redesign.md` › 03.
- Formlar: alanları `FormGroup` ile grupla (sütun sayısı alan sayısını bölsün); `MultiPicker` `Field` içine sarılmaz; kaydet butonu `FormCard footer`; enum hep Türkçe etiketle.
- Alanın yanında buton (Ekle/Kaydet) varsa: satır `items-start` + `<FieldAction><Button/></FieldAction>`. `items-end` ya da sabit `pt-[..]` kullanma (ipucu/hata satırı hizayı kaydırır).
- Ayar anahtarları (karıştır, izin ver…) tek satır checkbox değil: açıklamalı kart (`SettingToggle`, `SETTING_HELP`). Kullanıcıya etkisini ve ne zaman kapatılacağını yaz.
- Sayısal alan: `<Input type="number" min max step suffix="dk">` (admin'de NumberInput otomatik; değer sözleşmesi aynı). Birimi etikete yazma. Sıralama/silme düğmelerinde glif değil ikon (`IconArrowUp/Down`, `IconX`) + `aria-label`.
- Tarih: `<Input type="date">`, tarih-saat: `<Input type="datetime-local">` — admin'de DatePicker / DateTimePicker otomatik, değer biçimi native ile aynı. Başlangıç/bitiş çiftlerinde bitiş < başlangıç kontrolü ve ne anlama geldiğini söyleyen ipucu ekle.
- Açılır panel (liste, takvim, menü): `useFloatingPanel` + `createPortal` (src/ui/primitives/floating.ts). `absolute` panel kart/tablo overflow'unda kırpılır. Sabit kümeden seçimde `Select`; native `<datalist>` kullanma (stillenemez).

## Öğrenci paneli (`/student/**`) tasarımı

- Belge: `docs/student-redesign.md` (hedef kitle 7–14 yaş; ilkeler, palet, ekranlar). Her değişiklikten sonra sonuna bölüm ekle ve günlüğü güncelle.
- Tema: `src/styles/student-theme.css`, `[data-panel="student"]` kapsamında "gökyüzü + güneş" (primary mavi, secondary güneş sarısı, `--kid-mint|sun|coral|grape|sky` + `-bg`). Fontlar `src/styles/student-fonts.ts` (Lexend + Nunito, `latin-ext`). Ham hex yazma.
- Tek ana sayfa (`/student`); yeni öğrenci sayfası/menü açma, içerik ana sayfaya bölüm olarak eklenir.
- Bileşenler `src/features/student/ui.tsx`: `KidButton` (ekranda tek `primary`), `StatusPill` (renk + ikon + metin), `KidDialog`, `KidLoading`, `KidError`, `KidNotice`. Admin `src/ui` bileşenlerini öğrenci ekranında kullanma.
- Metin: kısa, "sen" dili, teknik terim yok. Arayüz metni sade (başlık en fazla `text-2xl`, gövde `text-base`), soru içeriği büyük; dokunma hedefi en az 44px. Durum yalnız renkle verilmez.
- Soru içeriği (`exam-player`, `QuestionView`) admin "Öğrenci önizlemesi" ile birebir aynı: öğrenci kapsamında `.exam-player` CSS ezme, kabı önizlemedeki gibi; görünüm değişikliği yalnız `exam-player` içinde (ikisine birden yansır). Öğrenci paneli tamamen İngilizce (A1–A2, kısa cümle; kabukta `lang="en"`); yalnız admin önizleme notları Türkçe. Soru ekranında kabuk gizli, süs yok; üst çubuk 48px (bölüm · sıra · süre), soru takibi + Önceki/Sonraki footer'da. Süre normalde gri, uyarıda sarı, son dakikada mercan; süre sınırı yoksa sayaç gösterilmez.
- Sürükle-bırak yalnız `exam-player/dnd/PlaceBoard` (`@dnd-kit`; sürükle + dokun-seç, kutudaki karta dokun = geri al, `StartOver`; renk `DropZone variant` + `correct` ile — exam-player'da `cn` birleştirmez, aynı özelliğe iki sınıf verme); sıralama `@dnd-kit/sortable` + ok düğmeleri. Native HTML5 drag kullanma (tablette çalışmaz).
- Medya: öğrencide başlayınca sonuna kadar çalar, hak sayısı kadar, aynı anda tek medya ve çalarken soru geçişi kilitli (`session/playerGuard`). Ses/video seçenekli kart sonuna kadar oynatılmadan taşınamaz/seçilemez (`useOptionLock`, havuzda `OptionDragItem`, dizilim `poolListClass`). Writing otomatik kaydetmez ("Save answer"; geçişte sorulur). Her soru başında `FormatHint`.

## Değişiklik günlüğü

- 2026-10-05 — `admin-redesign.md` › 01: admin paleti, sidebar, konteyner sistemi, dashboard stat kartları.
- 2026-10-05 — `admin-redesign.md` › 02: ortak bileşenler (Badge, Tabs, DetailShell, EntityHeader, FormCard, DataGrid, yeni FilterTabs), Özet hızlı işlemler, Kurumlar/Lisanslar/Kurum genel bakış/Soru bankası/içerik çerçevesi.
- 2026-10-05 — `admin-redesign.md` › 03: yeni ErrorState (HTTP tabanlı mesaj + tekrar dene), SectionTable iskelet yükleme, SectionToolbar, SecretNotice, onaylı silme, canlı izleme yeniden yazıldı.
- 2026-10-05 — `admin-redesign.md` › 04: DataGrid tutamakları gizli, Soru Bankası/Sınavlar listesi hizalama, Türkçe tip/beceri etiketleri, FilterTabs.
- 2026-10-05 — `admin-redesign.md` › 05: konteyner max-width/ortalama kaldırıldı, sabit yan boşluk; sihirbazlar sola yaslı.
- 2026-10-05 — `admin-redesign.md` › 06: soru editörü (adım çubuğu, yapışkan önizleme, FormGroup, footer kaydet, Türkçe enum, onaylı silme/arşiv), MultiPicker düzeltmeleri.
- 2026-10-05 — `admin-redesign.md` › 07: İçerik sekmesi bölümleri + açıklamalar, SettingToggle (açıklamalı ayarlar), OptionListEditor/ContentBlockList/MediaPicker/PlaybackPolicy yeniden; galeri silme/altyazı ve hotspot etiket düzeltmeleri.
- 2026-10-05 — 07 eki: kazanım seçicisi `MultiPicker codeLabels` (kod rozeti + açıklama, çipte yalnız kod).
- 2026-10-05 — `admin-redesign.md` › 08: sihirbaz (adımlar, amaç kartları, dakika, doğrulama, özet), kurucu (ağaç, gruplu kurallar, puan bantları tablosu, soru ataması), defaultValue/JSON/RANDOM_SUBSET hata düzeltmeleri, FormGroup/SettingToggle ortak dosyada.
- 2026-10-05 — `admin-redesign.md` › 09: NumberInput (adım düğmeleri, sınır, tekerlek/tuş koruması, suffix), birimli etiketler suffix, metin glifler yerine ikonlar.
- 2026-10-05 — 08 eki: puan bantları kapsama çubuğu, boşluk/çakışma tespiti, hazır kalıplar, otomatik aralık önerisi.
- 2026-10-05 — 09 eki: Button ikon+metin tek satır (preflight svg block düzeltmesi), yükleme spinner, FormCard footer wrap.
- 2026-10-05 — `admin-redesign.md` › 10: İnceleme (filtre, tablo, sınav bağlantısı), Medya (filtre/yükleme ayrımı, kartlar), Rubrikler (Türkçe tür, toplam çubuğu, kaydedilmemiş uyarısı), Formatlar (özet kartları), Ayarlar (sekmeler, chip etiketler, kazanım arama, JSON doğrulama).
- 2026-10-05 — 10 eki: Formatlar ana-detay düzeni, yeni format formu, görsel iskelet düzenleyici (bölüm/alt bölüm sütunları), JSON gelişmiş.
- 2026-10-05 — `admin-redesign.md` › 11: Özet (tıklanabilir metrikler, uyarı şeridi, kalan gün rozetleri), Lisanslar (arama/amaç filtresi, seviye/yayın sütunları, süreç şeridi, genel Lisans ver), Kurumlar (arama özeti, logo).
- 2026-10-05 — `admin-redesign.md` › 12: DateTimePicker (datetime-local → takvim + saat/dakika, değer biçimi aynı), aralık doğrulamaları ve ipuçları (atama, lisans, üyelik, sezon, yeni kurum).
- 2026-10-05 — 10 eki: `FieldAction` (alan yanındaki buton hizası), Etiketler/Yaş bantları form satırları düzeltildi.
- 2026-10-05 — `admin-redesign.md` › 13: Select/DatePicker panelleri portal + fixed (`useFloatingPanel`) — kart/tablo overflow kırpılması ve katman sorunu giderildi.
- 2026-10-05 — 13 eki: native datalist yerine `Combobox` (Formatlar görev türü).
- 2026-10-05 — 13 eki 2: Formatlar görev türü Select (Türkçe etiket, belirtilmemiş, özel değer korunur).
- 2026-10-05 — `admin-redesign.md` › 14: commit öncesi review — select değeri okuma, TR büyük harf, NumberInput yuvarlama/genişlik, dakika dönüşümü, boş taskType, buton nowrap, Combobox kaldırıldı; build temiz.
- 2026-10-06 — `student-redesign.md` › 01: öğrenci paneli — tek ana sayfa, gökyüzü+güneş teması, Lexend/Nunito (latin-ext), sınav adımları, odaklı soru ekranı (soru noktaları, sakin süre, yapışkan alt çubuk), KidDialog/StatusPill kiti, yeni giriş ekranı.
- 2026-10-06 — `student-redesign.md` › 02: yoğunluk revizyonu — küçük tipografi/kit, ince soru header, soru takibi footer'da (Önceki · numaralar · Sonraki), oynatıcı içeriği öğrenci kapsamında büyütüldü.
- 2026-10-06 — 02 eki: sınav adım çubuğu eşit sütunlu kart (etiketler her cihazda, çizgiler merkezden merkeze).
- 2026-10-06 — `student-redesign.md` › 03: tüm soru formatlarında cevap kaydetme + geri yükleme (önce yalnız çoktan seçmeli kaydediliyordu), format bazında düzen/metin düzeltmeleri, PickHint, tek satır adım çubuğu.
- 2026-10-06 — `student-redesign.md` › 04: her zaman görünen süre (kalan/geçen, sınav geneli, süre çubuğu), dinleme kartı (dalga animasyonu, ilerleme, hak noktaları), konuşma kaydı (hazırlık sayacı, seviye, otomatik durma), cevap kontrollerinde İngilizce etiketler.
- 2026-10-06 — 04 eki: animasyonlar sakinleştirildi (ping/pulse yok, küçük yavaş dalga), dinleme/konuşma aynı satır düzeni, range input yerine tek tip ilerleme çubuğu.
- 2026-10-06 — 04 eki 2: soru ekranı + oynatıcı öğrenci metinleri İngilizce; ana ses kartı tam genişlik.
- 2026-10-06 — `student-redesign.md` › 05: soru alanı admin önizlemesiyle eşlendi — exam-player görselleri commit haline döndü, öğrenci .exam-player ezmeleri silindi; yalnız cevap kaydetme (görünmez) korundu.
- 2026-10-06 — 05 eki: öğrenci teması varsayılan bg/renk/font `@layer base`e alındı (giriş ekranında beyaz metinler görünmüyordu).
- 2026-10-06 — 05 eki 2: student-theme CSS yorum ayrıştırma hatası; öğrenci akışında effect içi setState lint hataları giderildi.
- 2026-10-06 — 05 eki 3: KidDialog ikon solda + metin sağda, düğmeler sağa yaslı.
- 2026-10-06 — 05 eki 4: geniş ekranda Back/Next sayfa kenarlarında dikey ortalı sabit düğmeler; mobilde alt çubukta.
- 2026-10-06 — 05 eki 5: sınav akışı yönlendirmeleri tekilleştirildi (navigateOnce), süre sonu heartbeat döngüsü kilitlendi.
- 2026-10-06 — 05 eki 6: boşluk seçici listesi portal (kırpılma yok); geçen süre sessionStorage ile yenilemede korunuyor.
- 2026-10-06 — `student-redesign.md` › 06: review — hızlı geçişte cevap kaybı ve 5 sn Next kilidi giderildi; kenar düğmeleri içerik kenarında; ana sayfa lg tek sütun, küçük telefon adım etiketleri.
- 2026-10-06 — 06 eki: tablet alt çubukta Back/Next/Finish eşit genişlik ve aynı kabartma.
- 2026-10-06 — `admin-redesign.md` › 15: staff paneli admin kabuğu/temasına alındı (PanelChrome, StaffPage), ana sayfa metrikleri, atama sihirbazı adımları, değerlendirme (onaylı yayın, filtre), izleme öğrenci adları, atama filtresi, öğrenci/personel araması, staff NumberInput.
- 2026-10-06 — `admin-redesign.md` › 16: staff ikinci review — Sınıflar sonsuz yükleme, kampüs/seviye/öğrenci/personel düzenleme, öğrenci sınıf kaydı, onaylı parola sıfırlama/sezon aktifleştirme, rol yönetimi, rapor sınav adları, içerikte `useCan` yetki kontrolü.
- 2026-10-06 — 16 eki: soru editörü önizlemesi container query ile içerik ≥ 60rem'de sağda (staff/admin), form ızgaraları sütun genişliğine göre.
- 2026-10-06 — `admin-redesign.md` › 17: SectionTable tek kart (sekme + araç çubuğu + tablo), yeni EmptyState (tonlu zemin, ikon rozeti, neutral/warning tonları, embedded/compact), Formatlar örnek iskeletli boş durum, editör içi boş metinler.
- 2026-10-06 — `admin-redesign.md` › 18: yeni sınav ve atama sihirbazı tam genişlik + yapışkan canlı özet paneli (max-w-3xl kaldırıldı), iç ızgaralar container query.
- 2026-10-06 — 18 eki: /staff/company sekmeleri kurulum adım kartları (sayı, ✓, eksik adım otomatik seçili), sınıf sayacı yenileme, hizalar.
- 2026-10-06 — 18 eki 2: Select genişlik sınıfları sarmalayıcıya (araç çubuğunda düğmenin alt satıra kayması giderildi).
- 2026-10-06 — 18 eki 3: tablo araç çubuğu her panelde sıkı ölçü (32px), sayaç + kontroller tek satır aynı hizada.
- 2026-10-06 — 18 eki 4: araç çubuğu sayacında sayı–ad boşluğu (flex içinde yutuluyordu), tek satır.
- 2026-10-06 — `student-redesign.md` › 07: cihaz kontrolü — 3-2-1 geri sayım, kalan süre, Bitir/Vazgeç, unmount'ta medya kapatma, ayrıntılı izin/cihaz hata mesajları, webm süre düzeltmesi.
- 2026-10-06 — 07 eki: cihaz kartı sabit sahne (kamera 16:9, mikrofon sabit yükseklik), izin bekleme ekranı, tek satır durum, eşit kart boyu.
- 2026-10-06 — `student-redesign.md` › 08: PLAN — sınav ekranı UX revizyonu (dokunmatik sürükle-bırak, geri alma, medya kilidi, format rehberi, İngilizce panel, giriş hakkı); onay bekliyor.
- 2026-10-06 — `student-redesign.md` › 09: plan uygulandı — @dnd-kit PlaceBoard (dokunmatik sürükle + dokun-seç, geri alma, Start over), medya kilidi/hak/odak, FormatHint, seçenek kartları ve görsel ızgaralar, boşluk yuvaları, Writing kaydet, yükleme önizleme+kaldırma, giriş hakkı ile yeniden deneme, süresizde sayaç yok, öğrenci paneli tamamen İngilizce.
- 2026-10-06 — `student-redesign.md` › 10: 09 review — dinleme/deneme hakkı oturumda saklanıyor, çift dokunuş ve medya tuşu açıkları, QuestionView key, kayıt otomatik durma/gerçek süre/kilit, DropZone varyantları (sınıf çakışmaları), havuz parlaması, çokgen alan, "Keep this order".
- 2026-10-06 — `student-redesign.md` › 11: backend uyumu (cevapta üst düzey mediaId), hareketsiz sürükleme = dokunuş (yavaş dokunuş kaybolmuyor), iOS: touch-callout, overlay panel kökünde, m4a kayıt, video kapak karesi, ≥44px hedefler; PreviewRubricPanel lint.
- 2026-10-06 — `student-redesign.md` › 12: önce izle/dinle kilidi (sürükle-bırak, sıralama, çoktan seçmeli), video kartları yan yana 2 sütun, görsel 2–4 sütun, sıralamada video oynatıcı, kutuda video kapak karesi.
- 2026-10-06 — `student-redesign.md` › 13: sürüklenen kopya imleç/parmağı izliyor (followPointer + OVERLAY_STYLE; kopya kaynak kartın boyuyla konumlandığı için yukarıda kalıyordu).
- 2026-10-06 — `student-redesign.md` › 14: yerleşen görsel/video kutuyu tam doldurur (puzzle: görsel üstü alan, grup kare kutucukları, eşleştirme kutusu), MediaImageSlot object-fit çakışması.
- 2026-10-06 — `student-redesign.md` › 15: boşluklar düz metin gibi (alt çizgili; seçmeli, kelime havuzu, açık uçlu), seçilen kelime normal boyda okunur.
- 2026-10-06 — `student-redesign.md` › 16: boşluk hizası düzeltildi (inline-block, taban çizgisi), numara yerine okunaklı "•••".
- 2026-10-06 — `student-redesign.md` › 17: boşluk zemini şeffaf, boşta yalnız "•••", dolunca kelime altı çizili (eski tasarım).
- 2026-10-07 — `student-redesign.md` › 18: yönerge sesi (`instructionAudio`) öğrenci ekranına ve sınav önizlemesine aktarıldı; sınav önizlemesi aynı kapta.
- 2026-10-07 — `student-redesign.md` › 19: sıralama soruları alt alta tek sütun; video küçük kapak + modal oynatıcı (öğrencide bitene kadar kapanmaz, hak/kilit kuralları aynı).
- 2026-10-07 — `student-redesign.md` › 20: tüm soru videoları (uyaran, seçenek, havuz, eşleştirme, gruplama, hotspot) kapak + modal oynatıcı; portal olay sızıntısı engellendi.
- 2026-10-07 — `student-redesign.md` › 21: video kartları küçük (max 16rem), havuz ve seçeneklerde otomatik dolan eşit sütunlar (2+1 dağınıklığı yok).
- 2026-10-07 — `student-redesign.md` › 22: denetim — tüm önizlemeler ve öğrenci ekranı aynı QuestionView; ortak `viewBodyOf` dönüştürücü ve `QuestionFrame` kabı.
- 2026-10-07 — 22 eki: değişen dosyalarda lint hataları giderildi (useAnswerSync, useSavedAnswer, ExamExtraTabs, öğrenci bölüm sayfası useEffectEvent).
- 2026-10-07 — 22 eki 2: inceleme — video modalı z-index (tam ekran kapısının üstünde kalıp sınavı kilitliyordu) düzeltildi, modal odak yönetimi.
- 2026-10-07 — `student-redesign.md` › 23: video kartları eşit boy (h-full), kilit uyarısı kapak altında tek satır, hak noktaları kapakta, tutamak yok.
- 2026-10-07 — `student-redesign.md` › 24: video kartı kapağından da sürüklenir (basılı tut/sürükle), kısa veya yavaş dokunuş yine videoyu açar (tapMediaTrigger).
- 2026-10-07 — `student-redesign.md` › 25: hakkı biten video/ses kartı kapaktan da taşınır (native disabled yerine aria-disabled, dokunuş karta geçer); ses düğmesi aynı kurala alındı.
- 2026-10-07 — `student-redesign.md` › 26: video denetimi — yerleşmiş video kartında yanıltıcı ▶ kaldırıldı ("VIDEO" etiketi), uyaranda art arda videolar eşit sütun.
- 2026-10-07 — `student-redesign.md` › 27: öğrenci hata mesajları (yükleme + sınav akışı) İngilizce, sebep + ne yapmalı; ham backend metni yalnız konsolda (studentErrorMessage).
- 2026-10-07 — `student-redesign.md` › 28: izin penceresi / dosya seçici kaynaklı tam ekran çıkışı ihlal sayılmıyor (90 sn beklenen çıkış, sonraki dokunuşta tam ekrana dönüş, şerit).
- 2026-10-07 — `student-redesign.md` › 29: allowSkip açıkken "You can skip this question" ipucu; cevap kaydetme hatası İngilizce; clear answer için backend uç noktası yok (öneri yazıldı).
- 2026-10-07 — `student-redesign.md` › 30: "Clear my answer" mevcut PUT ile ({} = boş bırakıldı), red olursa cevap geri yüklenir; yalnız allowSkip açıkken.
- 2026-10-07 — `student-redesign.md` › 31: 30 geri alındı — "Start again" yalnız ekranda sıfırlar (yerel taslak silinir, sunucuya istek yok).
- 2026-10-07 — `student-redesign.md` › 32: telefon/tablet denetimi — uyaranlı soru tablet dikeyde alt alta (@3xl), soru numaraları ve Break 44px, "Ana sayfa" → "Home".
- 2026-10-07 — `student-redesign.md` › 33: commit öncesi inceleme — yumuşak tam ekran zamanlayıcı uzatma, dosya seçici iptalinde pencere kapanır, hata çevirici kelime sınırı; build başarılı.
