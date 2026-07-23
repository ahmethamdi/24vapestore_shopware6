import Plugin from 'src/plugin-system/plugin.class';

/**
 * Sticky header
 * ==================================================
 * Sayfa aşağı kaydırıldığında header'ı üstte sabitler ve inceltir.
 *
 * Neden IntersectionObserver: scroll olayını dinlemek her karede JS
 * çalıştırır ve kaydırmayı takılmalı hissettirir. Observer, header'ın
 * görünürlüğünü tarayıcının kendi katmanında izler — bedava.
 *
 * Yer tutucu: header `position: fixed` olunca akıştan çıkar ve içerik
 * yukarı zıplar. Bunu önlemek için aynı yükseklikte bir boşluk bırakılır.
 */
export default class VapeStickyHeaderPlugin extends Plugin {
    static options = {
        stickyClass: 'is--header-sticky',
        headerSelector: '.header-main',
        navSelector: '.nav-main',
        // Bu eşiği geçince sticky devreye girer (px)
        offset: 10,
    };

    init() {
        this.header = document.querySelector(this.options.headerSelector);
        this.nav = document.querySelector(this.options.navSelector);

        if (!this.header) {
            return;
        }

        this._createSentinel();
        this._createSpacer();
        this._observe();

        // Pencere yeniden boyutlandığında yükseklikler değişir
        this._onResize = this._onResize.bind(this);
        window.addEventListener('resize', this._onResize, { passive: true });
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        window.removeEventListener('resize', this._onResize);
        this.sentinel?.remove();
        this.spacer?.remove();
        document.body.classList.remove(this.options.stickyClass);
    }

    /**
     * Header'ın hemen üstüne görünmez bir işaretçi koyar. Bu işaretçi
     * ekrandan çıktığında header sabitlenir.
     */
    _createSentinel() {
        this.sentinel = document.createElement('div');
        this.sentinel.className = 'vape-header-sentinel';
        this.sentinel.setAttribute('aria-hidden', 'true');

        // Yüksekliği olmayan bir eleman IntersectionObserver için güvenilir
        // değil (0px kutu, threshold 0 ile hemen "kesişmiyor" sayılabilir).
        // Kaydırma eşiği kadar yükseklik veriyoruz: bu blok tamamen ekrandan
        // çıktığında sticky devreye girer.
        //
        // ÖNEMLİ: sentinel akıştan ÇIKARILIR (position: absolute), yoksa
        // header'ın üstünde 10px'lik gerçek bir boşluk bırakıyordu (USP
        // şeridinin üstünde görünen boşluk buydu). Absolute + top:0 ile
        // sayfanın en tepesine biner, yer kaplamaz, observer yine çalışır.
        this.sentinel.style.position = 'absolute';
        this.sentinel.style.top = '0';
        this.sentinel.style.left = '0';
        this.sentinel.style.width = '100%';
        this.sentinel.style.height = `${this.options.offset}px`;
        this.sentinel.style.pointerEvents = 'none';

        this.header.parentNode.insertBefore(this.sentinel, this.header);
    }

    _createSpacer() {
        this.spacer = document.createElement('div');
        this.spacer.className = 'vape-header-spacer';
        this.spacer.setAttribute('aria-hidden', 'true');
        this.spacer.style.display = 'none';

        const last = this.nav || this.header;
        last.parentNode.insertBefore(this.spacer, last.nextSibling);
    }

    _observe() {
        this.observer = new IntersectionObserver(
            ([entry]) => this._toggle(!entry.isIntersecting),
            { threshold: 0 }
        );

        this.observer.observe(this.sentinel);
    }

    _toggle(sticky) {
        if (sticky === this.isSticky) {
            return;
        }
        this.isSticky = sticky;

        document.body.classList.toggle(this.options.stickyClass, sticky);

        if (sticky) {
            // Yükseklik ölçümü bir sonraki frame'e ertelenir. `stickyClass`
            // eklenince header küçülüyor (logo/arama/padding daralıyor) ama
            // bu boyut değişikliği HENÜZ reflow olmadan offsetHeight okunursa
            // ESKİ (kalın) yükseklik ölçülür. O zaman nav `top` değeri fazla
            // büyük olur ve header ile nav arasında boşluk kalır (koyu bant).
            // rAF ile küçülme uygulandıktan SONRA ölçüyoruz.
            this.spacer.style.display = 'block';
            window.requestAnimationFrame(() => this._applyHeights());
        } else {
            this.spacer.style.display = 'none';
        }
    }

    /**
     * Sticky moddaki header yüksekliğini ölçüp nav'ın konumu ve
     * yer tutucu için CSS değişkenine yazar.
     */
    _applyHeights() {
        // Küçülmenin bittiğinden emin olmak için sticky değilse ölçme.
        if (!this.isSticky) {
            return;
        }

        const headerHeight = this.header.offsetHeight;
        const navHeight = this.nav ? this.nav.offsetHeight : 0;

        document.documentElement.style.setProperty('--vape-header-height', `${headerHeight}px`);
        this.spacer.style.height = `${headerHeight + navHeight}px`;
    }

    _onResize() {
        if (this.isSticky) {
            this._applyHeights();
        }
    }
}
