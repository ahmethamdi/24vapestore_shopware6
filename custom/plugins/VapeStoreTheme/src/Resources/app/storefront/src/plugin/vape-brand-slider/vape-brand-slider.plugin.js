import Plugin from 'src/plugin-system/plugin.class';

/**
 * Marka slider
 * ==================================================
 * Bağımlılıksız, hafif yatay kaydırma. Şerit zaten CSS scroll-snap ile
 * kaydırılabilir; bu plugin yalnızca ok butonlarını bağlar ve okların
 * etkinlik durumunu (başta/sonda gri) günceller.
 *
 * JS yüklenmese de:
 *   - şerit dokunmatik/trackpad ile kaydırılabilir (CSS)
 *   - marka linkleri gerçek <a>, klavyeyle gezilebilir
 * Bu yüzden plugin "progressive enhancement" — olmazsa da slider çalışır.
 *
 * Desen kaynağı: vape-category-carousel.plugin.
 */
export default class VapeBrandSliderPlugin extends Plugin {
    static options = {
        trackSelector: '[data-vape-brand-slider-track]',
        prevSelector: '[data-vape-brand-slider-prev]',
        nextSelector: '[data-vape-brand-slider-next]',
        disabledClass: 'is--disabled',
        // Bir tık kaç kaydırsın (görünür alanın ~%80'i)
        scrollRatio: 0.8,
    };

    init() {
        this.track = this.el.querySelector(this.options.trackSelector);
        this.prev = this.el.querySelector(this.options.prevSelector);
        this.next = this.el.querySelector(this.options.nextSelector);

        if (!this.track) {
            return;
        }

        this._registerEvents();
        this._updateArrows();
    }

    _registerEvents() {
        if (this.prev) {
            this.prev.addEventListener('click', () => this._scrollByStep(-1));
        }
        if (this.next) {
            this.next.addEventListener('click', () => this._scrollByStep(1));
        }

        this.track.addEventListener('scroll', () => {
            window.requestAnimationFrame(() => this._updateArrows());
        }, { passive: true });

        window.addEventListener('resize', () => this._updateArrows(), { passive: true });
    }

    _scrollByStep(direction) {
        const amount = Math.round(this.track.clientWidth * this.options.scrollRatio);
        this.track.scrollBy({ left: amount * direction, behavior: 'smooth' });
    }

    _updateArrows() {
        const maxScroll = this.track.scrollWidth - this.track.clientWidth;
        const atStart = this.track.scrollLeft <= 1;
        const atEnd = this.track.scrollLeft >= maxScroll - 1;

        this._toggle(this.prev, atStart);
        this._toggle(this.next, atEnd || maxScroll <= 0);
    }

    _toggle(button, disabled) {
        if (!button) {
            return;
        }
        button.classList.toggle(this.options.disabledClass, disabled);
        button.disabled = disabled;
    }
}
