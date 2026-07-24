import template from './vape-cms-el-product-tabs.html.twig';
import './vape-cms-el-product-tabs.scss';

const { Mixin } = Shopware;

export default {
    template,

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // Editörde aktif önizlenen sekme (yalnızca canvas görseli).
            activeTab: 0,
        };
    },

    computed: {
        headline() {
            return this.element?.config?.headline?.value ?? '';
        },

        subline() {
            return this.element?.config?.subline?.value ?? '';
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
    },

    methods: {
        tabLabel(tab, index) {
            if (tab?.label) {
                return tab.label;
            }
            return `${this.$t('vape-cms.elements.productTabs.placeholder.tab')} ${index + 1}`;
        },

        sourceLabel(tab) {
            const source = tab?.productSource || 'static';
            if (source === 'stream') {
                return this.$t('vape-cms.elements.productTabs.config.sourceStream');
            }
            return this.$t('vape-cms.elements.productTabs.config.sourceStatic');
        },

        productCount(tab) {
            const source = tab?.productSource || 'static';
            if (source === 'stream') {
                return null;
            }
            return Array.isArray(tab?.products) ? tab.products.length : 0;
        },

        onSelectTab(index) {
            this.activeTab = index;
        },
    },
};
