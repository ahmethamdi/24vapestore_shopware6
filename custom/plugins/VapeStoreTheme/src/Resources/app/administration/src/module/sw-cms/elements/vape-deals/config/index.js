import template from './vape-cms-el-config-deals.html.twig';
import './vape-cms-el-config-deals.scss';

const { Mixin } = Shopware;

/**
 * Deal yapısı — yeni item eklenirken kullanılan varsayılan.
 * Yeni alan eklersen buraya da ekle, yoksa eski item'larda undefined kalır.
 */
function createDeal() {
    const end = new Date();
    end.setHours(23, 59, 59, 0);
    end.setDate(end.getDate() + 1);

    return {
        mediaId: null,   // kampanya banner görseli (opsiyonel)
        brandLabel: '',  // küçük gri marka etiketi
        title: '',       // kalın ürün/kampanya adı — boşsa storefront'ta render EDİLMEZ
        price: '',       // fiyat metni (ör. "6,99 €")
        url: '',         // Kaufen linki
        endDate: end.toISOString(), // geri sayım hedefi (ISO)
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

        deals() {
            if (!Array.isArray(this.element?.config?.deals?.value)) {
                return [];
            }
            return this.element.config.deals.value;
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.ensureDealsArray();
        this.loadMedia();
    },

    methods: {
        /**
         * deals her zaman dizi olmalı. Element ilk kez eklendiğinde veya eski
         * bir kayıt açıldığında null/undefined gelebilir.
         */
        ensureDealsArray() {
            if (!this.element.config.deals) {
                this.element.config.deals = { source: 'static', value: [] };
            }
            if (!Array.isArray(this.element.config.deals.value)) {
                this.element.config.deals.value = [];
            }
        },

        /**
         * Config'te sadece mediaId'ler var; item listesinde görsel önizlemesi
         * göstermek için entity'leri yükler.
         */
        async loadMedia() {
            const ids = this.deals
                .map((d) => d.mediaId)
                .filter((id) => id && !this.mediaEntities[id]);

            if (!ids.length) {
                return;
            }

            const criteria = new Shopware.Data.Criteria(1, 100);
            criteria.setIds(ids);

            const result = await this.mediaRepository.search(criteria, Shopware.Context.api);
            result.forEach((entity) => { this.mediaEntities[entity.id] = entity; });
        },

        dealMedia(deal) {
            return deal?.mediaId ? (this.mediaEntities[deal.mediaId] ?? null) : null;
        },

        /**
         * mt-datepicker ISO string ile çalışır; boş/bozuk değeri güvenli döndür.
         */
        dealEndDate(deal) {
            return deal?.endDate || null;
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
            this.updateDeal(this.mediaModalIndex, { mediaId: media.id });
            this.mediaModalIndex = null;
        },

        onMediaRemove(index) {
            this.updateDeal(index, { mediaId: null });
        },

        // ---------- item yönetimi ----------

        onAddDeal() {
            this.element.config.deals.value = [...this.deals, createDeal()];
            this.emitChanges();
        },

        onRemoveDeal(index) {
            const next = [...this.deals];
            next.splice(index, 1);
            this.element.config.deals.value = next;
            this.emitChanges();
        },

        onMoveDeal(index, direction) {
            const target = index + direction;
            if (target < 0 || target >= this.deals.length) {
                return;
            }
            const next = [...this.deals];
            [next[index], next[target]] = [next[target], next[index]];
            this.element.config.deals.value = next;
            this.emitChanges();
        },

        /**
         * Item'ı kopyalayarak günceller. Vue 3 reaktivitesi dizi elemanının
         * yerinde mutasyonunu bazen kaçırdığı için yeni dizi atanır.
         */
        updateDeal(index, patch) {
            const next = [...this.deals];
            next[index] = { ...next[index], ...patch };
            this.element.config.deals.value = next;
            this.emitChanges();
        },

        emitChanges() {
            this.$emit('element-update', this.element);
        },
    },
};
