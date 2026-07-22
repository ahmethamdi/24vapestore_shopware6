<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Media\MediaDefinition;
use Shopware\Core\Content\Media\MediaEntity;
use Shopware\Core\Content\Product\ProductDefinition;
use Shopware\Core\Content\Product\ProductEntity;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Struct\ArrayStruct;

/**
 * Hero slider için medya ve ürün çözümleyici.
 *
 * Slide'lar config'te bir dizi olarak durur ve yalnızca ID içerir. Admin
 * tarafındaki `entity` auto-collect düz alanlar için çalışır, dizi içindeki
 * ID'leri görmez — bu yüzden storefront için burada elle çözümlenir.
 *
 * Akış: collect() tüm slide'lardaki medya + ürün ID'leri için Criteria bildirir →
 * framework toplu sorgu çalıştırır → enrich() her slide'ı entity'lerle
 * zenginleştirip slot'a yazar → Twig `element.data.slides` ile okur.
 *
 * ⚠️ Shopware entity ID'lerini küçük harfle saklar. Config'e büyük harfli bir ID
 *    yazılırsa arama eşleşmez ve entity sessizce bulunamaz — ID'ler burada
 *    normalize edilir.
 */
class HeroCmsElementResolver extends AbstractCmsElementResolver
{
    private const MEDIA_KEY = 'vape-hero-media';
    private const PRODUCT_KEY = 'vape-hero-products';
    private const MAX_PRODUCTS_PER_SLIDE = 4;

    public function getType(): string
    {
        return 'vape-hero';
    }

    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        $slides = $this->readSlides($slot);

        if ($slides === []) {
            return null;
        }

        $mediaIds = [];
        $productIds = [];

        foreach ($slides as $slide) {
            $mediaId = $this->normaliseId($slide['mediaId'] ?? null);

            if ($mediaId !== null) {
                $mediaIds[$mediaId] = $mediaId;
            }

            foreach (\array_slice($slide['productIds'] ?? [], 0, self::MAX_PRODUCTS_PER_SLIDE) as $productId) {
                $productId = $this->normaliseId($productId);

                if ($productId !== null) {
                    $productIds[$productId] = $productId;
                }
            }
        }

        if ($mediaIds === [] && $productIds === []) {
            return null;
        }

        $criteriaCollection = new CriteriaCollection();

        if ($mediaIds !== []) {
            $criteriaCollection->add(
                self::MEDIA_KEY . '_' . $slot->getUniqueIdentifier(),
                MediaDefinition::class,
                new Criteria(\array_values($mediaIds))
            );
        }

        if ($productIds !== []) {
            $productCriteria = new Criteria(\array_values($productIds));
            // Küçük resim için kapak görseli gerekiyor; association olmadan N+1 olur.
            $productCriteria->addAssociation('cover.media');

            $criteriaCollection->add(
                self::PRODUCT_KEY . '_' . $slot->getUniqueIdentifier(),
                ProductDefinition::class,
                $productCriteria
            );
        }

        return $criteriaCollection;
    }

    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        $slides = $this->readSlides($slot);

        if ($slides === []) {
            $slot->setData(new ArrayStruct(['slides' => []]));

            return;
        }

        $mediaResult = $result->get(self::MEDIA_KEY . '_' . $slot->getUniqueIdentifier());
        $productResult = $result->get(self::PRODUCT_KEY . '_' . $slot->getUniqueIdentifier());

        $resolved = [];

        foreach ($slides as $slide) {
            $mediaId = $this->normaliseId($slide['mediaId'] ?? null);
            $media = null;

            if ($mediaId !== null && $mediaResult !== null) {
                $candidate = $mediaResult->get($mediaId);
                $media = $candidate instanceof MediaEntity ? $candidate : null;
            }

            $products = [];

            foreach (\array_slice($slide['productIds'] ?? [], 0, self::MAX_PRODUCTS_PER_SLIDE) as $productId) {
                $productId = $this->normaliseId($productId);

                if ($productId === null || $productResult === null) {
                    continue;
                }

                $product = $productResult->get($productId);

                if ($product instanceof ProductEntity) {
                    $products[] = $product;
                }
            }

            $resolved[] = [
                'media' => $media,
                'products' => $products,
                'eyebrow' => (string) ($slide['eyebrow'] ?? ''),
                'kicker' => (string) ($slide['kicker'] ?? ''),
                'headline' => (string) ($slide['headline'] ?? ''),
                'ctaText' => (string) ($slide['ctaText'] ?? ''),
                'ctaUrl' => (string) ($slide['ctaUrl'] ?? ''),
                'newTab' => (bool) ($slide['newTab'] ?? false),
                'bgColor' => (string) ($slide['bgColor'] ?? '#3f3f4a'),
                'textColor' => (string) ($slide['textColor'] ?? 'light'),
            ];
        }

        $slot->setData(new ArrayStruct(['slides' => $resolved]));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readSlides(CmsSlotEntity $slot): array
    {
        $config = $slot->getFieldConfig()->get('slides');

        if ($config === null) {
            return [];
        }

        $value = $config->getValue();

        if (!\is_array($value)) {
            return [];
        }

        // Yalnızca dizi olan elemanları geçir — bozuk config render'ı çökertmesin.
        return \array_values(\array_filter($value, static fn ($slide) => \is_array($slide)));
    }

    private function normaliseId(mixed $id): ?string
    {
        if (!\is_string($id) || $id === '') {
            return null;
        }

        return \strtolower($id);
    }
}
