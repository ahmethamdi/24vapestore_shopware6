/*
CMS Block: vape-brand-slider
==================================================
`vape-brand-slider` element'ini editöre sürüklenebilir tek bir birim
olarak sunar.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-brand-slider-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-brand-slider', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-brand-slider',
    label: 'vape-cms.blocks.brandSlider.label',
    category: 'commerce',
    component: 'vape-cms-block-brand-slider',
    previewComponent: 'vape-cms-preview-brand-slider-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        brands: 'vape-brand-slider',
    },
});
