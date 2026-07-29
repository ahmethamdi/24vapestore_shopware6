import Plugin from 'src/plugin-system/plugin.class';

/**
 * Mobil alt gezinme — sepet rozeti senkronizasyonu
 * ==================================================
 * SORUN: `page.cart` yalnızca sepet/checkout sayfalarında dolu. Anasayfada,
 * PLP'de, PDP'de twig tarafında adet bilinmiyor → rozet basılamıyordu
 * (ölçüldü: header rozeti "1" gösterirken alt bar boştu).
 *
 * NEDEN core'un `[data-cart-widget]`'ı DOĞRUDAN kullanılamaz: CartWidgetPlugin
 * elemanın `innerHTML`'ini SUNUCU YANITIYLA TAMAMEN DEĞİŞTİRİYOR. Alt bar
 * öğemize o özniteliği koysaydık ikon+etiket markup'ımız silinir, yerine
 * header'ın sepet widget'ı gelirdi.
 *
 * ÇÖZÜM: Header zaten CartWidgetPlugin ile güncelleniyor. Biz o rozeti
 * İZLİYORUZ (MutationObserver) ve değeri alt bara yansıtıyoruz. Tek kaynak
 * header → iki yerde farklı sayı görünmesi imkânsız.
 *
 * JS yoksa: alt bar yine çalışır, yalnız rozet sepet sayfası dışında
 * görünmez (twig fallback'i). Bozulma yok — progressive enhancement.
 */
export default class VapeMobileNavPlugin extends Plugin {
    static options = {
        // Header'daki core sepet rozeti — kaynak
        headerBadgeSelector: '.header-cart-badge',
        // Header sepet widget'ı — AJAX ile yenilenen kapsayıcı
        headerWidgetSelector: '[data-cart-widget]',
        // Alt bardaki sepet ikonu (rozetin ekleneceği yer)
        iconSelector: '[data-vape-mobile-nav-cart-icon]',
        badgeClass: 'vape-mobile-nav__badge',
    };

    init() {
        this.iconEl = this.el.querySelector(this.options.iconSelector);

        if (!this.iconEl) {
            return;
        }

        this.headerWidget = document.querySelector(this.options.headerWidgetSelector);

        // İlk senkron (widget zaten yüklenmiş olabilir)
        this._sync();

        if (!this.headerWidget) {
            return;
        }

        // Header widget'ı AJAX ile yenilendiğinde tekrar senkronla.
        this.observer = new MutationObserver(() => this._sync());
        this.observer.observe(this.headerWidget, { childList: true, subtree: true });
    }

    destroy() {
        this.observer?.disconnect();
    }

    /**
     * Header rozetindeki sayıyı alt bara yansıtır.
     * Sayı yoksa/0 ise alt bardaki rozeti kaldırır.
     */
    _sync() {
        const source = document.querySelector(this.options.headerBadgeSelector);
        const count = source ? parseInt(source.textContent.trim(), 10) : 0;

        let badge = this.iconEl.querySelector(`.${this.options.badgeClass}`);

        if (!Number.isFinite(count) || count <= 0) {
            badge?.remove();
            return;
        }

        if (!badge) {
            badge = document.createElement('span');
            badge.className = this.options.badgeClass;
            this.iconEl.appendChild(badge);
        }

        badge.textContent = String(count);
    }
}
