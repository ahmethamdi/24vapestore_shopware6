/*
CMS Element: vape-category-carousel
==================================================
Yatay kaydırılabilir kategori kartları şeridi.

Yapı:
  - eyebrow      → üstte küçük büyük harfli etiket
  - headline     → büyük başlık
  - highlightText→ başlıkta kırmızı vurguyla işaretlenecek kelime öbeği
  - categories[] → sınırsız kategori kartı (kategori + rozet + CTA metni)
  - showArrows   → ok butonları (CSS scroll-snap her koşulda çalışır)

⚠️ categories bir DİZİ olarak `config.categories.value` içinde tutulur.
   Shopware CMS config'i JSON sakladığı için sorunsuz, ancak kategori
   entity'leri PHP resolver tarafından ayrıca çözümlenmelidir —
   `entity` auto-collect yalnızca düz (dizi olmayan) alanlarda çalışır.
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-hero (projedeki doğrulanmış tam örnek).
*/

Shopware.Component.register('vape-cms-el-preview-category-carousel', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-category-carousel', () => import('./config'));
Shopware.Component.register('vape-cms-el-category-carousel', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-category-carousel',
    label: 'vape-cms.elements.categoryCarousel.label',
    component: 'vape-cms-el-category-carousel',
    configComponent: 'vape-cms-el-config-category-carousel',
    previewComponent: 'vape-cms-el-preview-category-carousel',

    defaultConfig: {
        // --- başlık bölümü ---
        eyebrow: {
            source: 'static',
            value: '',
        },
        headline: {
            source: 'static',
            value: '',
        },
        // Başlık içinde bulunup <mark> ile sarılacak kelime öbeği.
        // Boşsa başlık düz gösterilir.
        highlightText: {
            source: 'static',
            value: '',
        },

        // --- kategori kartları ---
        // Her eleman: { categoryId, badge, ctaText }
        // Element sürüklendiğinde boş kutu yerine bir örnek kart gelir —
        // yönetici ne düzenleyeceğini görsün. Kategori seçilene kadar
        // storefront'ta o kart görünmez (resolver çözemez), patlamaz.
        categories: {
            source: 'static',
            value: [
                {
                    categoryId: null,
                    badge: '',
                    ctaText: '',
                },
            ],
        },

        // --- davranış ---
        showArrows: {
            source: 'static',
            value: true,
        },
    },
});
