import template from './vape-cms-el-config-hero.html.twig';
import './vape-cms-el-config-hero.scss';

const { Mixin } = Shopware;

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        uploadTag() {
            return `cms-element-vape-hero-${this.element.id}`;
        },

        previewSource() {
            return this.element?.data?.media?.id ? this.element.data.media : null;
        },

        textAlignOptions() {
            return [
                { value: 'left',   label: this.$t('vape-cms.elements.hero.config.align.left') },
                { value: 'center', label: this.$t('vape-cms.elements.hero.config.align.center') },
                { value: 'right',  label: this.$t('vape-cms.elements.hero.config.align.right') },
            ];
        },

        verticalAlignOptions() {
            return [
                { value: 'flex-start', label: this.$t('vape-cms.elements.hero.config.vAlign.top') },
                { value: 'center',     label: this.$t('vape-cms.elements.hero.config.vAlign.center') },
                { value: 'flex-end',   label: this.$t('vape-cms.elements.hero.config.vAlign.bottom') },
            ];
        },

        textColorOptions() {
            return [
                { value: 'light', label: this.$t('vape-cms.elements.hero.config.tone.light') },
                { value: 'dark',  label: this.$t('vape-cms.elements.hero.config.tone.dark') },
            ];
        },

        ctaVariantOptions() {
            return [
                { value: 'primary',   label: this.$t('vape-cms.elements.hero.config.ctaVariant.primary') },
                { value: 'secondary', label: this.$t('vape-cms.elements.hero.config.ctaVariant.secondary') },
            ];
        },
    },

    created() {
        // ⚠️ 6.7: argümansız.
        this.initElementConfig();
    },

    methods: {
        onSelectionChanges(mediaEntity) {
            const media = mediaEntity[0];
            if (!media) {
                return;
            }

            this.element.config.media.value = media.id;
            this.element.data.media = media;
        },

        onMediaRemove() {
            this.element.config.media.value = null;
            this.element.data.media = null;
        },

        async onMediaUploadFinish({ targetId }) {
            const media = await this.mediaRepository.get(targetId, Shopware.Context.api);

            this.element.config.media.value = media.id;
            this.element.data.media = media;
        },
    },
};
