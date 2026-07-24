import Plugin from 'src/plugin-system/plugin.class';

/**
 * Sekmeli ürün ızgarası — SEKME geçişi
 * ==================================================
 * Bağımlılıksız, hafif. Tek iş yapar: sekme (tab) geçişi (WAI-ARIA tab pattern).
 *
 *  - sekmeye tıklanınca: tüm panelleri gizle, seçileni göster, aria-selected +
 *    tabindex güncelle.
 *  - klavye: ← / → önceki-sonraki (yatay tablist), Home ilk, End son sekme.
 *
 * ⚠️ Panel içeriği bir IZGARA'dır (slider DEĞİL) — bu yüzden ok/scroll mantığı
 *    yok, sadece göster/gizle.
 *
 * Progressive enhancement: JS yüklenmezse ilk panel zaten görünür (twig yalnızca
 * ilk paneli render eder, diğerleri `hidden`), kartlar gerçek <a> — hepsi
 * klavyeyle gezilir.
 *
 * Desen kaynağı: vape-featured-split.plugin.js (tab bölümü; slider kaldırıldı).
 */
export default class VapeProductTabsPlugin extends Plugin {
    static options = {
        tabSelector: '[data-vape-product-tabs-tab]',
        panelSelector: '[data-vape-product-tabs-panel]',
        activeClass: 'is--active',
    };

    init() {
        this.tabs = Array.from(this.el.querySelectorAll(this.options.tabSelector));
        this.panels = Array.from(this.el.querySelectorAll(this.options.panelSelector));

        if (this.tabs.length === 0) {
            return;
        }

        this._registerTabEvents();
    }

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
            panel.hidden = i !== index;
        });

        if (focusTab && this.tabs[index]) {
            this.tabs[index].focus();
        }
    }
}
