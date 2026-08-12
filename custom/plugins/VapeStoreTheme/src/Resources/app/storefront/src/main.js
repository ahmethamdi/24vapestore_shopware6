/*
24VapeStore — Storefront giriş noktası
==================================================
Storefront JS, Shopware'in plugin sistemi üzerinden kaydedilir.
Inline <script> veya doğrudan DOM manipülasyonu KULLANILMAZ.

⚠️ Bu dosyadaki değişiklikler `bin/build-storefront.sh` ile derlenip
   dist/ altına yazılmadıkça storefront'ta görünmez.
*/

import VapeHeroSliderPlugin from './plugin/vape-hero-slider/vape-hero-slider.plugin';
import VapeMobileNavPlugin from './plugin/vape-mobile-nav/vape-mobile-nav.plugin';
import VapeCategoryCarouselPlugin from './plugin/vape-category-carousel/vape-category-carousel.plugin';
import VapeProductRailPlugin from './plugin/vape-product-rail/vape-product-rail.plugin';
import VapeFeaturedSplitPlugin from './plugin/vape-featured-split/vape-featured-split.plugin';
import VapeProductTabsPlugin from './plugin/vape-product-tabs/vape-product-tabs.plugin';
import VapeBrandSliderPlugin from './plugin/vape-brand-slider/vape-brand-slider.plugin';
import VapeDealsCountdownPlugin from './plugin/vape-deals-countdown/vape-deals-countdown.plugin';
import VapeAgeGatePlugin from './plugin/vape-age-gate/vape-age-gate.plugin';
import VapePdpStickyBuyPlugin from './plugin/vape-pdp-sticky-buy/vape-pdp-sticky-buy.plugin';

const registry = window.PluginManager;

registry.register('VapeHeroSlider', VapeHeroSliderPlugin, '[data-vape-hero-slider]');

/*
   ⚠️ VapeStickyHeader KAYDI KALDIRILDI (2026-08-11, header v3).

   Header v3'te sticky SAF CSS: yapışan öğe `.vape-h3__rail`, sabit
   yükseklikli ayrı bir satır (`position: sticky; top: 0`).

   JS eklenti `body.is--header-sticky` sınıfını basıyor ve o sınıf
   `_header.scss`te `.header-main`i `position: fixed` yapıyordu — bu
   v3'ün CSS sticky'sini DOĞRUDAN BOZAR (iki konumlanma modeli aynı
   öğede yarışır).

   Eklenti ayrıca header'ı ölçüp `--vape-header-height` yazıyordu; ölçüm
   200ms'lik küçülme animasyonunun ortasında yapıldığı için fazla büyük
   çıkıyor, nav çok aşağıda başlıyor ve arada boşluk kalıyordu
   ($vape-header-sticky-height: 67px sabiti bu yüzden eklenmişti).
   Sabit yükseklikli sticky satırda ölçülecek bir şey yok — yarış da yok.

   Eklenti dosyası SİLİNMEDİ (plugin/vape-sticky-header/), yalnızca
   kaydı kaldırıldı. v3 geri alınırsa buradaki import + register
   satırlarını geri koymak yeterli.
*/
registry.register('VapeCategoryCarousel', VapeCategoryCarouselPlugin, '[data-vape-category-carousel]');
registry.register('VapeProductRail', VapeProductRailPlugin, '[data-vape-product-rail]');
registry.register('VapeFeaturedSplit', VapeFeaturedSplitPlugin, '[data-vape-featured-split]');
registry.register('VapeProductTabs', VapeProductTabsPlugin, '[data-vape-product-tabs]');
registry.register('VapeBrandSlider', VapeBrandSliderPlugin, '[data-vape-brand-slider]');
registry.register('VapeDealsCountdown', VapeDealsCountdownPlugin, '.vape-deals');
// Age-gate: yasal kapı, her sayfada. CMS element DEĞİL — gerekçe
// component/age-gate.html.twig başındaki nota bakınız.
registry.register('VapeAgeGate', VapeAgeGatePlugin, '[data-vape-age-gate]');
// Mobil alt gezinme — sepet rozetini header widget'ından senkronlar.
registry.register('VapeMobileNav', VapeMobileNavPlugin, '[data-vape-mobile-nav]');
// PDP mobil sticky satın alma barı — ana CTA ekrandan çıkınca belirir.
// Bar core satın alma formuna bağlıdır (kendi formu yok).
registry.register('VapePdpStickyBuy', VapePdpStickyBuyPlugin, '[data-vape-pdp-bar]');
