import template from './vape-cms-el-featured-split.html.twig';
import './vape-cms-el-featured-split.scss';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // categoryId => entity; sekme etiketinde ad göstermek için.
            categoryEntities: {},
            // Editörde aktif önizlenen sekme (yalnızca canvas görseli).
            activeTab: 0,
        };
    },

    computed: {
        categoryRepository() {
            return this.repositoryFactory.create('category');
        },

        eyebrow() {
            return this.element?.config?.eyebrow?.value ?? '';
        },

        headline() {
            return this.element?.config?.headline?.value ?? '';
        },

        description() {
            return this.element?.config?.description?.value ?? '';
        },

        ctaText() {
            return this.element?.config?.ctaText?.value ?? '';
        },

        tabs() {
            if (!Array.isArray(this.element?.config?.tabs?.value)) {
                return [];
            }
            return this.element.config.tabs.value;
        },
    },

    watch: {
        tabs: {
            handler() {
                this.loadCategories();
                if (this.activeTab >= this.tabs.length) {
                    this.activeTab = 0;
                }
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
            const ids = this.tabs
                .map((t) => t.categoryId)
                .filter((id) => id && !this.categoryEntities[id]);
            if (!ids.length) {
                return;
            }
            const criteria = new Criteria(1, 100);
            criteria.setIds(ids);
            const result = await this.categoryRepository.search(criteria, Shopware.Context.api);
            result.forEach((entity) => { this.categoryEntities[entity.id] = entity; });
        },

        categoryName(tab) {
            if (!tab?.categoryId) {
                return '';
            }
            return this.categoryEntities[tab.categoryId]?.translated?.name
                ?? this.categoryEntities[tab.categoryId]?.name
                ?? '';
        },

        tabLabel(tab, index) {
            if (tab?.label) {
                return tab.label;
            }
            const name = this.categoryName(tab);
            if (name) {
                return name;
            }
            return `${this.$t('vape-cms.elements.featuredSplit.placeholder.tab')} ${index + 1}`;
        },

        sourceLabel(tab) {
            const source = tab?.productSource || 'category';
            if (source === 'static') {
                return this.$t('vape-cms.elements.featuredSplit.config.sourceStatic');
            }
            if (source === 'stream') {
                return this.$t('vape-cms.elements.featuredSplit.config.sourceStream');
            }
            return this.$t('vape-cms.elements.featuredSplit.config.sourceCategory');
        },

        onSelectTab(index) {
            this.activeTab = index;
        },
    },
};
