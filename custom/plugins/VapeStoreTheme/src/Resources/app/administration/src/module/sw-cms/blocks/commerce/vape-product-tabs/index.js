/*
CMS Block: vape-product-tabs
==================================================
`vape-product-tabs` element'ini editöre sürüklenebilir tek bir birim olarak
sunar.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ('productTabs') ile storefront block twig'indeki
   `block.slots.getSlot('productTabs')` BİREBİR aynı olmalı. Seed de bu adı kullanır.
*/

Shopware.Component.register('vape-cms-preview-product-tabs-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-product-tabs', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-product-tabs',
    label: 'vape-cms.blocks.productTabs.label',
    category: 'commerce',
    component: 'vape-cms-block-product-tabs',
    previewComponent: 'vape-cms-preview-product-tabs-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        productTabs: 'vape-product-tabs',
    },
});
