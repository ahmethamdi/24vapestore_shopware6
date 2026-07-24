import template from './vape-cms-el-config-product-rail.html.twig';
import './vape-cms-el-config-product-rail.scss';

const { Mixin } = Shopware;
const { Criteria, EntityCollection } = Shopware.Data;

/*
Ürün rayı config paneli.

⚠️ BINDING KURALI — karıştırırsan alan görünür ama KAYDETMEZ:
     mt-*  (Meteor)              → v-model
     sw-*  (legacy select)       → v-model:value
     sw-entity-multi-select      → v-model:entity-collection + @update:entity-collection
⚠️ sw-tabs, position-identifier olmadan konsol hatası verir.

Ürün kaynağı iki mod:
  - static: sw-entity-multi-select (product) → products.value = ID dizisi
  - stream: sw-entity-single-select (product_stream) → productStreamId.value

Core product-slider config'i kaynak olarak `products.source`'u overload eder;
biz daha okunaklı olsun diye ayrı `productSource` alanı kullanıyoruz.
*/
export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // sw-entity-multi-select bir EntityCollection ister.
            productCollection: null,
        };
    },

    computed: {
        productRepository() {
            return this.repositoryFactory.create('product');
        },

        productSource() {
            return this.element?.config?.productSource?.value ?? 'static';
        },

        isStream() {
            return this.productSource === 'stream';
        },

        productSourceOptions() {
            return [
                {
                    value: 'static',
                    label: this.$t('vape-cms.elements.productRail.config.sourceStatic'),
                },
                {
                    value: 'stream',
                    label: this.$t('vape-cms.elements.productRail.config.sourceStream'),
                },
            ];
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
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.ensureDefaults();
        this.loadProductCollection();
    },

    methods: {
        /**
         * Eski kayıtlar veya yeni sürükleme null alanlarla gelebilir;
         * her alanın tutarlı bir başlangıç değeri olmasını garanti eder.
         */
        ensureDefaults() {
            if (!this.element.config.productSource) {
                this.element.config.productSource = { source: 'static', value: 'static' };
            }
            if (!this.element.config.products) {
                this.element.config.products = { source: 'static', value: [] };
            }
            if (!Array.isArray(this.element.config.products.value)) {
                this.element.config.products.value = [];
            }
            if (!this.element.config.productStreamId) {
                this.element.config.productStreamId = { source: 'static', value: null };
            }
            if (!this.element.config.limit) {
                this.element.config.limit = { source: 'static', value: 8 };
            }
        },

        /**
         * static modda seçili ürünleri EntityCollection olarak yükler —
         * multi-select seçili etiketleri gösterebilsin diye.
         */
        async loadProductCollection() {
            this.productCollection = new EntityCollection('/product', 'product', Shopware.Context.api);

            const ids = this.element.config.products.value;
            if (!Array.isArray(ids) || ids.length === 0) {
                return;
            }

            const criteria = new Criteria(1, 100);
            criteria.addAssociation('cover');
            criteria.addAssociation('options.group');
            criteria.setIds(ids);

            this.productCollection = await this.productRepository.search(criteria, {
                ...Shopware.Context.api,
                inheritance: true,
            });
        },

        onSourceChange(value) {
            this.element.config.productSource.value = value ?? 'static';
            this.emitChanges();
        },

        onProductsChange() {
            // multi-select seçimi → ID dizisi (sıralama korunur).
            this.element.config.products.value = this.productCollection.getIds();
            // editör önizlemesi element.data.products üzerinden çalışır.
            this.element.data = this.element.data || {};
            this.element.data.products = this.productCollection;
            this.emitChanges();
        },

        onStreamChange(streamId) {
            this.element.config.productStreamId.value = streamId ?? null;
            this.emitChanges();
        },

        emitChanges() {
            this.$emit('element-update', this.element);
        },
    },
};
