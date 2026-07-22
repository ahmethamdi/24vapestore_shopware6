import template from './vape-cms-el-hero.html.twig';
import './vape-cms-el-hero.scss';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            previewIndex: 0,
            mediaEntities: {},
        };
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        slides() {
            if (!Array.isArray(this.element?.config?.slides?.value)) {
                return [];
            }
            return this.element.config.slides.value;
        },

        currentSlide() {
            return this.slides[this.previewIndex] ?? null;
        },

        currentMediaUrl() {
            const id = this.currentSlide?.mediaId;
            return id ? (this.mediaEntities[id]?.url ?? null) : null;
        },

        panelStyles() {
            return {
                backgroundColor: this.currentSlide?.bgColor || '#3f3f4a',
            };
        },

        panelClasses() {
            return `is--tone-${this.currentSlide?.textColor || 'light'}`;
        },

        heroStyles() {
            return {
                minHeight: `${this.element?.config?.minHeight?.value ?? 520}px`,
            };
        },
    },

    watch: {
        // Yönetici slide eklediğinde/görsel değiştirdiğinde önizleme tazelensin
        slides: {
            handler() {
                this.clampPreviewIndex();
                this.loadMedia();
            },
            deep: true,
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.loadMedia();
    },

    methods: {
        clampPreviewIndex() {
            if (this.previewIndex >= this.slides.length) {
                this.previewIndex = Math.max(0, this.slides.length - 1);
            }
        },

        async loadMedia() {
            const ids = this.slides
                .map((s) => s.mediaId)
                .filter((id) => id && !this.mediaEntities[id]);

            if (!ids.length) {
                return;
            }

            const criteria = new Criteria(1, 50);
            criteria.setIds(ids);

            const result = await this.mediaRepository.search(criteria, Shopware.Context.api);
            result.forEach((entity) => { this.mediaEntities[entity.id] = entity; });
        },

        onPreviewDot(index) {
            this.previewIndex = index;
        },
    },
};
