/*
CMS Element: vape-product-tabs
==================================================
Sekmeli ürün ızgarası — "bol ürünlü, dolu görünen section".

ÜST: config'ten gelen 2-4 SEKME (örn. "Bestseller", "Neu", "Sale"). Her
sekmenin bir etiketi ve bir ürün kaynağı var.
ALT: aktif sekmenin ürünleri responsive IZGARA (grid) olarak (slider DEĞİL) —
mobil 2, tablet 3, ≥1200px 4 sütun. Sekme sayısı × ~8 ürün = dolu görünüm.

Sekme geçişi storefront JS plugin ile (bir sekme aktifken diğer paneller gizli).
JS yüklenmezse İLK sekme görünür kalır (progressive enhancement).

Ürün kaynağı (her sekmenin `productSource` alanı):
  - 'static' (VARSAYILAN): sekmenin `products` ID dizisi
  - 'stream'  : sekmenin `productStreamId`'si + `limit`

⚠️ tabs DİZİ olarak config.tabs.value içinde tutulur. Admin `entity`
   auto-collect dizi içindeki ID'leri görmez — storefront için PHP resolver
   (ProductTabsCmsElementResolver) çözer.
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-featured-split (sekme config UI + ürün çözme).
*/

Shopware.Component.register('vape-cms-el-preview-product-tabs', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-product-tabs', () => import('./config'));
Shopware.Component.register('vape-cms-el-product-tabs', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-product-tabs',
    label: 'vape-cms.elements.productTabs.label',
    component: 'vape-cms-el-product-tabs',
    configComponent: 'vape-cms-el-config-product-tabs',
    previewComponent: 'vape-cms-el-preview-product-tabs',

    defaultConfig: {
        // ---------- başlık (opsiyonel) ----------
        headline: {
            source: 'static',
            value: '',
        },
        subline: {
            source: 'static',
            value: '',
        },

        // ---------- SEKMELER (etiket → ürün ızgarası) ----------
        // Element sürüklendiğinde 3 örnek sekme gelir ki yönetici yapıyı
        // görsün ve ürün seçsin. İlk sekme varsayılan aktif.
        tabs: {
            source: 'static',
            value: [
                {
                    label: '',
                    productSource: 'static', // 'static' | 'stream'
                    products: [],            // 'static' modu için ürün ID dizisi
                    productStreamId: null,   // 'stream' modu için
                    limit: 8,
                },
                {
                    label: '',
                    productSource: 'static',
                    products: [],
                    productStreamId: null,
                    limit: 8,
                },
                {
                    label: '',
                    productSource: 'static',
                    products: [],
                    productStreamId: null,
                    limit: 8,
                },
            ],
        },
    },
});
