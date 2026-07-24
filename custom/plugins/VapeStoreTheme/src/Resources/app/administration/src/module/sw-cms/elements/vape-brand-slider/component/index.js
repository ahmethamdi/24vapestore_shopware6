import template from './vape-cms-el-brand-slider.html.twig';
import './vape-cms-el-brand-slider.scss';

const { Mixin } = Shopware;

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // Logo medya entity'leri; anahtar = mediaId, değer = entity.
            // Editör önizlemesinde gerçek logoyu göstermek için tutulur.
            mediaEntities: {},
        };
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        brands() {
            if (!Array.isArray(this.element?.config?.brands?.value)) {
                return [];
            }
            return this.element.config.brands.value;
        },

        headline() {
            return this.element?.config?.headline?.value
                || this.$t('vape-cms.elements.brandSlider.placeholder.headline');
        },

        grayscale() {
            return this.element?.config?.grayscale?.value ?? true;
        },
    },

    watch: {
        // Yönetici marka ekley/logo değiştirdiğinde önizleme tazelensin
        brands: {
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
    },

    methods: {
        async loadMedia() {
            const ids = this.brands
                .map((b) => b.mediaId)
                .filter((id) => id && !this.mediaEntities[id]);

            if (!ids.length) {
                return;
            }

            const criteria = new Shopware.Data.Criteria(1, 100);
            criteria.setIds(ids);

            const result = await this.mediaRepository.search(criteria, Shopware.Context.api);
            result.forEach((entity) => { this.mediaEntities[entity.id] = entity; });
        },

        brandLogo(brand) {
            return brand?.mediaId ? (this.mediaEntities[brand.mediaId]?.url ?? null) : null;
        },

        brandName(brand) {
            return brand?.name || this.$t('vape-cms.elements.brandSlider.placeholder.brand');
        },
    },
};
