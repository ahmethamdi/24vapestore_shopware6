/*
CMS Element: vape-hero
==================================================
Çoklu slide'lı hero slider. Her slide:
  - kendi arka plan rengi (sol panel)
  - etiket + üst başlık + büyük başlık (sol panel)
  - büyük görsel (sağ)
  - buton (metin + link)
  - 4 adede kadar ürün küçük resmi (sol panel altı)

Yönetici admin'den sınırsız slide ekler, sıralar, siler.

⚠️ slides bir DİZİ olarak `config.slides.value` içinde tutulur.
   Shopware CMS config'i JSON sakladığı için bu sorunsuz çalışır, ancak
   medya ve ürün ID'leri PHP resolver tarafından ayrıca çözümlenmelidir —
   `entity` auto-collect yalnızca düz (dizi olmayan) alanlarda çalışır.
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.
*/

Shopware.Component.register('vape-cms-el-preview-hero', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-hero', () => import('./config'));
Shopware.Component.register('vape-cms-el-hero', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-hero',
    label: 'vape-cms.elements.hero.label',
    component: 'vape-cms-el-hero',
    configComponent: 'vape-cms-el-config-hero',
    previewComponent: 'vape-cms-el-preview-hero',

    defaultConfig: {
        // --- slide'lar ---
        // Her eleman: {
        //   mediaId, eyebrow, kicker, headline, ctaText, ctaUrl, newTab,
        //   bgColor, textColor, productIds[]
        // }
        // Element sürüklendiğinde boş kutu yerine hazır bir slide gelsin —
        // yönetici ne düzenleyeceğini görsün. Görsel seçilmezse storefront
        // Shopware'in varsayılan CMS görselini gösterir.
        slides: {
            source: 'static',
            value: [
                {
                    mediaId: null,
                    eyebrow: '',
                    kicker: '',
                    headline: '',
                    ctaText: '',
                    ctaUrl: '',
                    newTab: false,
                    bgColor: '#18181d',
                    textColor: 'light',
                    productIds: [],
                },
            ],
        },

        // --- slider davranışı ---
        autoplay: {
            source: 'static',
            value: true,
        },
        autoplaySpeed: {
            source: 'static',
            value: 6000,      // ms
        },
        showArrows: {
            source: 'static',
            value: true,
        },
        showDots: {
            source: 'static',
            value: true,
        },
        showProducts: {
            source: 'static',
            value: true,
        },
        minHeight: {
            source: 'static',
            value: 520,       // px
        },
    },
});
