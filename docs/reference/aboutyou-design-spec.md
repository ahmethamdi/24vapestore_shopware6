# aboutyou.de — Ölçülmüş Tasarım Spesifikasyonu

**Bu değerler tahmin değil.** Gerçek Chromium oturumunda (1440×900, çerez onayı verilmiş,
109 görsel yüklenmiş) `getComputedStyle` ve `getBoundingClientRect` ile ölçüldü. 2026-07-22.

Site CSS-in-JS kullanıyor, `:root` üzerinde token seti **yok** — değerler 3 stylesheet'in
taranmasıyla (186 adet `--*` bildirimi) ve element bazlı computed style ile çıkarıldı.

Ekran görüntüleri: `docs/reference/screenshots/aboutyou-*.png`

> **Kullanım:** Bu dosya *yapı, ölçü, oran ve anatomi* referansıdır. Renkler bizde
> tersine çevriliyor (kırmızı/siyah dark-first). Token karşılıkları
> `custom/plugins/VapeStoreTheme/.../abstract/_tokens.scss` içinde.

---

## 1. Renk (aboutyou'nun kendi skalası)

| Değer | Ölçülen kullanım |
|---|---|
| `#FFFFFF` | Sayfa/kart zemini, ikincil buton, mega menü paneli |
| `#F5F5F5` | Yardımcı bar zemini, devre dışı buton, sonuç sayacı pill, header alt kenarlık |
| `#F4F4F5` | Ürün görseli placeholder zemini |
| `#D9D9D9` | Kenarlık/ayraç, filtre chip kenarlığı, pasif nokta |
| `#9D9D9D` | Devre dışı metin, focus-visible halkası |
| `#434343` | İkincil/gölgeli metin, kart alt başlığı, üstü çizili fiyat, filtre etiketi |
| `#262626` | Birincil buton hover/active |
| `#000000` | Ana metin, birincil buton, USP bar zemini |

**Vurgular:**
- SALE kırmızısı: **`#D9232A`** — SALE nav item, SALE rozeti, indirimli fiyat
- Kupon mavisi: **`#1539CF`**
- Cam efekti: `rgba(255,255,255,0.7)` (sticky header + kart metin bloğu)

**Buton token yapısı** (stylesheet'ten birebir):
- Kenarlık kalınlığı: normal `1px` → hover/active `2px` → focus-visible `4px`
- Geçiş: `background-color .3s ease-in-out, box-shadow .3s ease-in-out`

---

## 2. Tipografi

Font: `"Mark Pro"` — **ticari lisanslı**, bizde kullanılamaz. Metrikleri geometrik-grotesk;
Inter aynı boyut/ağırlıklarda skalayı korur. Temel satır yüksekliği oranı **1.15**.

| Rol | Boyut | Ağırlık | Satır y. | Harf aralığı | Dönüşüm |
|---|---|---|---|---|---|
| Bölüm başlığı | 32px | 800 | 40px | normal | — |
| Bölüm eyebrow | 12px | 700 | 18px | normal | **uppercase** |
| PLP h1 | 20px | 600 | 30px | normal | — |
| h2 | 28px | 600 | 32.2px | normal | — |
| h3 | 24px | 600 | 27.6px | normal | — |
| Gövde | 16px | 400 | 18.4px | normal | — |
| **Kart marka adı** | 10px | 600 | 18px | **0.4px** | **uppercase** |
| **Kart ürün adı** | 10px | 500 | 16px | **0.4px** | — |
| **Kart fiyat** | 12px | 500 | 24px | normal | — |
| **Kart üstü çizili** | 9px | 500 | 13.5px | normal | — |
| Nav item | 14px | 400 | 17.5px | normal | — |
| Buton | 14px | 700 | 21px | normal | — |
| USP bar | 10px | 400 | 11.5px | normal | **uppercase** |

> **Dikkat:** Kart tipografisi şaşırtıcı derecede küçük (10px marka, 10px ürün adı, 12px fiyat).
> Bu, grid'de görselin baskın olmasını sağlıyor. Bizim koyu temada 10px okunabilirlik
> riski taşır — kontrast ve boyut birlikte değerlendirilmeli.

---

## 3. Header — 3 katmanlı, toplam 148px

| Bar | Yükseklik | Zemin | Konum |
|---|---|---|---|
| Yardımcı bar | 32px | `#F5F5F5` | statik, z-index 101 |
| **Ana bar** | **64px** | `rgba(255,255,255,0.7)` | **`sticky; top:0; z-index:100`** |
| Kategori nav | 52px | şeffaf | statik, `box-shadow: 0 2px 5px rgba(0,0,0,.1)` |

**Kaydırma davranışı** (scrollY=1400'de ölçüldü): ana bar `y=0`'da kalır, **zemin değişmez,
gölge eklenmez, yükseklik daralmaz**. Yardımcı bar ve kategori nav kayıp gider.

**USP/promo bar:** header yığınının **ALTINDA**, y=148, **40px**, zemin `#000000`,
metin 10px uppercase beyaz, 3 öğe (ücretsiz kargo / 30 gün iade / faturayla ödeme).

**Mega menü:** **hover ile açılır** (tıklama gerekmez). Panel tam genişlik
**1440×382px**, zemin beyaz, header'ın hemen altında (y=148). Çok kolonlu kategori
link listeleri + uppercase eyebrow.

---

## 4. Ürün Kartı Anatomisi (1440px)

- **Kart:** 262.1 × 459.4px, zemin beyaz, **radius 0**, padding 0
- **Görsel sarmalayıcı:** 262.1 × 349.4px, zemin `#F4F4F5`, **radius 4px**
- **Görsel:** **oran 3:4 (0.75)**, radius 2px. CDN `360×480` servis ediyor
- **Metin bloğu:** padding `12px 8px`, yükseklik 110px, **ortalanmış**

**Dikey sıra:**
1. Marka (10px/600, ls 0.4px, uppercase)
2. Ürün adı (10px/500, ls 0.4px, `#434343`)
3. Fiyat (12px/500; indirimliyse `#D9232A`)
4. "Ursprünglich: …" (9px/500)
5. Üstü çizili referans fiyat (9px/500, `line-through`)
6. Renk swatch'ları (14×14 daire) + "+15" taşma sayacı
7. **"Sepete ekle" butonu — 48px yüksekliğinde, kartın içinde**

**Rozetler:** görselin **sol kenarına** yapışık bayrak formu,
`border-radius: 0 4px 4px 0`, padding `2px 8px 2px 16px`, yükseklik 20px, 12px/500
- SALE → `#D9232A` / beyaz
- COUPON → `#1539CF` / beyaz
- "2er Pack", "Exklusiv" → beyaz / siyah

**Favori ikonu:** görselin **sağ üstü**, 24×24 buton, 15px içeriden.

**Hover davranışı (ölçüldü):** `box-shadow` yok, `transform` yok. Bunun yerine
**ek görseller lazy-load ediliyor (1→4)** ve bir slider beliriyor: yarım-pill oklar
(34.8×41.2px) + nokta sayfalama. **Görsel değişimi veya overlay YOK.**

> İndirim yüzdesi (`-11%`) DOM'da var ama **görsel rozet olarak konumlandırılmamış** —
> görünür indirim sinyali kırmızı fiyat + üstü çizili referans fiyat.

---

## 5. Grid ve Container

| Viewport | Kolon | Kart genişliği | Gap |
|---|---|---|---|
| 1920 | **4** | 338.3px | 7px (CSS 5px) |
| 1440 | **4** | 262.1px | 7px (CSS 5px) |
| 1024 | **3** | 240.8px | 7.1px |
| 768 | **2** | 234.6px | 7.1px |
| 375 | **2** | 169px | 5px |

**Container:** `max-width: 1800px`, `padding: 0 64px` (desktop), `16px` (375px).

> **Not:** 1920'de bile 4 kolon. Kartlar geniş kalıyor, sıkışık grid yok.
> Mobilde 2 kolon — tek kolona düşmüyor.

---

## 6. Boşluk ve Radius

**Boşluk 4px tabanlı**, 8px baskın adım. Ölçülen değerler: 2, 4, 5, 8, 12, 16, 24, 48, 64, 80px.

**Radius kullanım sıklığı:** `4px` (×102, **baskın**), `2px` (×43), `8px` (×25),
`100%` (×9), `999px` (×4).

**Estetik yargı: keskinden hafif yuvarlağa.** Temel radius ölçülü **4px**.
Kartların kendisinde radius **yok**. Pill formu sadece sayaç ve slider oklarında.

**Yükselti (elevation) neredeyse yok:** kartlarda `box-shadow` **yok**.
Sitedeki tek ölçülen gölge kategori nav barında. Ayrım 1px `#D9D9D9` kenarlık ve
`#F5F5F5` dolgu ile sağlanıyor.

> Bu bizim için önemli: koyu temada gölge zaten zayıf okunur. aboutyou'nun
> "kenarlık + yüzey rengi" yaklaşımı dark-first'te de doğru strateji.

---

## 7. Kategori Listeleme (PLP) — 4000 SKU için kritik

- **Sol kenar çubuğu: SADECE kategori navigasyonu.** 152.9px genişlik, kardeş
  kategorileri listeler. Aktif öğe `#F5F5F5` dolgulu. **Attribute filtresi DEĞİL.**
- **Attribute filtreleri: grid'in ÜSTÜNDE yatay chip barı.** Her chip 32px yüksek,
  `1px solid #D9D9D9`, radius 4px, padding `4px 8px`, 16px/400 etiket + dropdown oku.
  Sıra: Preis, Sale (toggle), Größe, Farbe, Marke, Sondergrößen, Material, Muster, Produktart.
  Taşma **"Mehr Filter"** butonuna toplanıyor.
- **Sıralama:** sağ üstte eşleşen 32px chip ("Sortierung"), yanında "Ansicht" (görünüm yoğunluğu).
- **Sonuç sayacı:** h1'in yanında inline pill — `#F5F5F5` zemin, radius 11px, 10px/600, ls 1px.
- **Sayfalama: SONSUZ KAYDIRMA.** 9 programatik kaydırmada ürün sayısı 31→120 çıktı,
  hiçbir "daha fazla göster" butonu yok. Sona doğru ilerleme metni beliriyor:
  *"Du hast Dir 104 von 381159 Produkten angesehen"*.
- **Breadcrumb:** `Frauen > Bekleidung`, h1'in üstünde.

---

## 8. Anasayfa Bölüm Envanteri (DOM sırasıyla)

Her biri bizde **sürükle-bırak CMS block** olacak:

1. **y=32, h=64** — Sticky header
2. **y=148, h=40** — USP şeridi (siyah, 3 öğe, uppercase)
3. **y=188, h=487** — **Hero: yatay kaydırmalı tam genişlik carousel** (3 slide).
   Her slide bölünmüş panel: solda eyebrow pill + ~40px başlık + 4'lü küçük ürün
   thumbnail satırı; sağda tam kanama yaşam tarzı görseli + "Gesponsert" etiketi +
   dairesel ok butonları
4. **y=755, h=834** — **Marka rayı + ürün carousel'i kombosu.** Eyebrow + 32px/800 başlık +
   "alle" linki; yatay kaydırmalı marka logo tile'ları (her birinde "Folgen" butonu);
   altında iç içe **ürün carousel'i** (10 kart)
5. **y=1669, h=338** — **4'lü editoryal tile satırı** (kaydırmasız)
6. **y=2087, h=587** — **İlham bloğu**: 4 büyük görsel kart, birinde canlı yayın overlay'i
7. **y=2754, h=596** — **Yatay kaydırmalı editoryal kart carousel'i** (10 kart)
8. **y=3430, h=554** — **Anlar/vesileler carousel'i** (5 kart)
9. **y=4064, h=834** — **İkinci marka rayı + ürün carousel'i** (#4 ile aynı yapı)
10. **y=4978, h=554** — **Popüler kategoriler carousel'i** (20 link).
    **Dikdörtgen tile'lar — DAİRESEL DEĞİL** (`border-radius: 50%` bulunamadı)
11. **y≈5500** — Kombin/ilham şeridi (kişi kartları)
12. **y=6379, h=448** — **Footer**: çok kolonlu link grid (40 link)

Toplam anasayfa yüksekliği 1440'ta **7406px**.

---

## 9. Bizim İçin Kritik Çıkarımlar

1. **Sonsuz kaydırma, sayfalama değil** — 4000 SKU'da bu karar performansı doğrudan etkiler
2. **Yatay filtre chip'leri, sidebar değil** — sol raf sadece kategori navigasyonu
3. **3:4 görsel oranı**, ortalanmış kart metni, sol kenar bayrak rozetleri
4. **Gölge yok** — ayrım kenarlık + yüzey rengiyle. Dark-first'te de doğru strateji
5. **Sepete ekle butonu kartın içinde** (48px) — listeden doğrudan satın alma
6. **Mega menü hover ile açılıyor**, tam genişlik 382px panel
7. **Mark Pro lisanslı** — Inter ile değiştiriyoruz, metrikler uyumlu

## Ölçülemeyenler (dürüstlük notu)

- Logo'nun tam piksel boyutu (inline SVG 0×0 döndü)
- Aktif filtre uygulanmış durumdaki chip görünümü
- Mobil mega menü ve filtre çekmecesinin iç yapısı
