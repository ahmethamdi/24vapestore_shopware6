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

const registry = window.PluginManager;

registry.register('VapeHeroSlider', VapeHeroSliderPlugin, '[data-vape-hero-slider]');
registry.register('VapeStickyHeader', VapeStickyHeaderPlugin, 'body');
