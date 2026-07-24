/*
CMS Element: vape-category-grid
==================================================
"Kategoriye göre alışveriş" — yatay kaydırılabilir kategori kartları şeridi.
Her kart bir MOZAİK: solda büyük kategori görseli, sağda dikey 3 küçük kare.
Kart altında kategori başlığı + ürün sayısı + "İncele" butonu.

Kardeş element `vape-category-carousel` ile aynı deseni paylaşır: kategori
seçici (sw-entity-single-select), PHP resolver ile storefront çözümlemesi,
config'te dizi olarak tutulan kartlar.

Yapı:
  - headline        → sol üstteki büyük başlık ("Kategoriye Göre Alışveriş")
  - showArrows      → sağ üstteki önceki/sonraki ok butonları
  - showProductCount→ kart altında ürün sayısı gösterilsin mi
  - categories[]    → sınırsız kategori kartı { categoryId, ctaText }

⚠️ categories bir DİZİ olarak `config.categories.value` içinde tutulur.
   `entity` auto-collect yalnızca düz (dizi olmayan) alanlarda çalışır, bu
   yüzden storefront için kategori entity'leri PHP resolver'da çözümlenir.
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-category-carousel + elements/vape-hero.
*/

Shopware.Component.register('vape-cms-el-preview-category-grid', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-category-grid', () => import('./config'));
Shopware.Component.register('vape-cms-el-category-grid', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-category-grid',
    label: 'vape-cms.elements.categoryGrid.label',
    component: 'vape-cms-el-category-grid',
    configComponent: 'vape-cms-el-config-category-grid',
    previewComponent: 'vape-cms-el-preview-category-grid',

    defaultConfig: {
        // --- başlık bölümü ---
        headline: {
            source: 'static',
            value: '',
        },

        // --- kategori kartları ---
        // Her eleman: { categoryId, ctaText }
        // Element sürüklendiğinde boş kutu yerine bir örnek kart gelir —
        // yönetici ne düzenleyeceğini görsün. Kategori seçilene kadar
        // storefront'ta o kart görünmez (resolver çözemez), patlamaz.
        categories: {
            source: 'static',
            value: [
                {
                    categoryId: null,
                    ctaText: '',
                },
            ],
        },

        // --- davranış ---
        showArrows: {
            source: 'static',
            value: true,
        },
        showProductCount: {
            source: 'static',
            value: true,
        },
    },
});
