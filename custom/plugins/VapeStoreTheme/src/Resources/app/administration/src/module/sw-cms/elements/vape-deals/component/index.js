import template from './vape-cms-el-deals.html.twig';
import './vape-cms-el-deals.scss';

const { Mixin } = Shopware;

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // Banner medya entity'leri; anahtar = mediaId, değer = entity.
            // Editör önizlemesinde gerçek görseli göstermek için tutulur.
            mediaEntities: {},
            // Her saniye artan sayaç; geri sayım hesabını reaktif tutmak için.
            now: Date.now(),
            timer: null,
        };
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        headline() {
            return this.element?.config?.headline?.value
                || this.$t('vape-cms.elements.deals.placeholder.headline');
        },

        eyebrow() {
            return this.element?.config?.eyebrow?.value ?? '';
        },

        deals() {
            if (!Array.isArray(this.element?.config?.deals?.value)) {
                return [];
            }
            return this.element.config.deals.value;
        },
    },

    watch: {
        deals: {
            handler() {
                this.loadMedia();
            },
            deep: true,
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.loadMedia();
        // Editörde de canlı his — hafif interval; unmount'ta temizlenir.
        this.timer = window.setInterval(() => { this.now = Date.now(); }, 1000);
    },

    beforeUnmount() {
        if (this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
    },

    methods: {
        async loadMedia() {
            const ids = this.deals
                .map((d) => d.mediaId)
                .filter((id) => id && !this.mediaEntities[id]);

            if (!ids.length) {
                return;
            }

            const criteria = new Shopware.Data.Criteria(1, 100);
            criteria.setIds(ids);

            const result = await this.mediaRepository.search(criteria, Shopware.Context.api);
            result.forEach((entity) => { this.mediaEntities[entity.id] = entity; });
        },

        dealImage(deal) {
            return deal?.mediaId ? (this.mediaEntities[deal.mediaId]?.url ?? null) : null;
        },

        dealTitle(deal) {
            return deal?.title || this.$t('vape-cms.elements.deals.placeholder.title');
        },

        /**
         * endDate'ten kalan süreyi { days, hours, minutes, seconds, expired }
         * olarak döndürür. `now` reaktif olduğu için her saniye yeniden hesaplanır.
         */
        remaining(deal) {
            const target = deal?.endDate ? new Date(deal.endDate).getTime() : NaN;
            if (!Number.isFinite(target)) {
                return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, invalid: true };
            }

            let diff = Math.floor((target - this.now) / 1000);
            if (diff <= 0) {
                return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, invalid: false };
            }

            const days = Math.floor(diff / 86400); diff -= days * 86400;
            const hours = Math.floor(diff / 3600); diff -= hours * 3600;
            const minutes = Math.floor(diff / 60); diff -= minutes * 60;
            const seconds = diff;

            return { days, hours, minutes, seconds, expired: false, invalid: false };
        },

        pad(n) {
            return String(n).padStart(2, '0');
        },
    },
};
