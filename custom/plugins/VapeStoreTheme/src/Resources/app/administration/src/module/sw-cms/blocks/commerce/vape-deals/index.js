/*
CMS Block: vape-deals
==================================================
`vape-deals` element'ini editöre sürüklenebilir tek bir birim olarak sunar.

⚠️ 6.7 BREAKING: block'un `component` alanı artık DİKKATE ALINIYOR.
   Yanlış component adı → yanlış component render eder veya hiçbir şey.
⚠️ slots içindeki anahtar (`deals`) ile <slot name="deals"> ve storefront
   block twig'indeki getSlot('deals') BİREBİR aynı olmalı.
*/

Shopware.Component.register('vape-cms-preview-deals-block', () => import('./preview'));
Shopware.Component.register('vape-cms-block-deals', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'vape-deals',
    label: 'vape-cms.blocks.deals.label',
    category: 'commerce',
    component: 'vape-cms-block-deals',
    previewComponent: 'vape-cms-preview-deals-block',

    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '0px',
        marginRight: '0px',
        sizingMode: 'boxed',
    },

    slots: {
        deals: 'vape-deals',
    },
});
