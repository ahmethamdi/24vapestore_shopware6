import template from './vape-cms-el-config-brand-slider.html.twig';
import './vape-cms-el-config-brand-slider.scss';

const { Mixin } = Shopware;

/**
 * Marka yapısı — yeni marka eklenirken kullanılan varsayılan.
 * Yeni alan eklersen buraya da ekle, yoksa eski markalarda undefined kalır.
 */
function createBrand() {
    return {
        mediaId: null, // logo görseli (opsiyonel) — yoksa storefront ada düşer
        name: '',      // marka adı — logo alt metni + logosuz fallback
        url: '',       // marka sayfası linki (opsiyonel)
    };
}

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // Logo medya entity'leri; anahtar = mediaId, değer = entity.
            // Marka listesinde küçük logo önizlemesi göstermek için tutulur.
            mediaEntities: {},
            // Hangi marka için medya modal'ı açık — index veya null.
            mediaModalIndex: null,
        };
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        brands() {
            if (!Array.isArray(this.element?.config?.brands?.value)) {
                return [];
            }
            return this.element.config.brands.value;
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.ensureBrandsArray();
        this.loadMedia();
    },

    methods: {
        /**
         * brands her zaman dizi olmalı. Element ilk kez eklendiğinde veya eski
         * bir kayıt açıldığında null/undefined gelebilir.
         */
        ensureBrandsArray() {
            if (!this.element.config.brands) {
                this.element.config.brands = { source: 'static', value: [] };
            }
            if (!Array.isArray(this.element.config.brands.value)) {
                this.element.config.brands.value = [];
            }
        },

        /**
         * Config'te sadece mediaId'ler var; marka listesinde logo önizlemesi
         * göstermek için entity'leri yükler.
         */
        async loadMedia() {
            const ids = this.brands
                .map((b) => b.mediaId)
                .filter((id) => id && !this.mediaEntities[id]);

            if (!ids.length) {
                return;
            }

            const criteria = new Shopware.Data.Criteria(1, 100);
            criteria.setIds(ids);

            const result = await this.mediaRepository.search(criteria, Shopware.Context.api);
            result.forEach((entity) => { this.mediaEntities[entity.id] = entity; });
        },

        brandMedia(brand) {
            return brand?.mediaId ? (this.mediaEntities[brand.mediaId] ?? null) : null;
        },

        // ---------- medya seçimi ----------

        onOpenMediaModal(index) {
            this.mediaModalIndex = index;
        },

        onCloseMediaModal() {
            this.mediaModalIndex = null;
        },

        async onMediaSelection(selection) {
            const media = selection[0];
            if (!media) {
                return;
            }
            this.mediaEntities[media.id] = media;
            this.updateBrand(this.mediaModalIndex, { mediaId: media.id });
            this.mediaModalIndex = null;
        },

        onMediaRemove(index) {
            this.updateBrand(index, { mediaId: null });
        },

        // ---------- marka yönetimi ----------

        onAddBrand() {
            this.element.config.brands.value = [...this.brands, createBrand()];
            this.emitChanges();
        },

        onRemoveBrand(index) {
            const next = [...this.brands];
            next.splice(index, 1);
            this.element.config.brands.value = next;
            this.emitChanges();
        },

        onMoveBrand(index, direction) {
            const target = index + direction;
            if (target < 0 || target >= this.brands.length) {
                return;
            }

            const next = [...this.brands];
            [next[index], next[target]] = [next[target], next[index]];
            this.element.config.brands.value = next;
            this.emitChanges();
        },

        // ---------- ortak ----------

        /**
         * Markayı kopyalayarak günceller. Vue 3 reaktivitesi dizi elemanının
         * yerinde mutasyonunu bazen kaçırdığı için yeni dizi atanır.
         */
        updateBrand(index, patch) {
            const next = [...this.brands];
            next[index] = { ...next[index], ...patch };
            this.element.config.brands.value = next;
            this.emitChanges();
        },

        emitChanges() {
            this.$emit('element-update', this.element);
        },
    },
};
