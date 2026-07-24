<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Shopware\Core\Content\Category\CategoryDefinition;
use Shopware\Core\Content\Category\CategoryEntity;
use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Defaults;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Struct\ArrayStruct;
use Shopware\Core\Framework\Uuid\Uuid;

/**
 * Kategori grid (mozaik) için kategori çözümleyici.
 *
 * `vape-category-carousel` resolver'ının kardeşi. Aynı desen:
 * kartlar config'te bir dizi olarak durur ve yalnızca kategori ID'si (+
 * opsiyonel CTA metni) içerir. Admin `entity` auto-collect dizi içindeki
 * ID'leri görmediği için storefront için burada elle çözümlenir.
 *
 * Akış: collect() tüm kartlardaki kategori ID'leri için TEK Criteria bildirir
 * (N+1 yok) → framework toplu sorgu çalıştırır → enrich() her kartı çözümlenmiş
 * CategoryEntity + ürün sayısı ile eşleştirip slot'a yazar → Twig
 * `element.data.cards` ile okur.
 *
 * KART BAŞINA ÜRETİLEN VERİ:
 *   - category   : CategoryEntity (media association dahil)
 *   - ctaText    : kart butonu metni (boşsa twig snippet'e düşer)
 *   - productCount: kategorinin alt ağacındaki görünür (aktif) ürün sayısı
 *
 * ÜRÜN SAYISI NEDEN BURADA HESAPLANIYOR:
 * DAL CategoryEntity'sinde ürün sayısı alanı YOK (`childCount` alt KATEGORİ
 * sayısıdır, ürün değil). Bu yüzden `product_category_tree` üzerinden TEK
 * toplu COUNT sorgusu çalıştırılır — tüm kartlar için tek sorgu, N+1 yok.
 * `product_category_tree` alt ağacı da kapsar (ana kategoriye doğrudan ürün
 * atanmasa bile alt kategorilerdeki ürünler sayılır). DB'de 0 ürün → "0 Ürün"
 * göstermek normaldir; sorgu hatası olursa 0'a düşülür ve render patlamaz.
 *
 * YAN 3 KÜÇÜK GÖRSEL: resolver YAN GÖRSEL çekmez. Mozaikteki büyük hücre ve
 * 3 küçük kare, twig'de `vape_category_image(category, ctx)` fonksiyonundan
 * beslenir (kategori medyası → yoksa alt ağaç ürün kapağı → yoksa baş harf).
 * Fonksiyon tek görsel döndürdüğü için küçük kareler nötr baş-harf yer
 * tutucudur; ayrı ürün görselleri toplamak N+1 riski taşıdığından bilinçli
 * olarak sade tutuldu (bkz. görev notu).
 *
 * ⚠️ Shopware entity ID'lerini küçük harfle saklar. Config'e büyük harfli bir
 *    ID yazılırsa arama eşleşmez ve entity sessizce bulunamaz — normalize edilir.
 */
class CategoryGridCmsElementResolver extends AbstractCmsElementResolver
{
    private const CATEGORY_KEY = 'vape-category-grid-categories';

    public function __construct(
        private readonly Connection $connection
    ) {
    }

    public function getType(): string
    {
        return 'vape-category-grid';
    }

    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        $cards = $this->readCards($slot);

        if ($cards === []) {
            return null;
        }

        $categoryIds = [];

        foreach ($cards as $card) {
            $categoryId = $this->normaliseId($card['categoryId'] ?? null);

            if ($categoryId !== null) {
                $categoryIds[$categoryId] = $categoryId;
            }
        }

        if ($categoryIds === []) {
            return null;
        }

        $criteria = new Criteria(\array_values($categoryIds));
        // Büyük mozaik görseli için kategori medyası; association olmadan N+1 olur.
        $criteria->addAssociation('media');

        $criteriaCollection = new CriteriaCollection();
        $criteriaCollection->add(
            self::CATEGORY_KEY . '_' . $slot->getUniqueIdentifier(),
            CategoryDefinition::class,
            $criteria
        );

        return $criteriaCollection;
    }

    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        $cards = $this->readCards($slot);

        if ($cards === []) {
            $slot->setData(new ArrayStruct(['cards' => []]));

            return;
        }

        $categoryResult = $result->get(self::CATEGORY_KEY . '_' . $slot->getUniqueIdentifier());

        // Önce çözülen kategori ID'lerini topla, ürün sayısını TEK sorguda al.
        $resolvedCategories = [];

        foreach ($cards as $card) {
            $categoryId = $this->normaliseId($card['categoryId'] ?? null);

            if ($categoryId === null || $categoryResult === null) {
                continue;
            }

            $category = $categoryResult->get($categoryId);

            if ($category instanceof CategoryEntity) {
                $resolvedCategories[$categoryId] = $card;
            }
        }

        $productCounts = $this->fetchProductCounts(\array_keys($resolvedCategories));

        $resolved = [];

        foreach ($cards as $card) {
            $categoryId = $this->normaliseId($card['categoryId'] ?? null);

            if ($categoryId === null || $categoryResult === null) {
                continue;
            }

            $category = $categoryResult->get($categoryId);

            if (!$category instanceof CategoryEntity) {
                continue;
            }

            $resolved[] = [
                'category' => $category,
                'ctaText' => (string) ($card['ctaText'] ?? ''),
                'productCount' => $productCounts[$categoryId] ?? 0,
            ];
        }

        $slot->setData(new ArrayStruct(['cards' => $resolved]));
    }

    /**
     * Kategori başına alt ağaç görünür ürün sayısı — TEK toplu sorgu.
     *
     * `product_category_tree` alt ağacı kapsar. Yalnızca aktif, canlı sürüm
     * ürünler sayılır. Varyant patlamasını önlemek için ana ürün + tekil
     * ürünler sayılır (varyantlar ayrı satır oluşturmasın diye parent'ı olan
     * ürünler ana ürüne indirgenir). Sorgu hatasında boş dizi döner ve twig
     * 0 gösterir — render asla patlamaz.
     *
     * @param array<int, string> $categoryIds hex ID listesi
     *
     * @return array<string, int> categoryId => ürün sayısı
     */
    private function fetchProductCounts(array $categoryIds): array
    {
        if ($categoryIds === []) {
            return [];
        }

        $binaryIds = \array_map(
            static fn (string $id): string => Uuid::fromHexToBytes($id),
            $categoryIds
        );

        $versionId = Uuid::fromHexToBytes(Defaults::LIVE_VERSION);

        // COUNT(DISTINCT ...): bir ürün alt ağaçta birden çok kez map'lenmişse
        // (nadir) tekrar sayılmasın. Varyantlar için COALESCE(parent_id, id) ile
        // ana ürüne indirgenir — böylece "9 varyant" yerine "1 ürün" sayılır.
        $sql = <<<'SQL'
            SELECT LOWER(HEX(pct.category_id)) AS category_id,
                   COUNT(DISTINCT COALESCE(p.parent_id, p.id)) AS product_count
            FROM product_category_tree pct
            INNER JOIN product p
                ON p.id = pct.product_id
               AND p.version_id = pct.product_version_id
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
            // Ürün sayısı süsleme bilgisi; sorgu hatası render'ı çökertmemeli.
            return [];
        }

        $counts = [];
        foreach ($rows as $row) {
            $categoryId = $row['category_id'] ?? null;

            if (\is_string($categoryId)) {
                $counts[$categoryId] = (int) ($row['product_count'] ?? 0);
            }
        }

        return $counts;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readCards(CmsSlotEntity $slot): array
    {
        $config = $slot->getFieldConfig()->get('categories');

        if ($config === null) {
            return [];
        }

        $value = $config->getValue();

        if (!\is_array($value)) {
            return [];
        }

        // Yalnızca dizi olan elemanları geçir — bozuk config render'ı çökertmesin.
        return \array_values(\array_filter($value, static fn ($card) => \is_array($card)));
    }

    private function normaliseId(mixed $id): ?string
    {
        if (!\is_string($id) || $id === '') {
            return null;
        }

        return \strtolower($id);
    }
}
