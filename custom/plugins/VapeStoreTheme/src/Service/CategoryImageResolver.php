<?php declare(strict_types=1);

namespace VapeStoreTheme\Service;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Shopware\Core\Content\Media\MediaCollection;
use Shopware\Core\Content\Media\MediaEntity;
use Shopware\Core\Defaults;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Uuid\Uuid;
use Symfony\Component\Cache\Adapter\TagAwareAdapterInterface;
use Symfony\Contracts\Cache\ItemInterface;

/**
 * Mega menüde kategori başlığının yanında gösterilecek 48px görseli çözer.
 *
 * Öncelik sırası:
 *   1. Kategorinin kendi medyası (category.media) — bunu twig zaten
 *      `category.media` üzerinden okuyabilir, NavigationRoute onu ilişkilendiriyor.
 *      Bu servis o yüzden yalnızca 2. adımı üstlenir.
 *   2. Kategorinin ALT AĞACINDAKİ herhangi bir ürünün kapak görseli.
 *   3. Hiçbiri yoksa null → twig baş harfe düşer.
 *
 * NEDEN TEK TOPLU SORGU:
 * Mega menü her sayfa yüklemesinde ~12 ana kategori için render ediliyor.
 * Kategori başına ayrı sorgu (ya da DAL üzerinden kategori başına arama)
 * 12 sorgu/istek demek olurdu — 4000 SKU'da kabul edilemez. Bunun yerine
 * TÜM kategori id'leri tek `IN (...)` sorgusunda çözülür ve sonuç
 * cache'lenir. Cache dolu olduğunda sorgu sayısı SIFIR olur.
 *
 * NEDEN RAW SQL (DAL DEĞİL):
 * Burada gereken şey "kategori başına ilk ürünün kapak medyası" —
 * yani kategoriye göre gruplanmış bir toplama (aggregation). DAL Criteria
 * ile bunu tek sorguda ifade etmek mümkün değil; kategori başına ayrı
 * arama gerekirdi ki bu tam da kaçındığımız N+1. Ayrıca `product_category_tree`
 * bir mapping tablosu, DAL'da doğrudan sorgulanabilir bir entity değil.
 * Bu bilinçli bir okuma-yolu (read-path) optimizasyonudur; yazma yapmaz.
 *
 * NEDEN product_category_tree:
 * `product_category` yalnızca ürünün DOĞRUDAN atandığı kategorileri tutar.
 * Ana kategoriye ("E-Liquids") genelde hiç ürün doğrudan atanmaz; ürünler
 * alt kategorilerde durur. `product_category_tree` ise ürünü tüm ATA
 * kategorilerine bağlar, yani alt ağaç dahil. Görev "alt ağaç dahil"
 * dediği için doğru tablo budur.
 */
class CategoryImageResolver
{
    /**
     * Cache anahtarı öneki. Invalidation subscriber'ı da aynı öneki kullanır.
     */
    public const CACHE_KEY_PREFIX = 'vape_store.category_fallback_media.';

    /**
     * Tüm kategori görsel cache'lerini tek seferde temizlemek için
     * kullanılan ortak cache tag'i.
     */
    public const CACHE_TAG = 'vape-store-category-fallback-media';

    /**
     * 7 gün. Sonuç neredeyse hiç değişmez (bir kategorideki ilk ürün
     * görseli), gerçek güncelleme zaten event tabanlı invalidation ile
     * gelir. Uzun TTL yalnızca son güvenlik ağıdır.
     */
    private const CACHE_TTL = 604800;

    /**
     * @param EntityRepository<MediaCollection> $mediaRepository
     */
    public function __construct(
        private readonly Connection $connection,
        private readonly EntityRepository $mediaRepository,
        private readonly TagAwareAdapterInterface $cache
    ) {
    }

    /**
     * Tek bir kategori için yedek (fallback) ürün kapak görselini döner.
     *
     * Twig'den çağrılan asıl metot budur. İçeride toplu çözümleme yapılır,
     * bu yüzden aynı istekte 12 kez çağrılsa bile en fazla 1 sorgu çalışır.
     * Cache sıcakken SIFIR sorgu çalışır.
     *
     * @return CategoryImage|null Görsel bulunamazsa null (hata fırlatmaz)
     */
    public function getFallbackMedia(?string $categoryId, Context $context): ?CategoryImage
    {
        if ($categoryId === null || !Uuid::isValid($categoryId)) {
            return null;
        }

        $map = $this->getFallbackMediaMap([$categoryId], $context);

        return $map[$categoryId] ?? null;
    }

    /**
     * Birden çok kategori için yedek görselleri TEK seferde çözer.
     *
     * Cache'te hazır görsel DTO'su tutulur (mediaId değil), böylece sıcak
     * cache'te medya entity'sini yüklemek için DAL'a hiç gidilmez.
     *
     * @param array<int, string> $categoryIds
     *
     * @return array<string, CategoryImage> categoryId => CategoryImage
     *                                      (görseli olmayan kategoriler dizide yer almaz)
     */
    public function getFallbackMediaMap(array $categoryIds, Context $context): array
    {
        // Geçersiz / boş id'leri ele, tekrarları kaldır.
        $categoryIds = array_values(array_unique(array_filter(
            $categoryIds,
            static fn (?string $id): bool => $id !== null && Uuid::isValid($id)
        )));

        if ($categoryIds === []) {
            return [];
        }

        $resolved = [];
        $missing = [];

        // 1) Cache'te hazır olanları topla.
        foreach ($categoryIds as $categoryId) {
            $item = $this->cache->getItem(self::CACHE_KEY_PREFIX . $categoryId);

            if ($item->isHit()) {
                $value = $item->get();

                // false = "bu kategoride görsel YOK" anlamına gelen negatif cache.
                // Negatif sonucu da cache'liyoruz, yoksa ürünsüz kategoriler
                // her istekte DB'ye giderdi (bugünkü 0 ürünlü durum tam olarak bu).
                if ($value instanceof CategoryImage) {
                    $resolved[$categoryId] = $value;
                }

                continue;
            }

            $missing[] = $categoryId;
        }

        if ($missing === []) {
            return $resolved;
        }

        // 2) Eksik olanların medya id'lerini TEK sorguda çöz.
        $mediaIdByCategory = $this->fetchCoverMediaIds($missing);

        // 3) Medya entity'lerini TEK DAL sorgusuyla yükle (yalnızca soğuk yolda).
        $mediaEntities = $mediaIdByCategory === []
            ? []
            : $this->loadMedia(array_values(array_unique($mediaIdByCategory)), $context);

        // 4) DTO'ya çevir ve cache'le (bulunamayanlar için negatif cache).
        foreach ($missing as $categoryId) {
            $mediaId = $mediaIdByCategory[$categoryId] ?? null;
            $media = $mediaId !== null ? ($mediaEntities[$mediaId] ?? null) : null;

            $image = null;
            if ($media instanceof MediaEntity) {
                $image = new CategoryImage(
                    $media->getId(),
                    $media->getUrl(),
                    $media->getAlt(),
                    $media->getTitle()
                );
            }

            $item = $this->cache->getItem(self::CACHE_KEY_PREFIX . $categoryId);
            $item->set($image ?? false);
            $item->expiresAfter(self::CACHE_TTL);

            // Shopware'in kendi invalidation'ı bu tag'i temizleyebilsin diye
            // cache item'ı tag'liyoruz. cache.object pool'u tag destekli.
            if ($item instanceof ItemInterface) {
                $item->tag(self::CACHE_TAG);
            }

            $this->cache->save($item);

            if ($image !== null) {
                $resolved[$categoryId] = $image;
            }
        }

        return $resolved;
    }

    /**
     * Kategori başına BİR ürün kapak medyası id'si getirir — tek sorgu.
     *
     * Sorgu notları:
     *  - `product_category_tree` alt ağacı da kapsar (bkz. sınıf açıklaması).
     *  - Varyantlarda kapak görseli boş olabilir, o durumda ATA ürünün
     *    kapağına düşülür (`COALESCE`). Shopware'de `product_media_id`
     *    inherited bir alandır.
     *  - `MIN(...)` deterministik bir seçim sağlar: aynı kategori için
     *    her çalıştırmada aynı görsel gelir, menü sayfadan sayfaya zıplamaz.
     *  - Yalnızca aktif ürünler dikkate alınır.
     *
     * @param array<int, string> $categoryIds
     *
     * @return array<string, string> categoryId => mediaId
     */
    private function fetchCoverMediaIds(array $categoryIds): array
    {
        $binaryIds = array_map(
            static fn (string $id): string => Uuid::fromHexToBytes($id),
            $categoryIds
        );

        $versionId = Uuid::fromHexToBytes(Defaults::LIVE_VERSION);

        $sql = <<<'SQL'
            SELECT LOWER(HEX(pct.category_id))    AS category_id,
                   LOWER(HEX(MIN(pm.media_id)))   AS media_id
            FROM product_category_tree pct
            INNER JOIN product p
                ON p.id = pct.product_id
               AND p.version_id = pct.product_version_id
            LEFT JOIN product parent
                ON parent.id = p.parent_id
               AND parent.version_id = p.parent_version_id
            INNER JOIN product_media pm
                ON pm.id = COALESCE(p.product_media_id, parent.product_media_id)
               AND pm.version_id = p.version_id
            WHERE pct.category_id IN (:categoryIds)
              AND pct.category_version_id = :versionId
              AND p.version_id = :versionId
              AND p.active = 1
            GROUP BY pct.category_id
        SQL;

        try {
            $rows = $this->connection->fetchAllAssociative(
                $sql,
                [
                    'categoryIds' => $binaryIds,
                    'versionId' => $versionId,
                ],
                [
                    'categoryIds' => ArrayParameterType::BINARY,
                ]
            );
        } catch (\Throwable) {
            // Mega menü asla sorgu hatası yüzünden patlamamalı.
            // Görsel bulunamamış gibi davran, twig baş harfe düşer.
            return [];
        }

        $result = [];
        foreach ($rows as $row) {
            $categoryId = $row['category_id'] ?? null;
            $mediaId = $row['media_id'] ?? null;

            if (\is_string($categoryId) && \is_string($mediaId) && $mediaId !== '') {
                $result[$categoryId] = $mediaId;
            }
        }

        return $result;
    }

    /**
     * Medya entity'lerini tek DAL sorgusuyla yükler.
     *
     * Thumbnail association'ı AÇIKÇA ekleniyor — aksi halde twig'de
     * `sw_thumbnails` çağrısı her medya için ayrı sorgu tetikler (N+1).
     *
     * @param array<int, string> $mediaIds
     *
     * @return array<string, MediaEntity> mediaId => MediaEntity
     */
    private function loadMedia(array $mediaIds, Context $context): array
    {
        if ($mediaIds === []) {
            return [];
        }

        try {
            $criteria = new Criteria($mediaIds);
            $criteria->addAssociation('thumbnails');
            $criteria->setLimit(\count($mediaIds));

            /** @var MediaCollection $collection */
            $collection = $this->mediaRepository->search($criteria, $context)->getEntities();
        } catch (\Throwable) {
            return [];
        }

        $result = [];
        foreach ($collection as $media) {
            $result[$media->getId()] = $media;
        }

        return $result;
    }
}
