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
| Dev ortamı | **Yerel** (Docker YOK) — brew Apache + PHP-FPM **8.4**, MySQL 8.0, Node 26 |
| Yerel URL | `http://24vapestore.test:8088` (admin: `/admin`, kullanıcı `admin` / şifre `shopware`) |
| Proje yolu | `/Applications/XAMPP/xamppfiles/htdocs/24vapestore-shopware6` |
| Tema plugin'i | `custom/plugins/VapeStoreTheme` — tek plugin, hem tema hem CMS element'ler |
| Tasarım referansı | https://www.aboutyou.de/ (yapı, grid, filtre UX'i, ürün kartı anatomisi) |
| Palet | **Beyaz zemin + kırmızı vurgu** (light-first). Kırmızı yalnızca buton/indirim/aktif durumda |
| Repo | git@github.com:ahmethamdi/24vapestore_shopware6.git |

**Ortam (2026-07-22'de DDEV/Docker'dan taşındı):** Docker artık kullanılmıyor. Proje
htdocs altında, servisler doğrudan makinede brew ile çalışıyor:

| Servis | Detay |
|---|---|
| Web | brew Apache 2.4.68, **port 8088**, `brew services start httpd` |
| PHP | brew PHP **8.4.11**, PHP-FPM `127.0.0.1:9000` (Apache `proxy_fcgi` ile bağlı) |
| DB | brew MySQL **8.0.46**, **port 3307**, DB adı `24vapestore`, kullanıcı `root` (şifresiz) |
| Redis | brew redis, varsayılan port |

Config dosyaları: `/opt/homebrew/etc/httpd/httpd.conf` (yedek: `.bak-20260722`),
vhost `/opt/homebrew/etc/httpd/extra/httpd-vhosts.conf`.

**Neden XAMPP'ın kendi Apache/MySQL'i değil:** XAMPP macOS'ta hâlâ **x86_64 (Intel)** binary
dağıtıyor, brew PHP ise **arm64**. Apache'ye PHP 8.4 modülü bağlanamıyor ("incompatible
architecture"). Ayrıca XAMPP PHP 8.0 ve MariaDB 10.4 ile geliyor — ikisi de Shopware 6.7 için
çok eski. Bu yüzden dosyalar htdocs'ta duruyor ama servisler brew'dan geliyor.
**XAMPP Control Panel'den Apache/MySQL başlatma** — çakışır.

**Neden PHP 8.4, 8.3 değil:** `composer install` PHP 8.4 ile çalıştırıldı, lock dosyası
Symfony 8.x bileşenlerini seçti ve bunlar `php >=8.4.1` istiyor.
8.3 ile `vendor/composer/platform_check.php` fatal error verir. (8.3 makinede kurulu — yanlışlıkla
ona geçme.) PHP'yi düşürmek istersen önce `composer update` çalıştır.

**Geri dönüş:** Eski DDEV kurulumu `~/Projects/24vapestore_shopware` altında ve docker
volume'ları (`24vapestore-mariadb`) duruyor. Gerekirse `cd ~/Projects/24vapestore_shopware && ddev start`.

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

Docker/DDEV yok. Komutlar doğrudan proje dizininde çalışır — `ddev` ön eki **kullanma**.

```bash
# Servisler (bir kere başlat, arka planda kalır — makine yeniden başlasa da açılır)
brew services start httpd        # web sunucu :8088
brew services start mysql@8.0    # veritabanı :3307
brew services start redis
brew services list               # durum kontrolü

# Site
open http://24vapestore.test:8088          # storefront
open http://24vapestore.test:8088/admin    # admin

# Shopware (proje kökünde)
php bin/console cache:clear
php bin/console plugin:refresh
php bin/console theme:compile
php bin/console dal:refresh:index

# Veritabanı
/opt/homebrew/opt/mysql@8.0/bin/mysql -h 127.0.0.1 -P 3307 -u root 24vapestore

# Kategori aktarımı (tekrar çalıştırılabilir; aynı isimli kategori atlanır)
php bin/console vape:import-categories            # önizleme
php bin/console vape:import-categories --write    # yaz

# Build (bu template'te bin/*.sh kullanılır, composer script'i YOK)
bin/build-administration.sh
bin/build-storefront.sh
bin/watch-administration.sh    # admin geliştirme sırasında
```

⚠️ `mysql` komutunu düz çağırırsan XAMPP'ın MariaDB'sine (port 3306) gider — yanlış DB.
Yukarıdaki tam yolu veya `-P 3307` bayrağını kullan.

⚠️ **`bin/build-administration.sh` composer'a dokunuyor.** 2026-07-22'de bir çalıştırmada
`composer.json`'u yeniden formatladı ve `swag/paypal` + `composer/composer` paketlerini
ekleyip indirdi (istenmemişti, geri alındı). Build'den sonra **her zaman
`git diff composer.json composer.lock` kontrol et**; beklenmedik paket varsa
`git checkout -- composer.json composer.lock` ile geri al ve `custom/plugins/` altındaki
istenmeyen plugin klasörünü sil.

⚠️ **Node sürümü:** Shopware admin build'i Node ≤25 istiyor, makinede Node 26 var.
Build `EBADENGINE` uyarısı verip yine de çalışıyor. Tuhaf build hatası görürsen
önce Node sürümünü şüphelen.

**Ne zaman ne gerekir:**
- Admin JS değişti (CMS element/block) → `bin/build-administration.sh` — cache clear İŞE YARAMAZ
- SCSS değişti → `bin/console theme:compile`
- Twig değişti (storefront) → dev'de bir şey gerekmez; prod'da `cache:clear`
- `theme.json` değişti → `theme:refresh` → `theme:compile` → admin'i hard-refresh
- PHP değişti (resolver, services.xml) → `bin/console cache:clear`
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
- **Mega menü kapsayıcısı `.navigation-flyout` DEĞİL**, Bootstrap `.dropdown-menu`
  (`.main-navigation-menu .dropdown-menu`). Linkler hâlâ `.navigation-flyout-link`.
  Yanlış selector → stiller sessizce uygulanmaz, hata da vermez
- Core arama formu `.collapse` içinde gelir; masaüstünde yüksekliği 0 kalır.
  992px üstünde `.collapse:not(.show){display:block}` gerekir

---

## Referans Desen: `vape-hero`

**Yeni CMS element yazarken bunu örnek al** — projedeki ilk ve doğrulanmış tam örnek.

```
custom/plugins/VapeStoreTheme/src/
├── DataResolver/HeroCmsElementResolver.php        # storefront'ta medyayı slot'a bağlar
├── Resources/config/services.xml                  # resolver'ı shopware.cms.data_resolver ile tag'ler
├── Resources/app/administration/src/
│   ├── main.js                                    # ⚠️ import edilmezse element GÖRÜNMEZ
│   ├── snippet/{de-DE,en-GB}.json                 # admin etiketleri
│   └── module/sw-cms/
│       ├── elements/vape-hero/{index,component,config,preview}
│       └── blocks/image/vape-hero/{index,component,preview}
├── Resources/app/storefront/src/scss/component/_hero.scss
└── Resources/views/storefront/
    ├── element/cms-element-vape-hero.html.twig    # ⚠️ dosya adı birebir
    └── block/cms-block-vape-hero.html.twig        # ⚠️ data-cms-element-id şart
```

Öğrenilenler:
- Admin'deki `entity` auto-collect **yalnızca editörde** çalışır. Storefront için PHP
  resolver şart, yoksa `element.data` boş gelir ve görsel hiç render edilmez
- Resolver'da core'un `ImageCmsElementResolver`'ı örnek alındı: slot'a `ImageStruct`
  set edilir, `MediaDefinition::class` ile criteria eklenir
- Snippet JSON'unda aynı anahtarı iki kez kullanma (biri string biri obje) — ikincisi
  ilkini sessizce ezer. `ctaVariant` (obje) ile `ctaVariantLabel` (string) bu yüzden ayrı
- Config panelinde her alan bir sarmalayıcı div içinde; `sw-tabs` `position-identifier` ister

---

## Kod Standartları

- **Core'a dokunma.** `vendor/shopware` altında hiçbir şey değiştirilmez.
  Override `sw_extends` + block override ile yapılır
- **Minimal override.** Tüm core template'i kopyalama; sadece gereken block'u ez,
  gerekiyorsa `{{ parent() }}` çağır
- **Token kullan.** SCSS'te magic hex veya magic px yok — `abstract/_tokens.scss`'ten al.
  Değer yoksa önce token ekle
- **Snippet kullan.** Kullanıcıya görünen string twig'e gömülmez
- **Erişilebilirlik.** Beyaz zeminde açık gri metin kolayca AA'nın altına düşer —
  WCAG AA kontrolü yap (gövde metni ≥4.5:1), odak göstergesi görünür olsun
- **Ölçek bilinci.** 4000 SKU var; listeleme sorgularında N+1'den kaçın, criteria'ya
  association'ları açıkça ekle
