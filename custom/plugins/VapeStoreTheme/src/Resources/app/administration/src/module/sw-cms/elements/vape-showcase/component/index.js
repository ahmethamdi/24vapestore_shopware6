import template from './vape-cms-el-showcase.html.twig';
import './vape-cms-el-showcase.scss';

const { Mixin } = Shopware;

/*
Vitrin — CMS editörü içindeki önizleme.

SOL banner: config metinleri + (varsa) seçili medya arka planı.
SAĞ ızgara: element.data.products üzerinden çalışır.
  - static modda `entity` auto-collect bunu doldurur.
  - stream modda editörde ürünler ÇÖZÜLMEZ (resolver storefront'a özel);
    bu yüzden stream modda yönetici bir "stream seçili" bilgi kartı görür.

Boş/0 ürün / görselsiz durumda nazik yer tutucular gösterilir — patlamaz.
*/
export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            mediaEntity: null,
        };
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        config() {
            return this.element?.config ?? {};
        },

        // ---------- banner ----------
        mediaUrl() {
            return this.mediaEntity?.url ?? null;
        },

        bgColor() {
            return this.config?.bgColor?.value || '#18181d';
        },

        overlayOpacity() {
            const value = Number(this.config?.overlayOpacity?.value ?? 45);
            return Math.min(100, Math.max(0, value)) / 100;
        },

        eyebrow() {
            return this.config?.eyebrow?.value ?? '';
        },

        title() {
            return this.config?.title?.value ?? '';
        },

        text() {
            return this.config?.text?.value ?? '';
        },

        ctaText() {
            return this.config?.ctaText?.value ?? '';
        },

        bannerStyles() {
            const styles = { backgroundColor: this.bgColor };
            if (this.mediaUrl) {
                styles.backgroundImage = `url("${this.mediaUrl}")`;
            }
            return styles;
        },

        overlayStyles() {
            return { backgroundColor: `rgba(0, 0, 0, ${this.overlayOpacity})` };
        },

        // ---------- ürünler ----------
        productSource() {
            return this.config?.productSource?.value ?? 'static';
        },

        isStream() {
            return this.productSource === 'stream';
        },

        hasStream() {
            return !!this.config?.productStreamId?.value;
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
    },

    watch: {
        'element.config.mediaId.value'() {
            this.loadMedia();
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.loadMedia();
    },

    methods: {
        async loadMedia() {
            const mediaId = this.config?.mediaId?.value;

            if (!mediaId) {
                this.mediaEntity = null;
                return;
            }

            if (this.mediaEntity?.id === mediaId) {
                return;
            }

            this.mediaEntity = await this.mediaRepository.get(mediaId, Shopware.Context.api);
        },

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
