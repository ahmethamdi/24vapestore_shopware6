<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Shopware\Core\Content\Category\CategoryDefinition;
use Shopware\Core\Content\Category\CategoryEntity;
use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Struct\ArrayStruct;

/**
 * Kategori carousel için kategori çözümleyici.
 *
 * Kartlar config'te bir dizi olarak durur ve yalnızca kategori ID'si içerir.
 * Admin tarafındaki `entity` auto-collect düz alanlar için çalışır, dizi
 * içindeki ID'leri görmez — bu yüzden storefront için burada elle çözümlenir.
 *
 * Akış: collect() tüm kartlardaki kategori ID'leri için TEK Criteria bildirir
 * (N+1 yok) → framework toplu sorgu çalıştırır → enrich() her kartı çözümlenmiş
 * CategoryEntity ile eşleştirip slot'a yazar → Twig `element.data.cards` ile okur.
 *
 * Kategori medyası `media` association'ı ile yüklenir. Kategorinin kendi medyası
 * yoksa storefront twig'i `vape_category_image()` fonksiyonuna düşerek alt
 * ağaçtaki bir ürün kapağını gösterir.
 *
 * ⚠️ Shopware entity ID'lerini küçük harfle saklar. Config'e büyük harfli bir ID
 *    yazılırsa arama eşleşmez ve entity sessizce bulunamaz — ID'ler burada
 *    normalize edilir.
 */
class CategoryCarouselCmsElementResolver extends AbstractCmsElementResolver
{
    private const CATEGORY_KEY = 'vape-category-carousel-categories';

    public function getType(): string
    {
        return 'vape-category-carousel';
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
        // Kart görseli için kategori medyası; association olmadan N+1 olur.
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
                'badge' => (string) ($card['badge'] ?? ''),
                'ctaText' => (string) ($card['ctaText'] ?? ''),
            ];
        }

        $slot->setData(new ArrayStruct(['cards' => $resolved]));
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
