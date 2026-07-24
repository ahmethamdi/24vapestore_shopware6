/*
CMS Element: vape-product-spotlight
==================================================
"Haftanın ürünü" — TEK ürünü büyük gösteren spotlight (ürün rayı DEĞİL).

Yerleşim:
  - Sol yarı: büyük ürün görseli (resolver ile product.cover)
  - Sağ yarı: eyebrow (kırmızı, "PRODUKT DER WOCHE") + büyük ürün adı +
    kısa açıklama (config) + fiyat + koyu CTA ("Jetzt entdecken")

Config:
  - productId  → tek ürün seçici (sw-entity-single-select)
  - eyebrow    → kırmızı üst etiket (statik metin; ürün adı değil)
  - description→ kısa açıklama (config'ten, ürünün kendi açıklaması değil)
  - ctaText    → buton metni
  - ctaUrl     → buton linki (boş bırakılırsa ürünün detay sayfasına düşer)

⚠️ PHP RESOLVER ŞART: productId'den ürün entity'si (cover + calculatedPrice)
   storefront için resolver'da yüklenir. `entity` auto-collect yalnızca
   editörde çalışır.
⚠️ FİYAT sales-channel context gerektirir → resolver sales_channel.product.
   repository kullanır. MARKA adı ayrı jenerik product.repository'den gelir
   (bu projede sales-channel deposu manufacturer'ı düşürüyor).
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-promo-banner (tek-slot, resolver'lı örnek) +
elements/vape-product-rail (sales-channel ürün yükleme).
*/

Shopware.Component.register('vape-cms-el-preview-product-spotlight', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-product-spotlight', () => import('./config'));
Shopware.Component.register('vape-cms-el-product-spotlight', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-product-spotlight',
    label: 'vape-cms.elements.productSpotlight.label',
    component: 'vape-cms-el-product-spotlight',
    configComponent: 'vape-cms-el-config-product-spotlight',
    previewComponent: 'vape-cms-el-preview-product-spotlight',

    defaultConfig: {
        // Tek ürün. entity tanımı editörde otomatik önizleme sağlar
        // (element.data.product); storefront için resolver çözer.
        productId: {
            source: 'static',
            value: null,
            entity: {
                name: 'product',
                criteria: (() => {
                    const criteria = new Shopware.Data.Criteria(1, 1);
                    criteria.addAssociation('cover');
                    return criteria;
                })(),
            },
        },

        // Kırmızı üst etiket — proje kuralında kırmızı SADECE rozet/işaret için.
        eyebrow: {
            source: 'static',
            value: 'Produkt der Woche',
        },

        // Kısa açıklama — ürünün kendi açıklaması değil, yönetici metni.
        description: {
            source: 'static',
            value: 'Unsere Empfehlung der Woche — ausgewählt vom 24VapeStore-Team.',
        },

        ctaText: {
            source: 'static',
            value: 'Jetzt entdecken',
        },

        // Boş bırakılırsa storefront ürünün detay sayfasına düşer.
        ctaUrl: {
            source: 'static',
            value: '',
        },
    },
});
