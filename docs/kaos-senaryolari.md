# Kaos senaryoları — elle koşum kılavuzu

Bu belge, `npm run test:chaos`'un otomatik olarak koşamadığı tarayıcı/cihaz seviyesini
kapsar. Otomatik testler (`src/test/chaos/`) jsdom + sahte ağ/depo ile **mantık seviyesinde**
cevap kaybı olmadığını kanıtlar; jsdom gerçek IndexedDB kotasını, gerçek service worker'ı ve
gerçek ağ kesintisini simüle etmez. Bu beş senaryo pilot öncesi **bir kez**, gerçek bir
tablette ve gerçek bir masaüstünde elle koşulur.

Her senaryoda ölçülen tek şey aynıdır: **gönderilen cevap sayısı = sunucuya ulaşan benzersiz
cevap sayısı.** Sonucu kontrol etmek için: cevabı öğrenci ekranında gir, ardından
`GET /applications/{id}/answers` (veya staff panelindeki sonuç ekranı) ile sunucuda o cevabın
gerçekten kayıtlı olduğunu doğrula.

## Hazırlık

- Bir test atama/sınav oluştur, en az 5-6 maddeli bir bölüm olsun.
- Tarayıcının geliştirici araçlarını aç (ağ sekmesi ve konsol gerekecek).
- Her senaryodan sonra sınavı teslim etme — aynı denemeyi birden fazla senaryo için
  kullanabilirsin, yalnız her senaryo arasında hangi maddelerin cevaplandığını not al.

## Senaryo 1 — Ağ kesme

1. Sınava gir, bir maddeyi cevapla.
2. Tarayıcı geliştirici araçlarında (Network sekmesi → "Offline") veya cihazın kendisinde
   (uçak modu) ağı kes.
3. 2-3 madde daha cevapla. Ekranda bir hata/uyarı görünebilir, bu normal — devam et.
4. ~30 saniye bekle (kuyruk üstel geri çekilmeyle dener, 5 saniyeye kadar).
5. Ağı aç.
6. **Beklenen**: birkaç saniye içinde tüm cevaplar sunucuya ulaşır. Sunucudan (staff panelinin
   sonuç/izleme ekranından) o maddelerin hepsinin kaydedildiğini doğrula.

## Senaryo 2 — Uygulama kapatma

1. Sınava gir, 2-3 madde cevapla.
2. Ağı KES (uçak modu).
3. Tarayıcı sekmesini/uygulamayı tamamen KAPAT (yeniden yükleme değil — sekmeyi kapat).
4. Tarayıcıyı/sekmeyi yeniden aç, AYNI sınava gir (devam et).
5. Ağı AÇ.
6. **Beklenen**: kapatmadan önce cevaplanan maddeler hâlâ ekranda görünür (yerel depodan
   geri yüklendi) VE sunucuya ulaşır. Hiçbir cevap kaybolmamalı.

## Senaryo 3 — Sekme kapatma (ağ AÇIK, ama sekme aniden kapanıyor)

1. Sınava gir, bir madde cevapla.
2. Cevabın sunucuya gittiğini BEKLEMEDEN (cevapladığın anda hemen) sekmeyi kapat.
3. Sekmeyi yeniden aç, aynı sınava gir.
4. **Beklenen**: cevap sunucuda var (ya sekme kapanmadan `keepalive` isteğiyle gitmiştir ya da
   yeniden açılışta yerel depodan tekrar denenip gitmiştir). Yarım kalan hiçbir cevap kaybolmaz.

## Senaryo 4 — Cihaz değiştirme

1. Bir cihazda (ör. masaüstü) sınava gir, 2-3 madde cevapla.
2. O cihazı sınav ekranında AÇIK bırak (teslim etme, çıkma).
3. İKİNCİ bir cihazda (ör. tablet), AYNI öğrenci hesabıyla AYNI sınava gir.
4. İkinci cihazda farklı 2-3 madde cevapla.
5. Birinci cihaza dön, bir madde daha cevaplamayı DENE (devralındığı için bir uyarı
   görebilirsin — bu beklenir).
6. **Beklenen**: ikinci cihazın tüm cevapları sunucuda var. Birinci cihazın devralmadan ÖNCE
   verdiği cevaplar da sunucuda var — hiçbiri atılmaz (F3-08'in kuralı: "hiçbir koşulda
   atılmaz").

## Senaryo 5 — Saat oynatma

1. Sınava gir, geri sayımın çalıştığını gör.
2. Cihazın SİSTEM SAATİNİ elle büyük bir miktar (ör. 1 saat) ileri al (ayarlardan, tarayıcı
   açıkken).
3. ~10 saniye bekle, geri sayımı gözlemle.
4. **Beklenen**: geri sayım saat değişiminden ETKİLENMEZ (sunucu zaten yetkili, istemci saati
   süre hesabında kullanılmaz) — hızlı ileri atlamaz, sıfırlanmaz. Sınav normal şekilde devam
   edebilir olmalı.
5. Saati GERİ al (gerçek saate döndür) — geri sayım hâlâ tutarlı olmalı.
6. Not: bu sapma sunucu tarafında (`CLOCK_SKEW_DETECTED` olayı) ayrıca kaydedilir — bu olayın
   gerçekten yazıldığını doğrulamak istersen staff panelinin olay günlüğü ekranından (varsa)
   veya veritabanından `application_event` tablosunu sorgulayarak kontrol et.

## Bulgu kaydı

Bir senaryo beklenen davranışı GÖSTERMEZSE: bunu bir hata olarak kabul et, hangi paketin
(F3-06/F3-07/F3-08) ilgili olduğunu belirle, o paketin görev dosyasına dönerek düzelt — bu
belgede bir "geçici not" ekleyip geç GEÇME. Sonucu (geçti/geçmedi + tarih + hangi cihaz)
`plan/DURUM.md`'ye ekle.
