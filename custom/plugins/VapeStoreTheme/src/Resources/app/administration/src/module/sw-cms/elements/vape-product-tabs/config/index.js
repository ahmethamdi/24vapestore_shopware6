import template from './vape-cms-el-config-product-tabs.html.twig';
import './vape-cms-el-config-product-tabs.scss';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

/**
 * Yeni sekme (tab) yapısı — bir sekme eklenirken varsayılan.
 * Yeni alan eklersen buraya da ekle, yoksa eski sekmelerde undefined kalır.
 */
function createTab() {
    return {
        label: '',                 // sekme etiketi (boşsa "Tab N")
        productSource: 'static',   // 'static' | 'stream'
        products: [],              // 'static' modu için ürün ID dizisi
        productStreamId: null,     // 'stream' modu için
        limit: 8,                  // stream modunda gösterilecek ürün sayısı
    };
}

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    computed: {
        productRepository() {
            return this.repositoryFactory.create('product');
        },

        productCriteria() {
            const criteria = new Criteria(1, 25);
            criteria.addAssociation('cover');
            criteria.addAssociation('options.group');
            return criteria;
        },

        productStreamCriteria() {
            return new Criteria(1, 25);
        },

        tabs() {
            if (!Array.isArray(this.element?.config?.tabs?.value)) {
                return [];
            }
            return this.element.config.tabs.value;
        },

        productSourceOptions() {
            return [
                {
                    value: 'static',
                    label: this.$t('vape-cms.elements.productTabs.config.sourceStatic'),
                },
                {
                    value: 'stream',
                    label: this.$t('vape-cms.elements.productTabs.config.sourceStream'),
                },
            ];
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.ensureArrays();
    },

    methods: {
        /**
         * tabs her zaman dizi olmalı. Element ilk eklendiğinde ya da eski bir
         * kayıt açıldığında undefined/eksik gelebilir.
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

        tabLabel(tab, index) {
            if (tab?.label) {
                return tab.label;
            }
            return `${this.$t('vape-cms.elements.productTabs.config.tabItem')} ${index + 1}`;
        },

        // ---------- ortak ----------

        emitChanges() {
            this.$emit('element-update', this.element);
        },
    },
};
