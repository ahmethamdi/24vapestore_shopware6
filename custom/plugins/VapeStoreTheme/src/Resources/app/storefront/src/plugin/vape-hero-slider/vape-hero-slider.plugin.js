import Plugin from 'src/plugin-system/plugin.class';

/**
 * Hero slider
 * ==================================================
 * Bağımlılıksız, hafif slider. Shopware'in kendi slider'ı (tiny-slider)
 * ürün kaydırma için tasarlanmış; buradaki düzen (yan yana panel + görsel)
 * ona uymadığı için kendi geçişimizi yazıyoruz.
 *
 * Erişilebilirlik:
 * - Ok butonları ve noktalar gerçek <button>, klavyeyle kullanılabilir
 * - Görünmeyen slide'lar aria-hidden ile gizlenir
 * - prefers-reduced-motion açıksa otomatik oynatma çalışmaz
 * - Fare üzerindeyken veya odak içerideyken otomatik oynatma durur
 */
export default class VapeHeroSliderPlugin extends Plugin {
    static options = {
        autoplay: false,
        speed: 6000,
        slideSelector: '[data-vape-hero-slide]',
        trackSelector: '[data-vape-hero-track]',
        dotSelector: '[data-vape-hero-dot]',
        prevSelector: '[data-vape-hero-prev]',
        nextSelector: '[data-vape-hero-next]',
        activeDotClass: 'is--active',
        initialisedClass: 'is--initialised',
    };

    init() {
        this.track = this.el.querySelector(this.options.trackSelector);
        this.slides = Array.from(this.el.querySelectorAll(this.options.slideSelector));
        this.dots = Array.from(this.el.querySelectorAll(this.options.dotSelector));
        this.currentIndex = 0;
        this.timer = null;

        if (!this.track || this.slides.length === 0) {
            return;
        }

        // Ayarlar data-attribute'tan gelir (Shopware options mekanizması)
        this._readOptions();

        this.el.classList.add(this.options.initialisedClass);

        if (this.slides.length > 1) {
            this._registerEvents();
            this._startAutoplay();
        }

        this._update();
    }

    destroy() {
        this._stopAutoplay();
    }

    // ---------- kurulum ----------

    _readOptions() {
        const raw = this.el.dataset.vapeHeroSliderOptions;

        if (!raw) {
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            this.options.autoplay = Boolean(parsed.autoplay);
            this.options.speed = Number(parsed.speed) || this.options.speed;
        } catch (e) {
            // Bozuk JSON slider'ı çökertmesin — varsayılanlarla devam
        }
    }

    _registerEvents() {
        const prev = this.el.querySelector(this.options.prevSelector);
        const next = this.el.querySelector(this.options.nextSelector);

        if (prev) {
            prev.addEventListener('click', () => this._goTo(this.currentIndex - 1, true));
        }

        if (next) {
            next.addEventListener('click', () => this._goTo(this.currentIndex + 1, true));
        }

        this.dots.forEach((dot) => {
            dot.addEventListener('click', () => {
                const index = Number(dot.dataset.vapeHeroDot);
                this._goTo(index, true);
            });
        });

        // Kullanıcı okurken otomatik geçiş rahatsız etmesin
        this.el.addEventListener('mouseenter', () => this._stopAutoplay());
        this.el.addEventListener('mouseleave', () => this._startAutoplay());
        this.el.addEventListener('focusin', () => this._stopAutoplay());
        this.el.addEventListener('focusout', () => {
            if (!this.el.contains(document.activeElement)) {
                this._startAutoplay();
            }
        });

        // Dokunmatik kaydırma
        this._registerTouchEvents();
    }

    _registerTouchEvents() {
        let startX = 0;
        let startY = 0;
        let tracking = false;

        this.el.addEventListener('touchstart', (event) => {
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
            tracking = true;
            this._stopAutoplay();
        }, { passive: true });

        this.el.addEventListener('touchend', (event) => {
            if (!tracking) {
                return;
            }
            tracking = false;

            const deltaX = event.changedTouches[0].clientX - startX;
            const deltaY = event.changedTouches[0].clientY - startY;

            // Dikey kaydırma sayfa kaydırmasıdır, karışma
            if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) {
                this._startAutoplay();
                return;
            }

            this._goTo(this.currentIndex + (deltaX < 0 ? 1 : -1), true);
        }, { passive: true });
    }

    // ---------- gezinme ----------

    /**
     * @param {number} index hedef slide (sarmalar)
     * @param {boolean} userInitiated kullanıcı tetiklediyse otomatik oynatma sıfırlanır
     */
    _goTo(index, userInitiated = false) {
        const total = this.slides.length;
        this.currentIndex = ((index % total) + total) % total;

        this._update();

        if (userInitiated) {
            this._restartAutoplay();
        }
    }

    _update() {
        this.track.style.transform = `translateX(-${this.currentIndex * 100}%)`;

        this.slides.forEach((slide, i) => {
            const isCurrent = i === this.currentIndex;

            slide.setAttribute('aria-hidden', isCurrent ? 'false' : 'true');

            // Klavye odak sızıntısı: `aria-hidden` tek başına odağı ENGELLEMEZ.
            // Görünmeyen slayttaki link/buton hâlâ Tab sırasındaydı → kullanıcı
            // ekranda hiçbir şey olmadan "kaybolan" bir odağa düşüyordu.
            // `inert` hem odağı hem etkileşimi kaldırır (ve aria-hidden'ı ima eder).
            if (isCurrent) {
                slide.removeAttribute('inert');
            } else {
                slide.setAttribute('inert', '');
            }

            // `inert` desteklemeyen eski tarayıcılar için yedek: odaklanabilir
            // çocukları Tab sırasından çıkar. Orijinal tabindex'i sakla ki geri
            // gelirken doğru değere dönebilelim.
            if (!VapeHeroSliderPlugin._supportsInert()) {
                this._setChildrenFocusable(slide, isCurrent);
            }
        });

        this.dots.forEach((dot, i) => {
            const active = i === this.currentIndex;
            dot.classList.toggle(this.options.activeDotClass, active);
            dot.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    }

    /**
     * `inert` tarayıcı desteği (Safari <15.5, eski Firefox yok).
     */
    static _supportsInert() {
        return 'inert' in HTMLElement.prototype;
    }

    /**
     * `inert` yedeği: slayt içindeki odaklanabilir öğeleri Tab sırasına alır/çıkarır.
     *
     * @param {HTMLElement} slide
     * @param {boolean} focusable
     */
    _setChildrenFocusable(slide, focusable) {
        const selector = 'a[href], button, input, select, textarea, [tabindex]';

        slide.querySelectorAll(selector).forEach((node) => {
            if (focusable) {
                // Sakladığımız orijinal değere dön (yoksa attribute'u tamamen kaldır)
                const original = node.dataset.vapeTabindex;

                if (original === undefined) {
                    node.removeAttribute('tabindex');
                } else {
                    node.setAttribute('tabindex', original);
                    delete node.dataset.vapeTabindex;
                }

                return;
            }

            // Zaten çıkarılmışsa orijinali tekrar yazma (üzerine -1 kaydetmeyelim)
            if (node.dataset.vapeTabindex !== undefined) {
                return;
            }

            if (node.hasAttribute('tabindex')) {
                node.dataset.vapeTabindex = node.getAttribute('tabindex');
            }

            node.setAttribute('tabindex', '-1');
        });
    }

    // ---------- otomatik oynatma ----------

    _prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    _startAutoplay() {
        if (!this.options.autoplay || this.slides.length < 2 || this._prefersReducedMotion()) {
            return;
        }

        this._stopAutoplay();
        this.timer = window.setInterval(() => this._goTo(this.currentIndex + 1), this.options.speed);
    }

    _stopAutoplay() {
        if (this.timer !== null) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
    }

    _restartAutoplay() {
        this._stopAutoplay();
        this._startAutoplay();
    }
}
