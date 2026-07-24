/*
CMS Element: vape-featured-split
==================================================
Öne çıkanlar bölümü — SEKME (tab) tabanlı iki sütunlu layout.

SOL SÜTUN (metin/sekme/CTA):
  - eyebrow      → küçük büyük harfli etiket ("SEZONLUK")
  - headline     → büyük başlık
  - description  → kısa açıklama paragrafı
  - tabs[]       → dikey SEKME listesi. Her sekme bir KATEGORİ'dir; tıklanınca
                   sağdaki ürün slider'ı o sekmenin ürünlerine geçer.
                   Her eleman:
                     { categoryId, label, productSource, products,
                       productStreamId, limit }
  - ctaText/ctaUrl → en altta koyu dolgulu CTA ("Alle Produkte ansehen")

SAĞ SÜTUN (ürün slider'ı):
  - Aktif sekmenin ürünlerinden oluşan yatay kart slider'ı. Ürün kartları
    core'un `component/product/card/box.html.twig` kutusuyla render edilir.
  - Tüm sekmelerin ürünleri storefront'ta önceden render edilir (aktif panel
    görünür, diğerleri gizli); sekme geçişi client-side JS ile — sunucuya
    gidiş-dönüş YOK.

Ürün kaynağı (her sekmenin `productSource` alanı):
  - 'category' (VARSAYILAN): kategorinin + alt ağacının ürünleri
  - 'static'  : sekmenin `products` ID dizisi
  - 'stream'  : sekmenin `productStreamId`'si

⚠️ tabs DİZİ olarak config.tabs.value içinde tutulur. Admin `entity`
   auto-collect dizi içindeki ID'leri görmez — storefront için PHP resolver
   çözer.
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-product-rail (ürün çözme) + eski featured-split.
*/

Shopware.Component.register('vape-cms-el-preview-featured-split', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-featured-split', () => import('./config'));
Shopware.Component.register('vape-cms-el-featured-split', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-featured-split',
    label: 'vape-cms.elements.featuredSplit.label',
    component: 'vape-cms-el-featured-split',
    configComponent: 'vape-cms-el-config-featured-split',
    previewComponent: 'vape-cms-el-preview-featured-split',

    defaultConfig: {
        // ---------- SOL SÜTUN metin ----------
        eyebrow: {
            source: 'static',
            value: '',
        },
        headline: {
            source: 'static',
            value: '',
        },
        description: {
            source: 'static',
            value: '',
        },
        ctaText: {
            source: 'static',
            value: '',
        },
        ctaUrl: {
            source: 'static',
            value: '',
        },

        // ---------- SEKMELER (kategori → ürün slider'ı) ----------
        // Element sürüklendiğinde 2 örnek sekme gelir (categoryId null) ki
        // yönetici yapıyı görsün ve kategori seçsin. İlk sekme varsayılan aktif.
        tabs: {
            source: 'static',
            value: [
                {
                    categoryId: null,
                    label: '',            // boşsa kategori adı kullanılır
                    productSource: 'category',
                    products: [],         // 'static' modu için ürün ID dizisi
                    productStreamId: null,// 'stream' modu için
                    limit: 8,
                },
                {
                    categoryId: null,
                    label: '',
                    productSource: 'category',
                    products: [],
                    productStreamId: null,
                    limit: 8,
                },
            ],
        },
    },
});
