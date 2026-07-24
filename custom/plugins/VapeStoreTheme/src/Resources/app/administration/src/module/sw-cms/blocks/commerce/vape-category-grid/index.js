/*
CMS Block: vape-category-grid
==================================================
`vape-category-grid` element'ini editöre sürüklenebilir tek bir birim
olarak sunar.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-category-grid-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-category-grid', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-category-grid',
    label: 'vape-cms.blocks.categoryGrid.label',
    category: 'commerce',
    component: 'vape-cms-block-category-grid',
    previewComponent: 'vape-cms-preview-category-grid-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        grid: 'vape-category-grid',
    },
});
