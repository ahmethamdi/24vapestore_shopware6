/*
CMS Block: vape-hero
==================================================
`vape-hero` element'ini editöre sürüklenebilir tek bir birim olarak sunar.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar ile <slot name="..."> BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-hero-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-hero', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-hero',
    label: 'vape-cms.blocks.hero.label',
    category: 'image',
    component: 'vape-cms-block-hero',
    previewComponent: 'vape-cms-preview-hero-block',

    defaultConfig: {
        marginBottom: '0px',
        marginTop: '0px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'full_width',
    },

    slots: {
        hero: 'vape-hero',
    },
});
