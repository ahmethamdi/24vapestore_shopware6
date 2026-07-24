import template from './vape-cms-el-config-product-spotlight.html.twig';
import './vape-cms-el-config-product-spotlight.scss';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

export default {
    template,

    mixins: [Mixin.getByName('cms-element')],

    computed: {
        /**
         * Ürün seçicinin criteria'sı. Editör önizlemesinde kapak gösterilebilmesi
         * için cover association eklenir.
         */
        productCriteria() {
            const criteria = new Criteria(1, 25);
            criteria.addAssociation('cover');

            return criteria;
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
    },

    methods: {
        /**
         * sw-entity-single-select `v-model:value` ile ID'yi config'e yazar.
         * Ayrıca element.data.product'ı güncel tutmak için değişimde
         * element-update emit edilir; auto-collect önizlemeyi tazeler.
         */
        onProductChange() {
            this.$emit('element-update', this.element);
        },
    },
};
