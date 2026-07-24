/*
CMS Element: vape-banner-grid (kampanya banner grid)
==================================================
Yan yana 2-3 kompakt kampanya banner kutusu. Kullanıcı "bol bol banner alanları"
istiyor; bu element modüler, tekrar tekrar sürüklenebilir banner grid'i sağlar.

Her banner tıklanabilir kart (<a>): arka plan görseli üstünde koyu gradient
overlay + metin. aboutyou.de kategori-banner grid estetiği. Beyaz zemin +
kırmızı CTA/vurgu.

Grid: mobil 1 sütun → ≥768px 2 sütun → 3+ banner varsa ≥992px 3 sütun.

Config:
  - banners[] → tekrarlı liste. Her item:
      { mediaId, eyebrow, title, text, ctaText, url }
    Varsayılan 3 dolu demo item — element sürüklendiğinde yapı hemen görünür.
    Görselsiz item nötr gradient placeholder (kırmızı işaret çizgisi) gösterir.
    Tamamen boş item storefront'ta render EDİLMEZ.

⚠️ PHP RESOLVER ŞART: banners[].mediaId'ler storefront için resolver'da TEK
   criteria ile batch yüklenir (N+1 yok) ve slot'a media map olarak yazılır.
   Dizi içindeki ID'leri admin `entity` auto-collect görmez.
⚠️ 6.7: component'ler async factory ile kaydedilir; initElementConfig() argümansız.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-deals (dizi + batch media resolver + item yönetimi)
+ elements/vape-promo-banner (görsel + overlay + CTA banner dili).
*/

Shopware.Component.register('vape-cms-el-preview-banner-grid', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-banner-grid', () => import('./config'));
Shopware.Component.register('vape-cms-el-banner-grid', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-banner-grid',
    label: 'vape-cms.elements.bannerGrid.label',
    component: 'vape-cms-el-banner-grid',
    configComponent: 'vape-cms-el-config-banner-grid',
    previewComponent: 'vape-cms-el-preview-banner-grid',

    defaultConfig: {
        // Her item: { mediaId, eyebrow, title, text, ctaText, url }
        // 3 dolu demo item — yönetici yapıyı hemen görür. Tamamen boş bırakılan
        // item storefront'ta render EDİLMEZ.
        banners: {
            source: 'static',
            value: [
                {
                    mediaId: null,
                    eyebrow: 'Neu',
                    title: 'Einweg E-Zigaretten',
                    text: 'Sofort startklar, ohne Nachfüllen',
                    ctaText: 'Jetzt entdecken',
                    url: '',
                },
                {
                    mediaId: null,
                    eyebrow: 'Bestseller',
                    title: 'Liquids & Aromen',
                    text: 'Über 500 Sorten auf Lager',
                    ctaText: 'Zur Auswahl',
                    url: '',
                },
                {
                    mediaId: null,
                    eyebrow: 'Angebot',
                    title: 'Pods & Kits',
                    text: 'Top-Marken zu Top-Preisen',
                    ctaText: 'Sparen',
                    url: '',
                },
            ],
        },
    },
});
