import template from './vape-cms-el-config-promo-banner.html.twig';
import './vape-cms-el-config-promo-banner.scss';

const { Mixin } = Shopware;

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return {
            // Seçili medyayı önizleme kutusunda göstermek için tutulur.
            mediaEntity: null,
        };
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        uploadTag() {
            return `cms-element-vape-promo-banner-${this.element.id}`;
        },

        mediaPreview() {
            return this.mediaEntity;
        },

        textColorOptions() {
            return [
                { value: 'light', label: this.$t('vape-cms.elements.promoBanner.config.tone.light') },
                { value: 'dark', label: this.$t('vape-cms.elements.promoBanner.config.tone.dark') },
            ];
        },

        alignOptions() {
            return [
                { value: 'left', label: this.$t('vape-cms.elements.promoBanner.config.align.left') },
                { value: 'center', label: this.$t('vape-cms.elements.promoBanner.config.align.center') },
            ];
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
        this.loadMedia();
    },

    methods: {
        async loadMedia() {
            const mediaId = this.element?.config?.mediaId?.value;

            if (!mediaId) {
                this.mediaEntity = null;

                return;
            }

            this.mediaEntity = await this.mediaRepository.get(mediaId, Shopware.Context.api);
        },

        onMediaSelectionChange(mediaEntity) {
            const media = mediaEntity[0];

            if (!media) {
                return;
            }

            this.mediaEntity = media;
            this.element.config.mediaId.value = media.id;
            this.$emit('element-update', this.element);
        },

        onMediaRemove() {
            this.mediaEntity = null;
            this.element.config.mediaId.value = null;
            this.$emit('element-update', this.element);
        },

        async onMediaUploadFinish({ targetId }) {
            const media = await this.mediaRepository.get(targetId, Shopware.Context.api);
            this.mediaEntity = media;
            this.element.config.mediaId.value = media.id;
            this.$emit('element-update', this.element);
        },
    },
};
