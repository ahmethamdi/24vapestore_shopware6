import Plugin from 'src/plugin-system/plugin.class';

/**
 * Öne çıkanlar split — SEKME geçişi + ürün slider'ları
 * ==================================================
 * Bağımlılıksız, hafif. İki iş yapar:
 *
 *  1) Sekme (tab) geçişi — WAI-ARIA tab pattern:
 *     - sekmeye tıklanınca: tüm panelleri gizle, seçileni göster,
 *       aria-selected + tabindex güncelle.
 *     - klavye: ← / ↑ önceki, → / ↓ sonraki, Home ilk, End son sekme.
 *       (dikey/yatay tablist için her iki eksen de desteklenir)
 *
 *  2) Panel içi ürün slider'ı — CSS scroll-snap şeridi + opsiyonel oklar.
 *     Ok butonları şeridi ~%80 kaydırır; başta/sonda gri (disabled).
 *
 * Progressive enhancement: JS yüklenmezse ilk panel zaten görünür (twig
 * yalnızca ilk paneli render eder, diğerleri `hidden`), şeritler dokunmatik/
 * trackpad ile kaydırılabilir, kartlar gerçek <a> — hepsi klavyeyle gezilir.
 *
 * Desen kaynağı: vape-product-rail.plugin.js (slider) + WAI-ARIA tab spec.
 */
export default class VapeFeaturedSplitPlugin extends Plugin {
    static options = {
        tabSelector: '[data-vape-featured-split-tab]',
        panelSelector: '[data-vape-featured-split-panel]',
        trackSelector: '[data-vape-featured-split-track]',
        prevSelector: '[data-vape-featured-split-prev]',
        nextSelector: '[data-vape-featured-split-next]',
        activeClass: 'is--active',
        disabledClass: 'is--disabled',
        // Bir ok tıklaması görünür alanın ~%80'i kadar kaydırır.
        scrollRatio: 0.8,
    };

    init() {
        this.tabs = Array.from(this.el.querySelectorAll(this.options.tabSelector));
        this.panels = Array.from(this.el.querySelectorAll(this.options.panelSelector));

        if (this.tabs.length === 0) {
            // Sekme yoksa sadece slider'ları bağla (tek panel senaryosu).
            this._initSliders(this.el);
            return;
        }

        this._registerTabEvents();
        this._initSliders(this.el);
    }

    // ---------------------------------------------------------------
    // SEKMELER
    // ---------------------------------------------------------------

    _registerTabEvents() {
        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => this._activateTab(index, true));
            tab.addEventListener('keydown', (event) => this._onTabKeydown(event, index));
        });
    }

    _onTabKeydown(event, index) {
        const last = this.tabs.length - 1;
        let target = null;

        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                target = index === last ? 0 : index + 1;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                target = index === 0 ? last : index - 1;
                break;
            case 'Home':
                target = 0;
                break;
            case 'End':
                target = last;
                break;
            default:
                return;
        }

        event.preventDefault();
        this._activateTab(target, true);
    }

    _activateTab(index, focusTab) {
        this.tabs.forEach((tab, i) => {
            const selected = i === index;
            tab.setAttribute('aria-selected', selected ? 'true' : 'false');
            tab.setAttribute('tabindex', selected ? '0' : '-1');
            tab.classList.toggle(this.options.activeClass, selected);
        });

        this.panels.forEach((panel, i) => {
            const active = i === index;
            panel.hidden = !active;
            if (active) {
                // Panel görünür olunca ok durumunu tazele (ölçüler değişti).
                this._updatePanelArrows(panel);
            }
        });

        if (focusTab && this.tabs[index]) {
            this.tabs[index].focus();
        }
    }

    // ---------------------------------------------------------------
    // SLIDER'LAR (panel başına)
    // ---------------------------------------------------------------

    _initSliders(scope) {
        const sliders = Array.from(scope.querySelectorAll(this.options.panelSelector));
        const targets = sliders.length ? sliders : [scope];

        targets.forEach((panel) => {
            const track = panel.querySelector(this.options.trackSelector);
            const prev = panel.querySelector(this.options.prevSelector);
            const next = panel.querySelector(this.options.nextSelector);

            if (!track) {
                return;
            }

            if (prev) {
                prev.addEventListener('click', () => this._scrollByStep(track, -1));
            }
            if (next) {
                next.addEventListener('click', () => this._scrollByStep(track, 1));
            }

            track.addEventListener('scroll', () => {
                window.requestAnimationFrame(() => this._updatePanelArrows(panel));
            }, { passive: true });

            this._updatePanelArrows(panel);
        });

        window.addEventListener('resize', () => {
            targets.forEach((panel) => this._updatePanelArrows(panel));
        }, { passive: true });
    }

    _scrollByStep(track, direction) {
        const amount = Math.round(track.clientWidth * this.options.scrollRatio);
        track.scrollBy({ left: amount * direction, behavior: 'smooth' });
    }

    _updatePanelArrows(panel) {
        const track = panel.querySelector(this.options.trackSelector);
        const prev = panel.querySelector(this.options.prevSelector);
        const next = panel.querySelector(this.options.nextSelector);

        if (!track) {
            return;
        }

        const maxScroll = track.scrollWidth - track.clientWidth;
        const atStart = track.scrollLeft <= 1;
        const atEnd = track.scrollLeft >= maxScroll - 1;

        this._toggle(prev, atStart);
        this._toggle(next, atEnd || maxScroll <= 0);
    }

    _toggle(button, disabled) {
        if (!button) {
            return;
        }
        button.classList.toggle(this.options.disabledClass, disabled);
        button.disabled = disabled;
    }
}
