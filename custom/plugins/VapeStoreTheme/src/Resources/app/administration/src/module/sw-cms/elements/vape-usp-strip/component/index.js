import template from './vape-cms-el-usp-strip.html.twig';
import './vape-cms-el-usp-strip.scss';

const { Mixin } = Shopware;

/**
 * Storefront icon adı → editör önizlemesindeki Meteor (mt-icon) adı.
 * mt-icon storefront sw_icon'dan farklı bir set kullanır; bu yüzden yalnızca
 * editör görünümü için eşlenir. Storefront twig gerçek `sw_icon`'u basar.
 */
const ADMIN_ICON_MAP = {
    truck: 'regular-truck',
    'package-open': 'regular-package-open',
    'package-closed': 'regular-package-closed',
    'package-gift': 'regular-gift',
    'lock-closed': 'regular-lock',
    shield: 'regular-shield-check',
    'checkmark-circle': 'regular-checkmark-circle',
    'money-card': 'regular-credit-card',
    star: 'regular-star',
    medal: 'regular-award',
    heart: 'regular-heart',
    clock: 'regular-clock',
    'thumb-up': 'regular-thumbs-up',
};

export default {
    template,

    mixins: [Mixin.getByName('cms-element')],

    computed: {
        items() {
            if (!Array.isArray(this.element?.config?.items?.value)) {
                return [];
            }
            // Başlığı boş olan item'ları önizlemede de gizle — storefront ile tutarlı.
            return this.element.config.items.value.filter((i) => i && i.title);
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
    },

    methods: {
        adminIcon(item) {
            return ADMIN_ICON_MAP[item?.icon] ?? 'regular-circle';
        },
    },
};
