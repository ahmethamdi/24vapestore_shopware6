/*
24VapeStore — Storefront giriş noktası
==================================================
Storefront JS, Shopware'in plugin sistemi üzerinden kaydedilir.
Inline <script> veya doğrudan DOM manipülasyonu KULLANILMAZ.

⚠️ Bu dosyadaki değişiklikler `bin/build-storefront.sh` ile derlenip
   dist/ altına yazılmadıkça storefront'ta görünmez.
*/

import VapeHeroSliderPlugin from './plugin/vape-hero-slider/vape-hero-slider.plugin';
import VapeStickyHeaderPlugin from './plugin/vape-sticky-header/vape-sticky-header.plugin';
import VapeCategoryCarouselPlugin from './plugin/vape-category-carousel/vape-category-carousel.plugin';
import VapeProductRailPlugin from './plugin/vape-product-rail/vape-product-rail.plugin';
import VapeFeaturedSplitPlugin from './plugin/vape-featured-split/vape-featured-split.plugin';
import VapeProductTabsPlugin from './plugin/vape-product-tabs/vape-product-tabs.plugin';
import VapeBrandSliderPlugin from './plugin/vape-brand-slider/vape-brand-slider.plugin';
import VapeDealsCountdownPlugin from './plugin/vape-deals-countdown/vape-deals-countdown.plugin';

const registry = window.PluginManager;

registry.register('VapeHeroSlider', VapeHeroSliderPlugin, '[data-vape-hero-slider]');
registry.register('VapeStickyHeader', VapeStickyHeaderPlugin, 'body');
registry.register('VapeCategoryCarousel', VapeCategoryCarouselPlugin, '[data-vape-category-carousel]');
registry.register('VapeProductRail', VapeProductRailPlugin, '[data-vape-product-rail]');
registry.register('VapeFeaturedSplit', VapeFeaturedSplitPlugin, '[data-vape-featured-split]');
registry.register('VapeProductTabs', VapeProductTabsPlugin, '[data-vape-product-tabs]');
registry.register('VapeBrandSlider', VapeBrandSliderPlugin, '[data-vape-brand-slider]');
registry.register('VapeDealsCountdown', VapeDealsCountdownPlugin, '.vape-deals');
