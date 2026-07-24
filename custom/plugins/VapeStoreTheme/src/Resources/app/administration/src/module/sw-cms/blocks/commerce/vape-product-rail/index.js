/*
CMS Block: vape-product-rail
==================================================
`vape-product-rail` element'ini editöre sürüklenebilir tek bir birim olarak
sunar. Kategori "commerce", tek slot.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-product-rail-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-product-rail', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-product-rail',
    label: 'vape-cms.blocks.productRail.label',
    category: 'commerce',
    component: 'vape-cms-block-product-rail',
    previewComponent: 'vape-cms-preview-product-rail-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        rail: 'vape-product-rail',
    },
});
