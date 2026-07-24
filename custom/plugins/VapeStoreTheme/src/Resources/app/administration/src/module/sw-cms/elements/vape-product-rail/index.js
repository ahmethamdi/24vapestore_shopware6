/*
CMS Element: vape-product-rail
==================================================
Başlıklı ürün rayı — bir başlık (+ opsiyonel alt satır) + ok navigasyon +
yatay kayan ÜRÜN kartları. Klasik "product slider" mantığı.

İki ürün kaynağı (productSource):
  - 'static' → manuel seçilmiş ürünler (products: ID dizisi)
  - 'stream' → bir product stream (productStreamId) + limit kadar ürün

⚠️ Ürün kartı SIFIRDAN yazılmaz: storefront'ta core'un
   `component/product/card/box.html.twig` kutusu include edilir — fiyat
   formatı, çeviri, indirim rozeti, wishlist hep core'dan gelir (N+1 yok,
   çok dilli sorun yok).

⚠️ Storefront için ürünler PHP resolver ile çözülür
   (ProductRailCmsElementResolver → element.data.products). Admin'deki
   `entity` auto-collect yalnızca editör önizlemesinde çalışır.

⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-category-carousel + core product-slider.
*/

Shopware.Component.register('vape-cms-el-preview-product-rail', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-product-rail', () => import('./config'));
Shopware.Component.register('vape-cms-el-product-rail', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-product-rail',
    label: 'vape-cms.elements.productRail.label',
    component: 'vape-cms-el-product-rail',
    configComponent: 'vape-cms-el-config-product-rail',
    previewComponent: 'vape-cms-el-preview-product-rail',

    defaultConfig: {
        // --- başlık bölümü ---
        headline: {
            source: 'static',
            value: '',
        },
        subline: {
            source: 'static',
            value: '',
        },

        // --- ürün kaynağı ---
        // 'static' | 'stream'
        productSource: {
            source: 'static',
            value: 'static',
        },

        // static mod: seçilen ürün ID'lerinin dizisi.
        // `entity` bildirilir → editör önizlemesinde element.data.products
        // otomatik dolar. Storefront için resolver ayrıca çözer.
        products: {
            source: 'static',
            value: [],
            entity: {
                name: 'product',
                criteria: (() => {
                    const criteria = new Shopware.Data.Criteria(1, 25);
                    criteria.addAssociation('cover');
                    criteria.addAssociation('options.group');
                    return criteria;
                })(),
            },
        },

        // stream mod: product_stream ID'si (tek).
        productStreamId: {
            source: 'static',
            value: null,
        },

        // stream modda gösterilecek ürün sayısı.
        limit: {
            source: 'static',
            value: 8,
        },

        // --- davranış ---
        showArrows: {
            source: 'static',
            value: true,
        },
    },
});
