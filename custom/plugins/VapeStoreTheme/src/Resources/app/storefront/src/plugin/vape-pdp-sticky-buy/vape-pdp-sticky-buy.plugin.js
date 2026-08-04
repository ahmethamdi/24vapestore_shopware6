import Plugin from 'src/plugin-system/plugin.class';

/**
 * PDP mobil sticky satın alma barı
 * ==================================================
 * Ana "In den Warenkorb" butonu ekrandan çıkınca alttaki barı gösterir,
 * geri görününce gizler.
 *
 * Neden IntersectionObserver: scroll olayını dinlemek her karede JS
 * çalıştırır ve kaydırmayı takılmalı hissettirir. Observer, butonun
 * görünürlüğünü tarayıcının kendi katmanında izler — bedava.
 * (Aynı gerekçe vape-sticky-header'da da geçerli.)
 *
 * ⚠️ Bar, core satın alma formuna `form="..."` özniteliğiyle BAĞLIDIR,
 *    kendi formu yoktur. Bu yüzden burada submit mantığı YOK — miktar,
 *    varyant ve gizli alanlar tek kaynaktan (core form) gelir.
 *
 * ⚠️ Erişilebilirlik: bar gizliyken `aria-hidden="true"` ve
 *    `visibility: hidden` (SCSS) — ekran okuyucu ve klavye sırası dışında
 *    kalır. Görünür olduğunda ikisi de kaldırılır. Sadece opacity ile
 *    gizlemek butonu klavyeyle odaklanabilir bırakırdı.
 */
export default class VapePdpStickyBuyPlugin extends Plugin {
    static options = {
        visibleClass: 'is-visible',
        // İzlenen öğe: core PDP satın alma butonu
        triggerSelector: '.btn-buy',
        // Butonun TAMAMI görünmeli ki "ekranda" sayılsın. 0 olsaydı
        // 1px görünen buton bile bar'ı gizlerdi.
        threshold: 1,
        // ⚠️ ÖLÇÜLDÜ (390×844): satın alma butonu y=760–812, mobil alt
        //    gezinme barı y=779'dan başlıyor → buton sayfa AÇILIŞINDA
        //    zaten alt barın altında kısmen gizli. Bu yüzden gözlem alanı
        //    alttan alt bar yüksekliği kadar kısaltılır: butonun alt barın
        //    ARDINDA kalan kısmı "görünür" sayılmaz ve sticky bar doğru
        //    şekilde daha en baştan devreye girer.
        //    Değer alt bar yüksekliği (64px) + küçük pay.
        rootMarginBottom: '-72px',
    };

    init() {
        this.trigger = document.querySelector(this.options.triggerSelector);

        // Satın alma butonu yoksa (satılamaz ürün) bar da gereksiz
        if (!this.trigger) {
            this.el.remove();
            return;
        }

        this._observe();
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    _observe() {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // Buton ekranda → bar gizli; ekrandan çıktı → bar görünür
                    this._toggle(!entry.isIntersecting);
                });
            },
            {
                threshold: this.options.threshold,
                rootMargin: `0px 0px ${this.options.rootMarginBottom} 0px`,
            }
        );

        this.observer.observe(this.trigger);
    }

    _toggle(visible) {
        this.el.classList.toggle(this.options.visibleClass, visible);
        // aria-hidden görünürlükle senkron kalmalı — yoksa ekran okuyucu
        // ekranda olmayan bir butonu duyurur.
        this.el.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
}
