import template from './vape-cms-el-config-banner-grid.html.twig';
import './vape-cms-el-config-banner-grid.scss';

const { Mixin } = Shopware;

/**
 * Banner yapısı — yeni item eklenirken kullanılan varsayılan.
 * Yeni alan eklersen buraya da ekle, yoksa eski item'larda undefined kalır.
 */
function createBanner() {
    return {
        mediaId: null,  // arka plan görseli (opsiyonel)
        eyebrow: '',    // küçük üst etiket
        title: '',      // banner başlığı
        text: '',       // alt metin
        ctaText: '',    // CTA metni
        url: '',        // banner linki (tüm kart tıklanabilir)
    };
}

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // Banner medya entity'leri; anahtar = mediaId, değer = entity.
            // Item listesinde küçük görsel önizlemesi göstermek için tutulur.
            mediaEntities: {},
            // Hangi item için medya modal'ı açık — index veya null.
            mediaModalIndex: null,
        };
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        banners() {
            if (!Array.isArray(this.element?.config?.banners?.value)) {
                return [];
            }
            return this.element.config.banners.value;
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.ensureBannersArray();
        this.loadMedia();
    },

    methods: {
        /**
         * banners her zaman dizi olmalı. Element ilk kez eklendiğinde veya eski
         * bir kayıt açıldığında null/undefined gelebilir.
         */
        ensureBannersArray() {
            if (!this.element.config.banners) {
                this.element.config.banners = { source: 'static', value: [] };
            }
            if (!Array.isArray(this.element.config.banners.value)) {
                this.element.config.banners.value = [];
            }
        },

        /**
         * Config'te sadece mediaId'ler var; item listesinde görsel önizlemesi
         * göstermek için entity'leri yükler.
         */
        async loadMedia() {
            const ids = this.banners
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

        bannerMedia(banner) {
            return banner?.mediaId ? (this.mediaEntities[banner.mediaId] ?? null) : null;
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
            this.updateBanner(this.mediaModalIndex, { mediaId: media.id });
            this.mediaModalIndex = null;
        },

        onMediaRemove(index) {
            this.updateBanner(index, { mediaId: null });
        },

        // ---------- item yönetimi ----------

        onAddBanner() {
            this.element.config.banners.value = [...this.banners, createBanner()];
            this.emitChanges();
        },

        onRemoveBanner(index) {
            const next = [...this.banners];
            next.splice(index, 1);
            this.element.config.banners.value = next;
            this.emitChanges();
        },

        onMoveBanner(index, direction) {
            const target = index + direction;
            if (target < 0 || target >= this.banners.length) {
                return;
            }
            const next = [...this.banners];
            [next[index], next[target]] = [next[target], next[index]];
            this.element.config.banners.value = next;
            this.emitChanges();
        },

        /**
         * Item'ı kopyalayarak günceller. Vue 3 reaktivitesi dizi elemanının
         * yerinde mutasyonunu bazen kaçırdığı için yeni dizi atanır.
         */
        updateBanner(index, patch) {
            const next = [...this.banners];
            next[index] = { ...next[index], ...patch };
            this.element.config.banners.value = next;
            this.emitChanges();
        },

        emitChanges() {
            this.$emit('element-update', this.element);
        },
    },
};
