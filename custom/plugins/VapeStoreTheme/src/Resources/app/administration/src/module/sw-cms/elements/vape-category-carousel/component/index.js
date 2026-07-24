import template from './vape-cms-el-category-carousel.html.twig';
import './vape-cms-el-category-carousel.scss';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // Kategori entity'leri; anahtar = id, değer = entity.
            // Editör önizlemesinde ad + görsel göstermek için tutulur.
            categoryEntities: {},
        };
    },

    computed: {
        categoryRepository() {
            return this.repositoryFactory.create('category');
        },

        assetFilter() {
            return Shopware.Filter.getByName('asset');
        },

        cards() {
            if (!Array.isArray(this.element?.config?.categories?.value)) {
                return [];
            }
            return this.element.config.categories.value;
        },

        eyebrow() {
            return this.element?.config?.eyebrow?.value ?? '';
        },

        headline() {
            return this.element?.config?.headline?.value ?? '';
        },

        highlightText() {
            return this.element?.config?.highlightText?.value ?? '';
        },

        /**
         * Başlığı highlightText'e göre parçalar: [öncesi, vurgu, sonrası].
         * Vurgu bulunmazsa yalnızca düz başlık döner.
         */
        headlineParts() {
            const headline = this.headline;
            const needle = this.highlightText;

            if (!headline) {
                return { before: '', match: '', after: '' };
            }
            if (!needle) {
                return { before: headline, match: '', after: '' };
            }

            const pos = headline.toLowerCase().indexOf(needle.toLowerCase());
            if (pos === -1) {
                return { before: headline, match: '', after: '' };
            }

            return {
                before: headline.slice(0, pos),
                match: headline.slice(pos, pos + needle.length),
                after: headline.slice(pos + needle.length),
            };
        },

        placeholderImage() {
            return this.assetFilter('/bundles/framework/assets/default/cms/preview_glasses.jpg');
        },
    },

    watch: {
        // Yönetici kart eklediğinde/kategori değiştirdiğinde önizleme tazelensin
        cards: {
            handler() {
                this.loadCategories();
            },
            deep: true,
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.loadCategories();
    },

    methods: {
        async loadCategories() {
            const ids = this.cards
                .map((c) => c.categoryId)
                .filter((id) => id && !this.categoryEntities[id]);

            if (!ids.length) {
                return;
            }

            const criteria = new Criteria(1, 100);
            criteria.setIds(ids);
            criteria.addAssociation('media');

            const result = await this.categoryRepository.search(criteria, Shopware.Context.api);
            result.forEach((entity) => { this.categoryEntities[entity.id] = entity; });
        },

        categoryOf(card) {
            return card?.categoryId ? (this.categoryEntities[card.categoryId] ?? null) : null;
        },

        cardName(card) {
            const category = this.categoryOf(card);
            return category?.translated?.name ?? category?.name ?? '';
        },

        cardImage(card) {
            const category = this.categoryOf(card);
            return category?.media?.url || this.placeholderImage;
        },

        cardCta(card) {
            return card?.ctaText || this.$t('vape-cms.elements.categoryCarousel.placeholder.cta');
        },
    },
};
