import template from './vape-cms-el-config-featured-split.html.twig';
import './vape-cms-el-config-featured-split.scss';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

/**
 * Yeni sekme (tab) yapısı — bir sekme eklenirken varsayılan.
 * Yeni alan eklersen buraya da ekle, yoksa eski sekmelerde undefined kalır.
 */
function createTab() {
    return {
        categoryId: null,        // sekmenin kategorisi (asıl ürün kaynağı)
        label: '',               // boşsa kategori adı kullanılır
        productSource: 'category', // 'category' | 'static' | 'stream'
        products: [],            // 'static' modu için ürün ID dizisi
        productStreamId: null,   // 'stream' modu için
        limit: 8,                // gösterilecek ürün sayısı
    };
}

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // categoryId => entity; sekme başlığında ad göstermek için.
            categoryEntities: {},
        };
    },

    computed: {
        categoryRepository() {
            return this.repositoryFactory.create('category');
        },

        productRepository() {
            return this.repositoryFactory.create('product');
        },

        productCriteria() {
            const criteria = new Criteria(1, 25);
            criteria.addAssociation('cover');
            criteria.addAssociation('options.group');
            return criteria;
        },

        tabs() {
            if (!Array.isArray(this.element?.config?.tabs?.value)) {
                return [];
            }
            return this.element.config.tabs.value;
        },

        categoryCriteria() {
            return new Criteria(1, 50);
        },

        productStreamCriteria() {
            return new Criteria(1, 25);
        },

        productSourceOptions() {
            return [
                {
                    value: 'category',
                    label: this.$t('vape-cms.elements.featuredSplit.config.sourceCategory'),
                },
                {
                    value: 'static',
                    label: this.$t('vape-cms.elements.featuredSplit.config.sourceStatic'),
                },
                {
                    value: 'stream',
                    label: this.$t('vape-cms.elements.featuredSplit.config.sourceStream'),
                },
            ];
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.ensureArrays();
        this.loadCategories();
    },

    methods: {
        /**
         * tabs her zaman dizi olmalı. Element ilk eklendiğinde ya da eski bir
         * kayıt (links/cards config'li) açıldığında undefined/eksik gelebilir.
         */
        ensureArrays() {
            if (!this.element.config.tabs) {
                this.element.config.tabs = { source: 'static', value: [] };
            }
            if (!Array.isArray(this.element.config.tabs.value)) {
                this.element.config.tabs.value = [];
            }
        },

        // ==================== SEKMELER ====================

        onAddTab() {
            this.element.config.tabs.value = [...this.tabs, createTab()];
            this.emitChanges();
        },

        onRemoveTab(index) {
            const next = [...this.tabs];
            next.splice(index, 1);
            this.element.config.tabs.value = next;
            this.emitChanges();
        },

        onMoveTab(index, direction) {
            const target = index + direction;
            if (target < 0 || target >= this.tabs.length) {
                return;
            }
            const next = [...this.tabs];
            [next[index], next[target]] = [next[target], next[index]];
            this.element.config.tabs.value = next;
            this.emitChanges();
        },

        updateTab(index, patch) {
            const next = [...this.tabs];
            next[index] = { ...next[index], ...patch };
            this.element.config.tabs.value = next;
            this.emitChanges();
        },

        async onTabCategoryChange(categoryId, index) {
            if (categoryId && !this.categoryEntities[categoryId]) {
                const entity = await this.categoryRepository.get(
                    categoryId,
                    Shopware.Context.api,
                    this.categoryCriteria,
                );
                if (entity) {
                    this.categoryEntities[entity.id] = entity;
                }
            }
            this.updateTab(index, { categoryId: categoryId ?? null });
        },

        onTabSourceChange(source, index) {
            this.updateTab(index, { productSource: source });
        },

        onTabProductsChange(ids, index) {
            // sw-entity-multi-id-select bir ID dizisi verir.
            this.updateTab(index, { products: Array.isArray(ids) ? ids : [] });
        },

        onTabStreamChange(streamId, index) {
            this.updateTab(index, { productStreamId: streamId ?? null });
        },

        onTabLimitChange(value, index) {
            const parsed = parseInt(value, 10);
            this.updateTab(index, { limit: Number.isNaN(parsed) || parsed < 1 ? 8 : parsed });
        },

        // ---------- entity yükleme / adlar ----------

        async loadCategories() {
            const ids = this.tabs.map((t) => t.categoryId).filter(Boolean);
            if (!ids.length) {
                return;
            }
            const criteria = new Criteria(1, 100);
            criteria.setIds(ids);
            const result = await this.categoryRepository.search(criteria, Shopware.Context.api);
            result.forEach((entity) => { this.categoryEntities[entity.id] = entity; });
        },

        tabLabel(tab) {
            if (tab?.label) {
                return tab.label;
            }
            return this.categoryName(tab);
        },

        categoryName(tab) {
            if (!tab?.categoryId) {
                return '';
            }
            return this.categoryEntities[tab.categoryId]?.translated?.name
                ?? this.categoryEntities[tab.categoryId]?.name
                ?? '';
        },

        // ---------- ortak ----------

        emitChanges() {
            this.$emit('element-update', this.element);
        },
    },
};
