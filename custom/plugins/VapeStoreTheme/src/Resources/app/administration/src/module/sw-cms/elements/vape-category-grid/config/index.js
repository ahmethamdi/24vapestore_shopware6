import template from './vape-cms-el-config-category-grid.html.twig';
import './vape-cms-el-config-category-grid.scss';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

/**
 * Kart yapısı — yeni kart eklenirken kullanılan varsayılan.
 * Yeni alan eklersen buraya da ekle, yoksa eski kartlarda undefined kalır.
 */
function createCard() {
    return {
        categoryId: null,
        ctaText: '',    // buton metni — boşsa storefront "İncele" snippet'ine düşer
    };
}

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // Kategori entity'leri; anahtar = id, değer = entity.
            // Kart listesinde kategori adını göstermek için tutulur.
            categoryEntities: {},
        };
    },

    computed: {
        categoryRepository() {
            return this.repositoryFactory.create('category');
        },

        cards() {
            if (!Array.isArray(this.element?.config?.categories?.value)) {
                return [];
            }
            return this.element.config.categories.value;
        },

        categoryCriteria() {
            const criteria = new Criteria(1, 50);
            criteria.addAssociation('media');
            return criteria;
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.ensureCardsArray();
        this.loadCategories();
    },

    methods: {
        /**
         * categories her zaman dizi olmalı. Element ilk kez eklendiğinde veya
         * eski bir kayıt açıldığında null/undefined gelebilir.
         */
        ensureCardsArray() {
            if (!this.element.config.categories) {
                this.element.config.categories = { source: 'static', value: [] };
            }
            if (!Array.isArray(this.element.config.categories.value)) {
                this.element.config.categories.value = [];
            }
        },

        /**
         * Config'te sadece ID'ler var; kart listesinde ad göstermek için
         * entity'leri yükler.
         */
        async loadCategories() {
            const ids = this.cards.map((c) => c.categoryId).filter(Boolean);

            if (!ids.length) {
                return;
            }

            const criteria = new Criteria(1, 100);
            criteria.setIds(ids);
            const result = await this.categoryRepository.search(criteria, Shopware.Context.api);
            result.forEach((entity) => { this.categoryEntities[entity.id] = entity; });
        },

        categoryName(card) {
            if (!card?.categoryId) {
                return '';
            }
            return this.categoryEntities[card.categoryId]?.translated?.name
                ?? this.categoryEntities[card.categoryId]?.name
                ?? '';
        },

        // ---------- kart yönetimi ----------

        onAddCard() {
            this.element.config.categories.value = [...this.cards, createCard()];
            this.emitChanges();
        },

        onRemoveCard(index) {
            const next = [...this.cards];
            next.splice(index, 1);
            this.element.config.categories.value = next;
            this.emitChanges();
        },

        onMoveCard(index, direction) {
            const target = index + direction;
            if (target < 0 || target >= this.cards.length) {
                return;
            }

            const next = [...this.cards];
            [next[index], next[target]] = [next[target], next[index]];
            this.element.config.categories.value = next;
            this.emitChanges();
        },

        async onCategoryChange(categoryId, index) {
            // sw-entity-single-select id döndürür; entity'yi ayrıca yükleyip
            // kart listesinde adını gösterebilmek için cache'e alırız.
            if (categoryId && !this.categoryEntities[categoryId]) {
                const entity = await this.categoryRepository.get(
                    categoryId,
                    Shopware.Context.api,
                    this.categoryCriteria,
                );
                if (entity) {
                    this.categoryEntities[entity.id] = entity;
                }
            }
            this.updateCard(index, { categoryId: categoryId ?? null });
        },

        // ---------- ortak ----------

        /**
         * Kartı kopyalayarak günceller. Vue 3 reaktivitesi dizi elemanının
         * yerinde mutasyonunu bazen kaçırdığı için yeni dizi atanır.
         */
        updateCard(index, patch) {
            const next = [...this.cards];
            next[index] = { ...next[index], ...patch };
            this.element.config.categories.value = next;
            this.emitChanges();
        },

        emitChanges() {
            this.$emit('element-update', this.element);
        },
    },
};
