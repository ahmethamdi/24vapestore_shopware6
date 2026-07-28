import Plugin from 'src/plugin-system/plugin.class';
import CookieStorage from 'src/helper/storage/cookie-storage.helper';

/**
 * Age-Gate (18+ yaş kapısı)
 * ==================================================
 * Almanya'da nikotin ürünleri için yasal zorunluluk (JuSchG §10 /
 * TabakerzG). Beyan tabanlı kapı — doğum tarihi SORULMAZ.
 *
 * Neden istemci tarafı (çerez + JS), sunucu tarafı redirect değil:
 *   Sunucu tarafı kapı Shopware'in HTTP full-page cache'ini bozar; anonim
 *   isteklere aynı yanıt döner ve kapı durumu cache key'e girmediği için
 *   ya herkese ya kimseye çıkar. Core'un cookie bar'ı da bu yüzden
 *   istemci tarafıdır.
 *
 * Erişilebilirlik:
 * - role="dialog" aria-modal="true", aria-labelledby/describedby (twig)
 * - Focus trap: Tab/Shift+Tab kartın içinde sarar
 * - Arka plan `inert` (destek yoksa aria-hidden + tabindex yedeği)
 * - Escape ile KAPANMAZ — bilinçli sapma; yasal kapıda kaçış yolu olmamalı
 * - Doğum tarihi yok → WCAG 3.3.8 (Accessible Authentication) uyumlu
 * - Kapanışta odak, kapıyı açmadan önceki öğeye değil sayfanın başına
 *   döner (kapı ilk etkileşim olduğu için "önceki öğe" yok)
 */
export default class VapeAgeGatePlugin extends Plugin {
    static options = {
        /** Onay çerezinin adı */
        cookieName: 'vape-age-confirmed',

        /** Onayın kaç gün saklanacağı — theme_config'ten override edilir */
        cookieDays: 30,

        /** "Nein" sonrası yönlendirme hedefi — theme_config'ten gelir */
        denyUrl: '',

        cardSelector: '[data-vape-age-gate-card]',
        promptSelector: '[data-vape-age-gate-prompt]',
        deniedSelector: '[data-vape-age-gate-denied]',
        confirmSelector: '[data-vape-age-gate-confirm]',
        denySelector: '[data-vape-age-gate-deny]',
        backSelector: '[data-vape-age-gate-back]',

        openClass: 'is-open',
        deniedClass: 'is-denied',
        bodyOpenClass: 'vape-age-gate-open',

        /**
         * Kapı açıkken devre dışı bırakılacak kardeş öğeler. Kapı
         * `base_body_inner`'ın ilk çocuğu olduğu için kardeşleri = sayfanın
         * geri kalanı (header, main, footer, cookie bar).
         */
        inertSelector: 'body > *:not(#vape-age-gate):not(script):not(noscript)',
    };

    init() {
        this.card = this.el.querySelector(this.options.cardSelector);
        this.confirmBtn = this.el.querySelector(this.options.confirmSelector);
        this.denyBtn = this.el.querySelector(this.options.denySelector);
        this.backBtn = this.el.querySelector(this.options.backSelector);
        this.deniedBlock = this.el.querySelector(this.options.deniedSelector);

        // inert uygulanmış öğeler — kapanışta geri almak için saklanıyor.
        this._inertTargets = [];

        if (!this.card || !this.confirmBtn) {
            return;
        }

        this._readOptions();

        // Onay zaten verilmişse kapı hiç açılmaz — markup gizli kalır,
        // flash olmaz (twig'de `hidden` + CSS `display:none`).
        if (this._isConfirmed()) {
            return;
        }

        this._registerEvents();
        this._open();
    }

    destroy() {
        this._close();
    }

    // ==================================================
    // Kurulum
    // ==================================================

    /**
     * Seçenekler data-attribute'tan okunur (Shopware options mekanizması).
     * theme_config değerleri twig'de json_encode edilip basılıyor.
     */
    _readOptions() {
        const raw = this.el.dataset.vapeAgeGateOptions;

        if (!raw) {
            return;
        }

        try {
            const parsed = JSON.parse(raw);

            // cookieDays theme.json'da text alanı (sayı alanı tipi yok) →
            // string gelir. Geçersiz/0 değerde varsayılana düş, yoksa
            // çerez oturumluk olur ve her sayfada kapı çıkar.
            const days = parseInt(parsed.cookieDays, 10);
            if (Number.isFinite(days) && days > 0) {
                this.options.cookieDays = days;
            }

            if (typeof parsed.denyUrl === 'string') {
                this.options.denyUrl = parsed.denyUrl.trim();
            }
        } catch (error) {
            console.error('[VapeAgeGate] Seçenekler okunamadı.', error);
        }
    }

    _registerEvents() {
        this.confirmBtn.addEventListener('click', this._onConfirm.bind(this));

        if (this.denyBtn) {
            this.denyBtn.addEventListener('click', this._onDeny.bind(this));
        }

        if (this.backBtn) {
            this.backBtn.addEventListener('click', this._onBack.bind(this));
        }

        // Focus trap. keydown document seviyesinde dinleniyor — odak bir
        // şekilde dışarı kaçarsa (tarayıcı arayüzünden dönüş, eklenti)
        // ilk Tab'da geri çekilebilsin.
        this._keydownHandler = this._onKeydown.bind(this);
        document.addEventListener('keydown', this._keydownHandler, true);
    }

    // ==================================================
    // Açma / kapama
    // ==================================================

    _open() {
        this.el.removeAttribute('hidden');
        this.el.classList.add(this.options.openClass);
        document.body.classList.add(this.options.bodyOpenClass);

        this._applyInert();

        // Odak birincil eyleme. Kart görünür olduktan sonra odaklanması
        // için bir frame bekleniyor (display:none öğeye focus çalışmaz).
        window.requestAnimationFrame(() => {
            this.confirmBtn.focus();
        });
    }

    _close() {
        this.el.classList.remove(this.options.openClass);
        this.el.setAttribute('hidden', 'hidden');
        document.body.classList.remove(this.options.bodyOpenClass);

        this._releaseInert();

        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler, true);
            this._keydownHandler = null;
        }
    }

    // ==================================================
    // Eylemler
    // ==================================================

    _onConfirm() {
        this._setConfirmed();
        this._close();

        // Odağı sayfanın başına al. Kapı sayfa yüklenirken ilk etkileşim
        // olduğu için "geri dönülecek önceki öğe" yok; odak body'de
        // bırakılırsa klavye kullanıcısı sayfanın ortasından devam eder.
        const skipLink = document.querySelector('.skip-to-content-link, [href="#content-main"]');
        const target = skipLink || document.body;

        if (target === document.body) {
            // body odaklanabilir değil; geçici tabindex ile odak alınıp
            // hemen geri alınıyor (kalıcı tabindex DOM'u kirletir).
            target.setAttribute('tabindex', '-1');
            target.focus();
            target.removeAttribute('tabindex');
        } else {
            target.focus();
        }
    }

    _onDeny() {
        const url = this.options.denyUrl;

        // Yönetici hedef URL girmişse oraya yönlendir. Girmemişse kart
        // içinde bilgi ekranına dön — kullanıcıyı boş kapıda bırakma.
        if (url) {
            window.location.href = url;
            return;
        }

        this.card.classList.add(this.options.deniedClass);

        // Odağı yeni içeriğe taşı; yoksa odak gizlenen butonda kalır ve
        // ekran okuyucu değişimi duyurmaz.
        if (this.deniedBlock) {
            this.deniedBlock.focus();
        }
    }

    _onBack() {
        this.card.classList.remove(this.options.deniedClass);
        this.confirmBtn.focus();
    }

    // ==================================================
    // Çerez
    // ==================================================

    _isConfirmed() {
        return CookieStorage.getItem(this.options.cookieName) === '1';
    }

    _setConfirmed() {
        CookieStorage.setItem(this.options.cookieName, '1', this.options.cookieDays);
    }

    // ==================================================
    // Focus trap
    // ==================================================

    _onKeydown(event) {
        if (event.key !== 'Tab') {
            return;
        }

        const focusable = this._getFocusableElements();

        if (focusable.length === 0) {
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        // Odak kapının dışındaysa (ilk Tab veya dışarı kaçmış odak) içeri çek.
        if (!this.el.contains(active)) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
            return;
        }

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }

    /**
     * Kart içindeki odaklanabilir öğeler. `offsetParent` kontrolü gizli
     * olanları eler — ret ekranına geçildiğinde soru bloğunun butonları
     * `display:none` olur ve trap'e dahil edilmemelidir.
     */
    _getFocusableElements() {
        const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

        return Array.from(this.el.querySelectorAll(selector))
            .filter((el) => el.offsetParent !== null);
    }

    // ==================================================
    // Arka plan izolasyonu
    // ==================================================

    /**
     * Kapı açıkken sayfanın geri kalanı hem klavyeden hem ekran
     * okuyucudan erişilemez olmalı. `inert` ikisini birden yapar.
     * Desteklemeyen tarayıcı için aria-hidden yedeği var (klavye
     * erişimi orada focus trap tarafından zaten engelleniyor).
     */
    _applyInert() {
        const supportsInert = 'inert' in HTMLElement.prototype;
        const targets = document.querySelectorAll(this.options.inertSelector);

        targets.forEach((el) => {
            const entry = { el };

            if (supportsInert) {
                entry.hadInert = el.inert;
                el.inert = true;
            } else {
                entry.hadAriaHidden = el.getAttribute('aria-hidden');
                el.setAttribute('aria-hidden', 'true');
            }

            this._inertTargets.push(entry);
        });
    }

    /**
     * Orijinal değerler geri yükleniyor — sayfada zaten inert/aria-hidden
     * olan bir öğe varsa (örn. kapalı offcanvas) kapı onu açmamalı.
     */
    _releaseInert() {
        this._inertTargets.forEach((entry) => {
            if (Object.prototype.hasOwnProperty.call(entry, 'hadInert')) {
                entry.el.inert = entry.hadInert;
            } else if (entry.hadAriaHidden === null) {
                entry.el.removeAttribute('aria-hidden');
            } else {
                entry.el.setAttribute('aria-hidden', entry.hadAriaHidden);
            }
        });

        this._inertTargets = [];
    }
}
