/*
CMS Block: vape-banner-grid
==================================================
`vape-banner-grid` element'ini editöre sürüklenebilir tek bir birim olarak sunar.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar (`bannerGrid`) ile <slot name="bannerGrid"> ve storefront
   block twig'indeki getSlot('bannerGrid') BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-banner-grid-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-banner-grid', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-banner-grid',
    label: 'vape-cms.blocks.bannerGrid.label',
    category: 'commerce',
    component: 'vape-cms-block-banner-grid',
    previewComponent: 'vape-cms-preview-banner-grid-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        bannerGrid: 'vape-banner-grid',
    },
});
