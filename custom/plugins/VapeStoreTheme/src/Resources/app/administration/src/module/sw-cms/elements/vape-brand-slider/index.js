/*
CMS Element: vape-brand-slider
==================================================
Marka logo şeridi — başlık + yatay kayan marka logoları. Güven verir
("Beliebte Marken": Elf Bar, Lost Mary, Vaporesso, SMOK, Uwell …).

Yapı:
  - headline  → üstte başlık; boşsa storefront "Beliebte Marken" snippet'ine düşer
  - brands[]  → sınırsız marka. Her eleman: { mediaId (logo), name, url }
  - showArrows→ ok butonları (CSS scroll-snap her koşulda çalışır)
  - grayscale → logolar gri, hover'da renkli (marka slider'larında yaygın)

⚠️ brands bir DİZİ olarak `config.brands.value` içinde tutulur. Admin'deki
   `entity` auto-collect yalnızca düz (dizi olmayan) alanlarda çalışır — dizi
   içindeki mediaId'leri görmez. Bu yüzden storefront için PHP resolver
   (BrandSliderCmsElementResolver) logoları TEK criteria ile çözer.
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-category-carousel (tekrarlanabilir dizi + medya çözme).
*/

Shopware.Component.register('vape-cms-el-preview-brand-slider', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-brand-slider', () => import('./config'));
Shopware.Component.register('vape-cms-el-brand-slider', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-brand-slider',
    label: 'vape-cms.elements.brandSlider.label',
    component: 'vape-cms-el-brand-slider',
    configComponent: 'vape-cms-el-config-brand-slider',
    previewComponent: 'vape-cms-el-preview-brand-slider',

    defaultConfig: {
        // Başlık — boşsa storefront snippet'ine ("Beliebte Marken") düşer.
        headline: {
            source: 'static',
            value: '',
        },

        // --- marka logoları ---
        // Her eleman: { mediaId, name, url }
        // Element sürüklendiğinde boş kutu yerine 4 örnek marka gelir — yönetici
        // yapıyı görsün. Logo/ad girilene kadar storefront'ta ada düşer, patlamaz.
        brands: {
            source: 'static',
            value: [
                { mediaId: null, name: '', url: '' },
                { mediaId: null, name: '', url: '' },
                { mediaId: null, name: '', url: '' },
                { mediaId: null, name: '', url: '' },
            ],
        },

        // --- davranış ---
        showArrows: {
            source: 'static',
            value: true,
        },

        // Logolar nötr gri, hover'da renklenir. Marka slider'larında yaygın.
        grayscale: {
            source: 'static',
            value: true,
        },
    },
});
