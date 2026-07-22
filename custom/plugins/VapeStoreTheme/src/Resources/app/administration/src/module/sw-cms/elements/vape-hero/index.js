/*
CMS Element: vape-hero
==================================================
Kampanya / hero bannerı. Görsel + başlık + alt metin + buton.

Mağaza yöneticisi admin'den şunları değiştirebilir:
  içerik → görsel, başlık, alt metin, buton yazısı, buton linki
  ayarlar → metin hizası, yükseklik, karartma oranı, buton stili

⚠️ 6.7: component'ler async factory ile kaydedilir — inline `template` DEĞİL.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.
*/

Shopware.Component.register('vape-cms-el-preview-hero', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-hero', () => import('./config'));
Shopware.Component.register('vape-cms-el-hero', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-hero',
    label: 'vape-cms.elements.hero.label',
    component: 'vape-cms-el-hero',
    configComponent: 'vape-cms-el-config-hero',
    previewComponent: 'vape-cms-el-preview-hero',

    defaultConfig: {
        // --- içerik ---
        // `entity` tanımı sayesinde admin tarafı medyayı otomatik yükler
        // (element.data.media). Storefront için PHP resolver gerekir.
        media: {
            source: 'static',
            value: null,
            required: false,
            entity: { name: 'media' },
        },
        headline: {
            source: 'static',
            value: '',
        },
        subline: {
            source: 'static',
            value: '',
        },
        ctaText: {
            source: 'static',
            value: '',
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
        textAlign: {
            source: 'static',
            value: 'left',      // left | center | right
        },
        verticalAlign: {
            source: 'static',
            value: 'center',    // flex-start | center | flex-end
        },
        minHeight: {
            source: 'static',
            value: 480,         // px
        },
        overlayOpacity: {
            source: 'static',
            value: 35,          // 0-80 arası, metin okunurluğu için karartma
        },
        textColor: {
            source: 'static',
            value: 'light',     // light | dark
        },
        ctaVariant: {
            source: 'static',
            value: 'primary',   // primary | secondary
        },
    },
});
