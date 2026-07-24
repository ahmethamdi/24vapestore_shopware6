/*
CMS Block: vape-usp-strip
==================================================
`vape-usp-strip` element'ini editöre sürüklenebilir tek bir birim olarak sunar.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-usp-strip-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-usp-strip', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-usp-strip',
    label: 'vape-cms.blocks.uspStrip.label',
    category: 'commerce',
    component: 'vape-cms-block-usp-strip',
    previewComponent: 'vape-cms-preview-usp-strip-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        strip: 'vape-usp-strip',
    },
});
