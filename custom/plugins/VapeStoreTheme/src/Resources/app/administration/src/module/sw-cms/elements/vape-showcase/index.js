/*
CMS Element: vape-showcase
==================================================
Vitrin — solda büyük kampanya banner + sağda 4'lü ürün ızgarası (2x2). "Bol
banner + bol ürün" tek section'da: banner nefes/vurgu, ızgara alışverişe çağrı.

İki içerik BİRLEŞİK:
  A) SOL BANNER (≥992px ~40%): arka plan görseli (mediaId) + koyu overlay +
     eyebrow + başlık + alt metin + CTA (link, yeni sekme seçeneği). Görsel
     opsiyonel; yoksa düz zemin rengi + örnek metin.
  B) SAĞ IZGARA (~60%): ürünler 2x2. İki kaynak (productSource):
       - 'static' → manuel seçilmiş ürünler (products: ID dizisi)
       - 'stream' → bir product stream (productStreamId) + limit (vars. 4)

Mobilde: banner üstte tam genişlik, altında ürünler 2 sütun.

⚠️ Ürün kartı SIFIRDAN yazılmaz: storefront'ta core'un
   `component/product/card/box.html.twig` kutusu include edilir.
⚠️ Storefront için HEM görsel HEM ürün PHP resolver ile çözülür
   (ShowcaseCmsElementResolver → element.data.products + element.data.ext.bannerMedia).
   Admin'deki `entity` auto-collect yalnızca editör önizlemesinde çalışır.
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-product-rail (ürün kaynağı) + vape-promo-banner (banner).
*/

Shopware.Component.register('vape-cms-el-preview-showcase', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-showcase', () => import('./config'));
Shopware.Component.register('vape-cms-el-showcase', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-showcase',
    label: 'vape-cms.elements.showcase.label',
    component: 'vape-cms-el-showcase',
    configComponent: 'vape-cms-el-config-showcase',
    previewComponent: 'vape-cms-el-preview-showcase',

    defaultConfig: {
        // ================= SOL BANNER =================
        // Arka plan görseli opsiyonel; storefront için resolver çözer.
        // entity tanımı editörde otomatik önizleme sağlar (element.data.media).
        mediaId: {
            source: 'static',
            value: null,
            entity: { name: 'media' },
        },
        bgColor: {
            source: 'static',
            value: '#18181d',   // koyu nötr — beyaz metin üstünde okunur
        },
        overlayOpacity: {
            source: 'static',
            value: 45,          // 0-100; görsel üstü okunabilirlik için koyu overlay
        },

        eyebrow: {
            source: 'static',
            value: 'Kampagne',
        },
        title: {
            source: 'static',
            value: 'Bestseller im Fokus',
        },
        text: {
            source: 'static',
            value: 'Unsere beliebtesten Produkte — jetzt entdecken.',
        },
        ctaText: {
            source: 'static',
            value: 'Alle ansehen',
        },
        ctaUrl: {
            source: 'static',
            value: '',
        },
        newTab: {
            source: 'static',
            value: false,
        },

        // ================= SAĞ IZGARA (ÜRÜNLER) =================
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

        // Sağ ızgarada gösterilecek ürün sayısı (2x2 = 4 varsayılan).
        limit: {
            source: 'static',
            value: 4,
        },
    },
});
