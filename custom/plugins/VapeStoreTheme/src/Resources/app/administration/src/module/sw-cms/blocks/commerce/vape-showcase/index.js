/*
CMS Block: vape-showcase
==================================================
`vape-showcase` element'ini editöre sürüklenebilir tek bir birim olarak sunar.
Kategori "commerce", tek slot (banner + ürün ızgarası birleşik element).

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-showcase-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-showcase', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-showcase',
    label: 'vape-cms.blocks.showcase.label',
    category: 'commerce',
    component: 'vape-cms-block-showcase',
    previewComponent: 'vape-cms-preview-showcase-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        showcase: 'vape-showcase',
    },
});
