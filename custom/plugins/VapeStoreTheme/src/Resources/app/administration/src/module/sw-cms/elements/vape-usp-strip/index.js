/*
CMS Element: vape-usp-strip
==================================================
Anasayfa gövdesine sürüklenen bilgi/güven şeridi. 3-4 sütun; her sütun
ikon + başlık + kısa metin. Örn. "Schneller Versand / Kostenlos ab 39€",
"Einfache Rückgabe / 14 Tage", "Sichere Zahlung / SSL",
"Top Bewertung / 4.8 Sterne".

⚠️ Bu, header'daki (theme.json'dan gelen top-bar) USP şeridinden FARKLIDIR.
   Header'a dokunmaz; bu tamamen CMS'ten düzenlenebilir ayrı bir element.

Yapı:
  - items[] → tekrarlanabilir dizi. Her eleman: { icon, title, text }
              icon = storefront sw_icon set'inden DOĞRULANMIŞ bir isim
              (truck, package-open, lock-closed, star, shield, heart,
               money-card, checkmark-circle, clock, medal, package-gift,
               thumb-up). Config'te mt-select ile seçilir.
  - Sütun sayısı config'te YOK: item sayısı kadar sütun, CSS responsive.

⚠️ items bir DİZİ olarak `config.items.value` içinde tutulur. Bu element
   entity yüklemez (medya/ürün yok) — PHP RESOLVER GEREKMEZ. Metin+ikon
   config'te düz durur, storefront `element.translated.config.items` ile okur.
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-category-carousel (dizi-tabanlı, resolver'lı örnek;
buradan resolver çıkarıldı çünkü entity yok).
*/

Shopware.Component.register('vape-cms-el-preview-usp-strip', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-usp-strip', () => import('./config'));
Shopware.Component.register('vape-cms-el-usp-strip', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-usp-strip',
    label: 'vape-cms.elements.uspStrip.label',
    component: 'vape-cms-el-usp-strip',
    configComponent: 'vape-cms-el-config-usp-strip',
    previewComponent: 'vape-cms-el-preview-usp-strip',

    defaultConfig: {
        // Her eleman: { icon, title, text }
        // Element sürüklendiğinde 3 örnek item seed'lenir; yönetici yapıyı
        // hemen görür. Başlığı boş bırakılan item storefront'ta render EDİLMEZ.
        items: {
            source: 'static',
            value: [
                { icon: 'truck', title: 'Schneller Versand', text: 'Kostenlos ab 39 €' },
                { icon: 'package-open', title: 'Einfache Rückgabe', text: '14 Tage Rückgaberecht' },
                { icon: 'lock-closed', title: 'Sichere Zahlung', text: 'SSL-verschlüsselt' },
            ],
        },
    },
});
