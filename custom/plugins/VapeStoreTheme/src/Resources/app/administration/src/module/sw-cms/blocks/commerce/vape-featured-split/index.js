/*
CMS Block: vape-featured-split
==================================================
`vape-featured-split` element'ini editöre sürüklenebilir tek bir birim
olarak sunar.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-featured-split-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-featured-split', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-featured-split',
    label: 'vape-cms.blocks.featuredSplit.label',
    category: 'commerce',
    component: 'vape-cms-block-featured-split',
    previewComponent: 'vape-cms-preview-featured-split-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        featuredSplit: 'vape-featured-split',
    },
});
