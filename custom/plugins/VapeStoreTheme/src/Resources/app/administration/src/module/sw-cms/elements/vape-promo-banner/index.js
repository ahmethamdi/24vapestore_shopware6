/*
CMS Element: vape-promo-banner
==================================================
Tam genişlik promosyonel banner. Kategoriler arasında nefes aldıran vurgu şeridi.

Yapı:
  - arka plan görseli (opsiyonel) VEYA düz renk zemin
  - görsel üstünde okunabilirlik için koyu overlay (ayarlanabilir opaklık)
  - eyebrow (küçük etiket) + büyük başlık + alt metin
  - CTA butonu (metin + link, yeni sekme seçeneği)
  - metin rengi (light/dark) ve hizalama (left/center)

Görsel seçilmese bile düz renk + örnek metinle anlamlı render olur.

⚠️ Arka plan görseli var → PHP resolver (PromoBannerCmsElementResolver) ŞART.
   `entity` auto-collect yalnızca editörde çalışır; storefront için mediaId
   resolver'da ImageStruct'a çözümlenir.
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.
*/

Shopware.Component.register('vape-cms-el-preview-promo-banner', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-promo-banner', () => import('./config'));
Shopware.Component.register('vape-cms-el-promo-banner', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-promo-banner',
    label: 'vape-cms.elements.promoBanner.label',
    component: 'vape-cms-el-promo-banner',
    configComponent: 'vape-cms-el-config-promo-banner',
    previewComponent: 'vape-cms-el-preview-promo-banner',

    defaultConfig: {
        // --- arka plan ---
        // Görsel opsiyonel; storefront için resolver çözer.
        // entity tanımı editörde otomatik önizleme sağlar (element.data.media).
        mediaId: {
            source: 'static',
            value: null,
            entity: { name: 'media' },
        },
        bgColor: {
            source: 'static',
            value: '#18181d',   // koyu nötr — beyaz metin üstünde okunur
        },
        overlayOpacity: {
            source: 'static',
            value: 40,          // 0-100; görsel üstü okunabilirlik için koyu overlay
        },

        // --- içerik (element sürüklendiğinde örnek metinlerle seed) ---
        eyebrow: {
            source: 'static',
            value: 'Neue Saison',
        },
        headline: {
            source: 'static',
            value: 'Bis zu 20% Rabatt',
        },
        text: {
            source: 'static',
            value: 'Entdecke ausgewählte Marken zu Aktionspreisen — nur für kurze Zeit.',
        },
        ctaText: {
            source: 'static',
            value: 'Jetzt entdecken',
        },
        ctaUrl: {
            source: 'static',
            value: '',
        },
        newTab: {
            source: 'static',
            value: false,
        },

        // --- görünüm ---
        textColor: {
            source: 'static',
            value: 'light',     // 'light' | 'dark' — koyu banner üstünde beyaz metin
        },
        align: {
            source: 'static',
            value: 'left',      // 'left' | 'center'
        },
    },
});
