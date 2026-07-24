import template from './vape-cms-el-promo-banner.html.twig';
import './vape-cms-el-promo-banner.scss';

const { Mixin } = Shopware;

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

        mediaUrl() {
            return this.mediaEntity?.url ?? null;
        },

        bgColor() {
            return this.config?.bgColor?.value || '#18181d';
        },

        overlayOpacity() {
            const value = Number(this.config?.overlayOpacity?.value ?? 40);

            return Math.min(100, Math.max(0, value)) / 100;
        },

        textColor() {
            return this.config?.textColor?.value || 'light';
        },

        align() {
            return this.config?.align?.value || 'left';
        },

        bannerClasses() {
            return [
                `is--tone-${this.textColor}`,
                `is--align-${this.align}`,
            ];
        },

        bannerStyles() {
            const styles = { backgroundColor: this.bgColor };

            if (this.mediaUrl) {
                styles.backgroundImage = `url("${this.mediaUrl}")`;
            }

            return styles;
        },

        overlayStyles() {
            return {
                backgroundColor: `rgba(0, 0, 0, ${this.overlayOpacity})`,
            };
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
    },
};
