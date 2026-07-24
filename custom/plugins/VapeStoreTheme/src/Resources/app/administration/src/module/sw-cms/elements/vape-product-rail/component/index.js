import template from './vape-cms-el-product-rail.html.twig';
import './vape-cms-el-product-rail.scss';

const { Mixin } = Shopware;

/*
Ürün rayı — CMS editörü içindeki önizleme.

Editör önizlemesi element.data.products üzerinden çalışır:
  - static modda `entity` auto-collect bunu doldurur.
  - stream modda editörde ürünler ÇÖZÜLMEZ (resolver storefront'a özel);
    bu yüzden stream modda yönetici bir "stream seçili" bilgi kartı görür.

Boş/0 ürün durumunda nazik bir yer tutucu gösterilir — patlamaz.
*/
export default {
    template,

    mixins: [Mixin.getByName('cms-element')],

    computed: {
        headline() {
            return this.element?.config?.headline?.value ?? '';
        },

        subline() {
            return this.element?.config?.subline?.value ?? '';
        },

        productSource() {
            return this.element?.config?.productSource?.value ?? 'static';
        },

        isStream() {
            return this.productSource === 'stream';
        },

        hasStream() {
            return !!this.element?.config?.productStreamId?.value;
        },

        products() {
            const data = this.element?.data?.products;
            if (!data) {
                return [];
            }
            // EntityCollection veya düz dizi olabilir.
            if (Array.isArray(data)) {
                return data;
            }
            if (typeof data.filter === 'function') {
                return [...data];
            }
            return [];
        },

        showArrows() {
            return (this.element?.config?.showArrows?.value ?? true) && this.products.length > 1;
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
    },

    methods: {
        productName(product) {
            return product?.translated?.name ?? product?.name ?? '';
        },

        productImage(product) {
            return product?.cover?.media?.url ?? product?.cover?.media?.thumbnails?.[0]?.url ?? null;
        },

        productPrice(product) {
            const price = product?.calculatedPrice?.unitPrice
                ?? product?.price?.[0]?.gross
                ?? null;
            if (price === null || price === undefined) {
                return '';
            }
            return Number(price).toFixed(2);
        },
    },
};
