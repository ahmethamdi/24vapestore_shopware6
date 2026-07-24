/*
CMS Block: vape-category-carousel
==================================================
`vape-category-carousel` element'ini editöre sürüklenebilir tek bir birim
olarak sunar.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-category-carousel-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-category-carousel', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-category-carousel',
    label: 'vape-cms.blocks.categoryCarousel.label',
    category: 'commerce',
    component: 'vape-cms-block-category-carousel',
    previewComponent: 'vape-cms-preview-category-carousel-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        carousel: 'vape-category-carousel',
    },
});
