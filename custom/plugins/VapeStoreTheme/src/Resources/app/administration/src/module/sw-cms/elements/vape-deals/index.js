/*
CMS Element: vape-deals (Deals des Tages / günün fırsatları)
==================================================
Açık gri section + başlık; altında 3 KOYU kampanya kartı yan yana. Her kart:
  - ÜST: canlı geri sayım sayacı — 4 beyaz kutu (Tage/Stunden/Minuten/Sekunden).
         JS her saniye günceller (data-vape-deals-end="ISO"). Süre bitince
         "Abgelaufen".
  - ORTA: kampanya banner görseli — beyaz yuvarlak alan içinde (config mediaId,
          resolver ile batch yüklenir).
  - ALT: küçük gri marka etiketi + kalın ürün adı + fiyat + "Kaufen" butonu.

Config:
  - headline → section başlığı (statik metin)
  - eyebrow  → opsiyonel küçük kırmızı üst etiket
  - deals[]  → tekrarlı liste. Her item:
      { mediaId, brandLabel, title, price, url, endDate (ISO geri sayım hedefi) }
    Varsayılan 3 dolu demo item — element sürüklendiğinde yapı hemen görünür.

⚠️ PHP RESOLVER ŞART: deals[].mediaId'ler storefront için resolver'da TEK criteria
   ile batch yüklenir (N+1 yok) ve slot'a media map olarak yazılır. Dizi içindeki
   ID'leri admin `entity` auto-collect görmez.
⚠️ 6.7: component'ler async factory ile kaydedilir; initElementConfig() argümansız.
⚠️ Bu dosya main.js'te import edilmezse element admin'de sessizce görünmez.

Desen kaynağı: elements/vape-brand-slider (dizi + batch media resolver) +
elements/vape-trust-bar (dizi item yönetimi).
*/

Shopware.Component.register('vape-cms-el-preview-deals', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-deals', () => import('./config'));
Shopware.Component.register('vape-cms-el-deals', () => import('./component'));

/**
 * Varsayılan geri sayım hedefi: bugünden N gün sonra gece yarısı (ISO).
 * Sabit bir tarih gömmek yerine göreli üretilir; demo her zaman "canlı" görünür.
 */
function defaultEndDate(daysFromNow) {
    const d = new Date();
    d.setHours(23, 59, 59, 0);
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString();
}

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-deals',
    label: 'vape-cms.elements.deals.label',
    component: 'vape-cms-el-deals',
    configComponent: 'vape-cms-el-config-deals',
    previewComponent: 'vape-cms-el-preview-deals',

    defaultConfig: {
        headline: {
            source: 'static',
            value: 'Deals des Tages',
        },

        eyebrow: {
            source: 'static',
            value: '',
        },

        // Her item: { mediaId, brandLabel, title, price, url, endDate }
        // 3 dolu demo item — yönetici yapıyı hemen görür. Başlığı boş bırakılan
        // item storefront'ta render EDİLMEZ.
        deals: {
            source: 'static',
            value: [
                {
                    mediaId: null,
                    brandLabel: 'Elf Bar',
                    title: 'Elf Bar 600 – Blueberry',
                    price: '6,99 €',
                    url: '',
                    endDate: defaultEndDate(1),
                },
                {
                    mediaId: null,
                    brandLabel: 'Lost Mary',
                    title: 'Lost Mary BM600 – Watermelon',
                    price: '7,49 €',
                    url: '',
                    endDate: defaultEndDate(2),
                },
                {
                    mediaId: null,
                    brandLabel: 'Vaporesso',
                    title: 'Vaporesso XROS 3 Kit',
                    price: '19,99 €',
                    url: '',
                    endDate: defaultEndDate(3),
                },
            ],
        },
    },
});
