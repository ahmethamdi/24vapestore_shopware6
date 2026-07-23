<?php declare(strict_types=1);

namespace VapeStoreTheme\Subscriber;

use Shopware\Core\Content\Product\Events\ProductIndexerEvent;
use Shopware\Core\Framework\Adapter\Cache\CacheInvalidator;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use VapeStoreTheme\Service\CategoryImageResolver;

/**
 * Kategori yedek görsel cache'ini geçersiz kılar.
 *
 * NEDEN ProductIndexerEvent:
 * Cache'lediğimiz şey "şu kategorinin alt ağacındaki bir ürünün kapak
 * görseli". Bu sonuç yalnızca ürünler değiştiğinde bozulabilir:
 *   - yeni ürün eklendi / ürün silindi
 *   - ürünün kategori ataması değişti
 *   - ürünün kapak görseli değişti
 *   - ürün aktif/pasif oldu
 * Bunların HEPSİ product indexer'ı tetikler; `product_category_tree`
 * tablosunu da zaten aynı indexer doldurur. Yani indexer bittikten sonra
 * invalidate etmek doğru sıralamadır — tablo güncel olduktan SONRA temizleriz.
 *
 * NEDEN CORE İLE ÇAKIŞMAZ:
 * Kendi cache tag'imizi (CategoryImageResolver::CACHE_TAG) kullanıyoruz ve
 * yalnızca onu temizliyoruz. Core'un http cache / category route tag'lerine
 * dokunmuyoruz, onlar kendi subscriber'larıyla paralel çalışmaya devam eder.
 * Core'un CacheInvalidationSubscriber'ı da aynı CacheInvalidator servisini
 * kullanır; yani temizleme aynı mekanizmadan, aynı sırada akar.
 *
 * Not: Kategori MEDYASI değiştiğinde bir şey yapmaya gerek yok — o değer
 * cache'lenmiyor, her istekte NavigationRoute'tan taze geliyor.
 */
class CategoryImageCacheInvalidationSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly CacheInvalidator $cacheInvalidator
    ) {
    }

    /**
     * @return array<string, string>
     */
    public static function getSubscribedEvents(): array
    {
        return [
            ProductIndexerEvent::class => 'invalidateCategoryImages',
        ];
    }

    /**
     * Ürünler değiştiğinde kategori görsel cache'ini düşür.
     *
     * Hangi ürünün hangi kategoriyi etkilediğini ürün bazında hesaplamak
     * (ürünün tüm ata kategorilerini bulmak) ek sorgu gerektirirdi.
     * Bunun yerine tek ortak tag ile hepsini temizliyoruz: cache yeniden
     * dolması TEK toplu sorguya mal oluyor, dolayısıyla bu takas doğru.
     */
    public function invalidateCategoryImages(ProductIndexerEvent $event): void
    {
        if ($event->getIds() === []) {
            return;
        }

        $this->cacheInvalidator->invalidate([CategoryImageResolver::CACHE_TAG]);
    }
}
