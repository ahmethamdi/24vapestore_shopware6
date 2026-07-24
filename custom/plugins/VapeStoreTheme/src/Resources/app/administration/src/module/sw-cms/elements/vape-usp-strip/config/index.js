import template from './vape-cms-el-config-usp-strip.html.twig';
import './vape-cms-el-config-usp-strip.scss';

const { Mixin } = Shopware;

/**
 * Yeni item eklenirken kullanılan varsayılan.
 * `icon` değerleri storefront sw_icon set'inden DOĞRULANMIŞ isimlerdir.
 */
function createItem() {
    return {
        icon: 'truck',
        title: '',
        text: '',
    };
}

/**
 * Seçilebilir ikonlar.
 *   value → storefront `sw_icon` adı (DOĞRULANDI: vendor .../dist/assets/icon/default)
 *   admin → editör önizlemesi + select satırında gösterilecek Meteor (mt-icon) adı
 * mt-icon farklı bir set kullandığı için ayrı bir eşleme tutulur; storefront
 * her koşulda `value`'yu basar.
 */
const ICON_OPTIONS = [
    { value: 'truck',            admin: 'regular-truck' },
    { value: 'package-open',     admin: 'regular-package-open' },
    { value: 'package-closed',   admin: 'regular-package-closed' },
    { value: 'package-gift',     admin: 'regular-gift' },
    { value: 'lock-closed',      admin: 'regular-lock' },
    { value: 'shield',           admin: 'regular-shield-check' },
    { value: 'checkmark-circle', admin: 'regular-checkmark-circle' },
    { value: 'money-card',       admin: 'regular-credit-card' },
    { value: 'star',             admin: 'regular-star' },
    { value: 'medal',            admin: 'regular-award' },
    { value: 'heart',            admin: 'regular-heart' },
    { value: 'clock',            admin: 'regular-clock' },
    { value: 'thumb-up',         admin: 'regular-thumbs-up' },
];

export default {
    template,

    mixins: [Mixin.getByName('cms-element')],

    computed: {
        items() {
            if (!Array.isArray(this.element?.config?.items?.value)) {
                return [];
            }
            return this.element.config.items.value;
        },

        /**
         * mt-select için { value, label } listesi. Etiketler snippet'ten gelir.
         */
        iconOptions() {
            return ICON_OPTIONS.map((opt) => ({
                value: opt.value,
                label: this.$t(`vape-cms.elements.uspStrip.icons.${opt.value}`),
            }));
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.ensureItemsArray();
    },

    methods: {
        /**
         * items her zaman dizi olmalı. Element ilk eklendiğinde veya eski
         * bir kayıt açıldığında null/undefined gelebilir.
         */
        ensureItemsArray() {
            if (!this.element.config.items) {
                this.element.config.items = { source: 'static', value: [] };
            }
            if (!Array.isArray(this.element.config.items.value)) {
                this.element.config.items.value = [];
            }
        },

        // Select satırında gösterilecek admin ikonu (dekoratif önizleme).
        adminIcon(item) {
            const match = ICON_OPTIONS.find((o) => o.value === item?.icon);
            return match ? match.admin : 'regular-circle';
        },

        // ---------- item yönetimi ----------

        onAddItem() {
            this.element.config.items.value = [...this.items, createItem()];
            this.emitChanges();
        },

        onRemoveItem(index) {
            const next = [...this.items];
            next.splice(index, 1);
            this.element.config.items.value = next;
            this.emitChanges();
        },

        onMoveItem(index, direction) {
            const target = index + direction;
            if (target < 0 || target >= this.items.length) {
                return;
            }
            const next = [...this.items];
            [next[index], next[target]] = [next[target], next[index]];
            this.element.config.items.value = next;
            this.emitChanges();
        },

        /**
         * Item'ı kopyalayarak günceller. Vue 3 reaktivitesi dizi elemanının
         * yerinde mutasyonunu bazen kaçırdığı için yeni dizi atanır.
         */
        updateItem(index, patch) {
            const next = [...this.items];
            next[index] = { ...next[index], ...patch };
            this.element.config.items.value = next;
            this.emitChanges();
        },

        emitChanges() {
            this.$emit('element-update', this.element);
        },
    },
};
