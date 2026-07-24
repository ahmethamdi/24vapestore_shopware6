/*
CMS Block: vape-trust-bar
==================================================
`vape-trust-bar` element'ini editöre sürüklenebilir tek bir birim olarak sunar.
Kategori: commerce. Tek slot.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-trust-bar-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-trust-bar', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-trust-bar',
    label: 'vape-cms.blocks.trustBar.label',
    category: 'commerce',
    component: 'vape-cms-block-trust-bar',
    previewComponent: 'vape-cms-preview-trust-bar-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        trustBar: 'vape-trust-bar',
    },
});
