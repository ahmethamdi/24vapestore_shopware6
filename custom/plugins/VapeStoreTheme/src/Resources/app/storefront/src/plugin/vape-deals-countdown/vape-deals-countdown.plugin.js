import Plugin from 'src/plugin-system/plugin.class';

/**
 * Günün fırsatları — canlı geri sayım
 * ==================================================
 * Bağımlılıksız. Element'in içindeki her kartın (`[data-vape-deals-card]`)
 * `data-vape-deals-end="ISO"` hedef tarihini okur ve her saniye Tage/Stunden/
 * Minuten/Sekunden kutularını günceller. Süre bitince sayaç gizlenir, kartın
 * "Abgelaufen" metni gösterilir.
 *
 * Tek interval tüm kartları günceller (kart başına ayrı timer YOK). destroy()'da
 * interval temizlenir — CMS canlı önizlemede element yeniden render olduğunda
 * timer sızıntısı olmasın.
 *
 * JS yüklenmese de twig'in server-side "00" başlangıç değerleri görünür kalır
 * (progressive enhancement).
 */
export default class VapeDealsCountdownPlugin extends Plugin {
    static options = {
        cardSelector: '[data-vape-deals-card]',
        endAttr: 'data-vape-deals-end',
        countdownSelector: '[data-vape-deals-countdown]',
        expiredSelector: '[data-vape-deals-expired]',
        daysSelector: '[data-vape-deals-days]',
        hoursSelector: '[data-vape-deals-hours]',
        minutesSelector: '[data-vape-deals-minutes]',
        secondsSelector: '[data-vape-deals-seconds]',
    };

    init() {
        this._cards = Array.from(this.el.querySelectorAll(this.options.cardSelector))
            .map((card) => this._prepareCard(card))
            .filter((entry) => entry !== null);

        if (!this._cards.length) {
            return;
        }

        this._tick();
        this._interval = window.setInterval(() => this._tick(), 1000);
    }

    /**
     * ⚠️ Plugin destroy edildiğinde (element yeniden render / sayfa geçişi)
     *    interval temizlenmezse arka planda çalışmaya devam eder ve DOM'a
     *    yazmaya çalışır → sessiz hata + performans sızıntısı.
     */
    destroy() {
        if (this._interval) {
            window.clearInterval(this._interval);
            this._interval = null;
        }
    }

    _prepareCard(card) {
        const raw = card.getAttribute(this.options.endAttr);
        if (!raw) {
            return null;
        }

        const target = new Date(raw).getTime();
        if (!Number.isFinite(target)) {
            return null;
        }

        return {
            target,
            countdown: card.querySelector(this.options.countdownSelector),
            expired: card.querySelector(this.options.expiredSelector),
            days: card.querySelector(this.options.daysSelector),
            hours: card.querySelector(this.options.hoursSelector),
            minutes: card.querySelector(this.options.minutesSelector),
            seconds: card.querySelector(this.options.secondsSelector),
            isExpired: false,
        };
    }

    _tick() {
        const now = Date.now();

        this._cards.forEach((entry) => {
            let diff = Math.floor((entry.target - now) / 1000);

            if (diff <= 0) {
                this._markExpired(entry);
                return;
            }

            const days = Math.floor(diff / 86400); diff -= days * 86400;
            const hours = Math.floor(diff / 3600); diff -= hours * 3600;
            const minutes = Math.floor(diff / 60); diff -= minutes * 60;
            const seconds = diff;

            this._write(entry.days, days);
            this._write(entry.hours, hours);
            this._write(entry.minutes, minutes);
            this._write(entry.seconds, seconds);
        });

        // Hepsi bitmişse interval'i durdur — gereksiz döngü yok.
        if (this._cards.every((entry) => entry.isExpired) && this._interval) {
            window.clearInterval(this._interval);
            this._interval = null;
        }
    }

    _markExpired(entry) {
        if (entry.isExpired) {
            return;
        }
        entry.isExpired = true;

        if (entry.countdown) {
            entry.countdown.hidden = true;
        }
        if (entry.expired) {
            entry.expired.hidden = false;
        }
    }

    _write(node, value) {
        if (!node) {
            return;
        }
        const text = String(value).padStart(2, '0');
        if (node.textContent !== text) {
            node.textContent = text;
        }
    }
}
