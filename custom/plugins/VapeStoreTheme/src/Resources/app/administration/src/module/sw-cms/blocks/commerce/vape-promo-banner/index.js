/*
CMS Block: vape-promo-banner
==================================================
`vape-promo-banner` element'ini editöre sürüklenebilir tek bir birim olarak sunar.

sizingMode `full_width` → banner sayfa kenarlarına kadar uzanır (nefes aldıran
tam genişlik vurgu şeridi). Kategori: commerce.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-promo-banner-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-promo-banner', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-promo-banner',
    label: 'vape-cms.blocks.promoBanner.label',
    category: 'commerce',
    component: 'vape-cms-block-promo-banner',
    previewComponent: 'vape-cms-preview-promo-banner-block',

    defaultConfig: {
        marginBottom: '0px',
        marginTop: '0px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'full_width',
    },

    slots: {
        promoBanner: 'vape-promo-banner',
    },
});
