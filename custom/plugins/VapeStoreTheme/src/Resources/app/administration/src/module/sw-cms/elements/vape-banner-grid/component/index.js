import template from './vape-cms-el-banner-grid.html.twig';
import './vape-cms-el-banner-grid.scss';

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
        };
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        banners() {
            if (!Array.isArray(this.element?.config?.banners?.value)) {
                return [];
            }
            return this.element.config.banners.value;
        },

        // 3+ banner varsa geniş ekranda 3 sütuna izin ver; 2 ise 2 sütun.
        gridModifierClass() {
            return this.banners.length >= 3
                ? 'vape-cms-el-banner-grid__grid--three'
                : 'vape-cms-el-banner-grid__grid--two';
        },
    },

    watch: {
        banners: {
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
            const ids = this.banners
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

        bannerImage(banner) {
            return banner?.mediaId ? (this.mediaEntities[banner.mediaId]?.url ?? null) : null;
        },

        bannerTitle(banner) {
            return banner?.title || this.$t('vape-cms.elements.bannerGrid.placeholder.title');
        },
    },
};
