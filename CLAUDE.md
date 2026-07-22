# 24VapeStore — Shopware 6.7

E-sigara / vape B2C e-ticaret sitesi. ~4000 SKU, çok sayıda kategori ve alt kategori.

---

## 🔴 ALTIN KURAL

**Her storefront component'i, admin'deki "Shopping Experiences" (Erlebniswelten) CMS
editöründen sürükle-bırak ile yerleştirilebilir ve düzenlenebilir olmalıdır.**

Bir component ancak şunların hepsi sağlandığında bitmiş sayılır:

1. CMS **element** olarak kayıtlı (config paneli + preview + storefront twig)
2. En az bir CMS **block** ile editöre sürüklenebilir
3. Görünen her metin / görsel / link / renk `element.translated.config.*`'ten okunuyor —
   twig'de hardcode içerik yok
4. Boş/varsayılan config ile de anlamlı render oluyor
5. Etiketler snippet dosyalarından geliyor, ham string değil

Bir istek statik twig'e kayacaksa **dur ve CMS element olarak kur**. Gerçekten CMS'e
uygun olmayan yerler (checkout iç akışı, hesap sayfaları, sepet mekaniği) için gerekçeyi
açıkça söyle.

Test: *bir mağaza yöneticisi bunu geliştirici olmadan düzenlemek, taşımak veya kaldırmak
ister mi?* Evet ise → CMS element.

---

## Teknoloji ve Kararlar

| Konu | Karar |
|---|---|
| Platform | Shopware **6.7.12.1** (core, storefront, administration, elasticsearch) |
| Sürükle-bırak | Shopware **native CMS** — 3. parti page builder yok, custom builder yok |
| Dev ortamı | **DDEV** (Docker) — PHP **8.4**, MySQL 8.0, Node 22 |
| Yerel URL | `https://24vapestore.ddev.site:8443` (admin: `/admin`) |
| Proje yolu | `~/Projects/24vapestore_shopware` |
| Tema plugin'i | `custom/plugins/VapeStoreTheme` — tek plugin, hem tema hem CMS element'ler |
| Tasarım referansı | https://www.aboutyou.de/ (yapı, grid, filtre UX'i, ürün kartı anatomisi) |
| Palet | Kırmızı + siyah, **dark-first** |
| Repo | git@github.com:ahmethamdi/24vapestore_shopware6.git |

**Neden XAMPP altında değil:** Docker Desktop macOS'ta `/Applications` altını paylaşmıyor
("mounts denied" hatası). Proje `~/Projects/` altına taşındı. XAMPP'ın PHP'si (8.0) zaten
Shopware 6.7 ile uyumsuzdu; her şey DDEV içinde çalışıyor.

**Neden PHP 8.4, 8.3 değil:** `composer install` host'ta PHP 8.4 ile çalıştırıldı,
lock dosyası Symfony 8.x bileşenlerini seçti ve bunlar `php >=8.4.1` istiyor.
8.3 container'da `vendor/composer/platform_check.php` fatal error verir.
Container PHP'sini düşürmek istersen önce `composer update`'i container içinde çalıştır.

---

## Dizin Yapısı

```
custom/plugins/VapeStoreTheme/src/Resources/
├── theme.json                          # tema config — admin'den düzenlenebilir renk/tipografi alanları
├── app/
│   ├── administration/src/
│   │   ├── main.js                     # ⚠️ her element/block BURADA import edilmeli
│   │   └── module/sw-cms/
│   │       ├── elements/<ad>/          # index.js, component/, config/, preview/
│   │       └── blocks/<kategori>/<ad>/
│   └── storefront/src/
│       ├── main.js                     # storefront JS plugin kayıtları
│       └── scss/
│           ├── abstract/_tokens.scss   # ⚠️ TEK DOĞRULUK KAYNAĞI — renk/boşluk/tipografi
│           ├── overrides.scss          # Bootstrap/Shopware değişken override'ları
│           └── base.scss               # ana giriş, @Storefront'tan sonra yüklenir
├── views/storefront/
│   ├── element/cms-element-<ad>.html.twig
│   └── block/cms-block-<ad>.html.twig
└── snippet/{de_DE,en_GB}/
```

---

## Komutlar

Her şey DDEV içinde çalışır. `ddev` ön eki olmadan çalıştırma.

```bash
ddev start                      # ortamı başlat
ddev ssh                        # container'a gir
ddev launch                     # storefront'u tarayıcıda aç
ddev launch /admin              # admin'i aç

# Shopware
ddev exec bin/console cache:clear
ddev exec bin/console plugin:refresh
ddev exec bin/console theme:compile
ddev exec bin/console dal:refresh:index

# Build (bu template'te bin/*.sh kullanılır, composer script'i YOK)
ddev exec bin/build-administration.sh
ddev exec bin/build-storefront.sh
ddev exec bin/watch-administration.sh    # admin geliştirme sırasında
```

**Ne zaman ne gerekir:**
- Admin JS değişti (CMS element/block) → `bin/build-administration.sh`
- SCSS değişti → `bin/console theme:compile`
- Twig değişti → `bin/console cache:clear`
- Yeni plugin eklendi → `plugin:refresh` → `plugin:install --activate`

---

## Agent'lar

`.claude/agents/` altında proje-özel agent'lar var. Doğru olanı kullan:

| Agent | Ne zaman |
|---|---|
| `shopware-cms-element-builder` | **Her yeni görsel component.** CMS element + block + config + preview + twig üretir |
| `shopware-storefront-dev` | Tema/SCSS/design token, core twig override (header, footer, PLP, PDP, checkout), storefront JS |
| `shopware-catalog-architect` | Kategori ağacı, property group / custom field kararları, varyantlar, import, OpenSearch, performans |
| `dnd-compliance-auditor` | Altın kural denetimi. Read-only — bulur, planlar, uygulamaz |

---

## Shopware 6.7 Tuzakları

⚠️ **CMS element yazmadan önce `docs/shopware-cms-reference.md` oku.** 1127 satır,
core kaynak kodundan (`v6.7.12.1`) doğrulanmış. Resmi dokümantasyon 6.7 için kısmen bayat.

En kritikleri:

- `initElementConfig()` **argümansızdır** (doküman `('name')` diyor — 6.5 kalıntısı)
- Twig'de `element.config.x.value` **değil**, `element.translated.config.*` kullan.
  Diğeri çalışır ama çeviri-farkında değildir; çok dilli mağazada **sessizce** bozulur
- Admin component kaydı async: `register('x', () => import('./component'))`
- Block'larda `component` alanı 6.7'de artık dikkate alınıyor (≤6.6'da yok sayılıyordu)
- `mt-*` (Meteor) → `v-model`, eski `sw-*` select → `v-model:value`.
  Ters kullanırsan alan render olur ama **kaydetmez**
- Vite sadece admin'de; storefront hâlâ webpack
- 6.7'de native CMS-editable header/footer yok

---

## Kod Standartları

- **Core'a dokunma.** `vendor/shopware` altında hiçbir şey değiştirilmez.
  Override `sw_extends` + block override ile yapılır
- **Minimal override.** Tüm core template'i kopyalama; sadece gereken block'u ez,
  gerekiyorsa `{{ parent() }}` çağır
- **Token kullan.** SCSS'te magic hex veya magic px yok — `abstract/_tokens.scss`'ten al.
  Değer yoksa önce token ekle
- **Snippet kullan.** Kullanıcıya görünen string twig'e gömülmez
- **Erişilebilirlik.** Koyu zeminde kontrast hataları kolay oluşur — WCAG AA kontrolü yap,
  odak göstergesi görünür olsun
- **Ölçek bilinci.** 4000 SKU var; listeleme sorgularında N+1'den kaçın, criteria'ya
  association'ları açıkça ekle
