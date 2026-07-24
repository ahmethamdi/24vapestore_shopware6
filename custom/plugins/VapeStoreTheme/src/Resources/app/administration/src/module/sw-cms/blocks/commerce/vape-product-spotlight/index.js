/*
CMS Block: vape-product-spotlight
==================================================
`vape-product-spotlight` element'ini editöre sürüklenebilir tek bir birim olarak
sunar. Kategori: commerce. Tek slot.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-product-spotlight-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-product-spotlight', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-product-spotlight',
    label: 'vape-cms.blocks.productSpotlight.label',
    category: 'commerce',
    component: 'vape-cms-block-product-spotlight',
    previewComponent: 'vape-cms-preview-product-spotlight-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        productSpotlight: 'vape-product-spotlight',
    },
});
