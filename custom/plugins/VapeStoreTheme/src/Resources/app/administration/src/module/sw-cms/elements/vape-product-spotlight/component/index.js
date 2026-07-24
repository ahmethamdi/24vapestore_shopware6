import template from './vape-cms-el-product-spotlight.html.twig';
import './vape-cms-el-product-spotlight.scss';

const { Mixin } = Shopware;

export default {
    template,

    mixins: [Mixin.getByName('cms-element')],

    computed: {
        config() {
            return this.element?.config ?? {};
        },

        /**
         * Editörde ürün, config.productId'nin `entity` tanımı sayesinde
         * auto-collect ile element.data.product'a gelir.
         */
        product() {
            return this.element?.data?.product ?? null;
        },

        coverUrl() {
            return this.product?.cover?.media?.url ?? null;
        },

        productName() {
            return this.product?.translated?.name ?? this.product?.name ?? '';
        },

        eyebrow() {
            return this.config?.eyebrow?.value ?? '';
        },

        description() {
            return this.config?.description?.value ?? '';
        },

        ctaText() {
            return this.config?.ctaText?.value ?? '';
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
    },
};
