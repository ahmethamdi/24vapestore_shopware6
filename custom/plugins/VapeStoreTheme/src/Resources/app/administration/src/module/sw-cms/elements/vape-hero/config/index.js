import template from './vape-cms-el-config-hero.html.twig';
import './vape-cms-el-config-hero.scss';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

/**
 * Slide yapısı — yeni slide eklenirken kullanılan varsayılan.
 * Yeni alan eklersen buraya da ekle, yoksa eski slide'larda undefined kalır.
 */
function createSlide() {
    return {
        mediaId: null,
        eyebrow: '',       // küçük etiket — "VON UNSEREN BELIEBTEN MARKEN"
        kicker: '',        // üst başlık — "ENTDECKE DIE MARKE"
        headline: '',      // büyük başlık — "The FuelCell Rebel"
        ctaText: '',
        ctaUrl: '',
        newTab: false,
        bgColor: '#3f3f4a',
        textColor: 'light',
        productIds: [],
    };
}

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            activeSlideIndex: 0,
            // Medya ve ürün entity'leri; anahtar = id, değer = entity.
            // Önizleme göstermek için tutulur (element.data slide dizisini kapsamaz).
            mediaEntities: {},
            productEntities: {},
        };
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        productRepository() {
            return this.repositoryFactory.create('product');
        },

        slides() {
            if (!Array.isArray(this.element?.config?.slides?.value)) {
                return [];
            }
            return this.element.config.slides.value;
        },

        activeSlide() {
            return this.slides[this.activeSlideIndex] ?? null;
        },

        productCriteria() {
            const criteria = new Criteria(1, 25);
            criteria.addAssociation('cover');
            return criteria;
        },

        textColorOptions() {
            return [
                { value: 'light', label: this.$t('vape-cms.elements.hero.config.tone.light') },
                { value: 'dark',  label: this.$t('vape-cms.elements.hero.config.tone.dark') },
            ];
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.ensureSlidesArray();
        this.loadEntities();
    },

    methods: {
        /**
         * slides her zaman dizi olmalı. Element ilk kez eklendiğinde veya
         * eski bir kayıt açıldığında null/undefined gelebilir.
         */
        ensureSlidesArray() {
            if (!this.element.config.slides) {
                this.element.config.slides = { source: 'static', value: [] };
            }
            if (!Array.isArray(this.element.config.slides.value)) {
                this.element.config.slides.value = [];
            }
        },

        /**
         * Config'te sadece ID'ler var; önizleme için entity'leri yükler.
         */
        async loadEntities() {
            const mediaIds = this.slides.map((s) => s.mediaId).filter(Boolean);
            const productIds = this.slides.flatMap((s) => s.productIds || []).filter(Boolean);

            if (mediaIds.length) {
                const criteria = new Criteria(1, 50);
                criteria.setIds(mediaIds);
                const result = await this.mediaRepository.search(criteria, Shopware.Context.api);
                result.forEach((entity) => { this.mediaEntities[entity.id] = entity; });
            }

            if (productIds.length) {
                const criteria = new Criteria(1, 100);
                criteria.setIds(productIds);
                criteria.addAssociation('cover');
                const result = await this.productRepository.search(criteria, Shopware.Context.api);
                result.forEach((entity) => { this.productEntities[entity.id] = entity; });
            }
        },

        // ---------- slide yönetimi ----------

        onAddSlide() {
            this.element.config.slides.value = [...this.slides, createSlide()];
            this.activeSlideIndex = this.slides.length - 1;
            this.emitChanges();
        },

        onRemoveSlide(index) {
            const next = [...this.slides];
            next.splice(index, 1);
            this.element.config.slides.value = next;

            if (this.activeSlideIndex >= next.length) {
                this.activeSlideIndex = Math.max(0, next.length - 1);
            }
            this.emitChanges();
        },

        onMoveSlide(index, direction) {
            const target = index + direction;
            if (target < 0 || target >= this.slides.length) {
                return;
            }

            const next = [...this.slides];
            [next[index], next[target]] = [next[target], next[index]];
            this.element.config.slides.value = next;
            this.activeSlideIndex = target;
            this.emitChanges();
        },

        onSelectSlide(index) {
            this.activeSlideIndex = index;
        },

        // ---------- medya ----------

        uploadTag(index) {
            return `cms-element-vape-hero-${this.element.id}-slide-${index}`;
        },

        mediaPreview(slide) {
            if (!slide?.mediaId) {
                return null;
            }
            return this.mediaEntities[slide.mediaId] ?? null;
        },

        onMediaSelectionChange(mediaEntity, index) {
            const media = mediaEntity[0];
            if (!media) {
                return;
            }

            this.mediaEntities[media.id] = media;
            this.updateSlide(index, { mediaId: media.id });
        },

        onMediaRemove(index) {
            this.updateSlide(index, { mediaId: null });
        },

        async onMediaUploadFinish({ targetId }, index) {
            const media = await this.mediaRepository.get(targetId, Shopware.Context.api);
            this.mediaEntities[media.id] = media;
            this.updateSlide(index, { mediaId: media.id });
        },

        // ---------- ürünler ----------

        productCollection(slide) {
            return (slide.productIds || [])
                .map((id) => this.productEntities[id])
                .filter(Boolean);
        },

        onProductsChange(collection, index) {
            const ids = [];
            collection.forEach((entity) => {
                this.productEntities[entity.id] = entity;
                ids.push(entity.id);
            });

            // Sol panelde 4 küçük resim gösteriliyor — fazlası kırpılır.
            this.updateSlide(index, { productIds: ids.slice(0, 4) });
        },

        // ---------- ortak ----------

        /**
         * Slide'ı kopyalayarak günceller. Vue 3 reaktivitesi dizi elemanının
         * yerinde mutasyonunu bazen kaçırdığı için yeni dizi atanır.
         */
        updateSlide(index, patch) {
            const next = [...this.slides];
            next[index] = { ...next[index], ...patch };
            this.element.config.slides.value = next;
            this.emitChanges();
        },

        emitChanges() {
            this.$emit('element-update', this.element);
        },
    },
};
