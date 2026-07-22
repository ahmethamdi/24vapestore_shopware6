import template from './vape-cms-el-hero.html.twig';
import './vape-cms-el-hero.scss';

const { Mixin } = Shopware;

export default {
    template,

    mixins: [Mixin.getByName('cms-element')],

    computed: {
        mediaUrl() {
            // Editörde canlı önizleme: element.data.media otomatik collect/enrich
            // ile gelir (defaultConfig'te `entity` tanımlı olduğu için).
            return this.element?.data?.media?.url || null;
        },

        heroStyles() {
            const config = this.element?.config || {};

            return {
                minHeight: `${config.minHeight?.value ?? 480}px`,
                justifyContent: config.verticalAlign?.value ?? 'center',
                textAlign: config.textAlign?.value ?? 'left',
                backgroundImage: this.mediaUrl ? `url("${this.mediaUrl}")` : 'none',
            };
        },

        overlayStyles() {
            const opacity = (this.element?.config?.overlayOpacity?.value ?? 35) / 100;
            return { backgroundColor: `rgba(0, 0, 0, ${opacity})` };
        },

        contentClasses() {
            const align = this.element?.config?.textAlign?.value ?? 'left';
            const tone = this.element?.config?.textColor?.value ?? 'light';

            return [
                `is--align-${align}`,
                `is--tone-${tone}`,
            ];
        },
    },

    created() {
        // ⚠️ 6.7: initElementConfig() argüman ALMAZ.
        this.initElementConfig();
    },
};
