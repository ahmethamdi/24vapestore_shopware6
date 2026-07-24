/*
CMS Element: vape-trust-bar
==================================================
Genişletilmiş güven şeridi. vape-usp-strip'ten DAHA ZENGİN: 4 kart tarzı kutu,
her biri BÜYÜK ikon + kalın başlık + alt açıklama satırı.

Örn. varsayılan içerik:
  "18+ Altersverifikation / Sicher & geprüft"
  "Blitzversand / Versand am selben Tag"
  "Original & authentisch / 100% Markenware"
  "Sichere Zahlung / SSL-verschlüsselt"

Yapı:
  - items[] → tekrarlanabilir dizi. Her eleman: { icon, title, text }
              icon = storefront sw_icon set'inden DOĞRULANMIŞ bir isim.
              Config'te mt-select ile seçilir.
  - Kutular ince kenarlıklı; zemin hafif gri / beyaz. Kırmızı YOK (güven şeridi).

⚠️ Bu element entity yüklemez (medya/ürün yok) — PHP RESOLVER GEREKMEZ.
   Metin+ikon config'te düz durur; storefront `element.translated.config.items`
   ile okur.
⚠️ 6.7: component'ler async factory ile kaydedilir.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-usp-strip (dizi-tabanlı, resolver'sız örnek).
*/

Shopware.Component.register('vape-cms-el-preview-trust-bar', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-trust-bar', () => import('./config'));
Shopware.Component.register('vape-cms-el-trust-bar', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-trust-bar',
    label: 'vape-cms.elements.trustBar.label',
    component: 'vape-cms-el-trust-bar',
    configComponent: 'vape-cms-el-config-trust-bar',
    previewComponent: 'vape-cms-el-preview-trust-bar',

    defaultConfig: {
        // Her eleman: { icon, title, text }
        // Element sürüklendiğinde 4 örnek kutu seed'lenir; yönetici yapıyı
        // hemen görür. Başlığı boş bırakılan item storefront'ta render EDİLMEZ.
        items: {
            source: 'static',
            value: [
                { icon: 'shield', title: '18+ Altersverifikation', text: 'Sicher & geprüft' },
                { icon: 'truck', title: 'Blitzversand', text: 'Versand am selben Tag' },
                { icon: 'medal', title: 'Original & authentisch', text: '100% Markenware' },
                { icon: 'lock-closed', title: 'Sichere Zahlung', text: 'SSL-verschlüsselt' },
            ],
        },
    },
});
