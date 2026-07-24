<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Media\MediaDefinition;
use Shopware\Core\Content\Media\MediaEntity;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Struct\ArrayStruct;

/**
 * Marka slider için logo çözümleyici.
 *
 * Markalar config'te bir dizi olarak durur; her marka yalnızca `mediaId` (logo),
 * `name` ve `url` içerir. Admin tarafındaki `entity` auto-collect düz alanlar
 * için çalışır, dizi içindeki ID'leri görmez — bu yüzden storefront için burada
 * elle çözümlenir.
 *
 * Akış: collect() tüm markalardaki logo mediaId'leri için TEK Criteria bildirir
 * (N+1 yok) → framework toplu sorgu çalıştırır → enrich() her markayı çözümlenmiş
 * MediaEntity ile eşleştirip slot'a yazar → Twig `element.data.brands` ile okur.
 *
 * Logo yoksa `media` null kalır ve storefront twig'i marka ADI metnine düşer.
 *
 * ⚠️ Shopware entity ID'lerini küçük harfle saklar. Config'e büyük harfli bir ID
 *    yazılırsa arama eşleşmez ve entity sessizce bulunamaz — ID'ler burada
 *    normalize edilir.
 */
class BrandSliderCmsElementResolver extends AbstractCmsElementResolver
{
    private const MEDIA_KEY = 'vape-brand-slider-media';

    public function getType(): string
    {
        return 'vape-brand-slider';
    }

    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        $brands = $this->readBrands($slot);

        if ($brands === []) {
            return null;
        }

        $mediaIds = [];

        foreach ($brands as $brand) {
            $mediaId = $this->normaliseId($brand['mediaId'] ?? null);

            if ($mediaId !== null) {
                $mediaIds[$mediaId] = $mediaId;
            }
        }

        if ($mediaIds === []) {
            return null;
        }

        $criteriaCollection = new CriteriaCollection();
        $criteriaCollection->add(
            self::MEDIA_KEY . '_' . $slot->getUniqueIdentifier(),
            MediaDefinition::class,
            new Criteria(\array_values($mediaIds))
        );

        return $criteriaCollection;
    }

    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        $brands = $this->readBrands($slot);

        if ($brands === []) {
            $slot->setData(new ArrayStruct(['brands' => []]));

            return;
        }

        $mediaResult = $result->get(self::MEDIA_KEY . '_' . $slot->getUniqueIdentifier());

        $resolved = [];

        foreach ($brands as $brand) {
            $name = \trim((string) ($brand['name'] ?? ''));
            $mediaId = $this->normaliseId($brand['mediaId'] ?? null);

            $media = null;

            if ($mediaId !== null && $mediaResult !== null) {
                $candidate = $mediaResult->get($mediaId);
                $media = $candidate instanceof MediaEntity ? $candidate : null;
            }

            // Logo da yok, ad da yoksa boş markayı atla — storefront'ta boş
            // hücre basmasın (yönetici henüz doldurmamış seed markası).
            if ($media === null && $name === '') {
                continue;
            }

            $resolved[] = [
                'name' => $name,
                'url' => (string) ($brand['url'] ?? ''),
                'media' => $media,
            ];
        }

        $slot->setData(new ArrayStruct(['brands' => $resolved]));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readBrands(CmsSlotEntity $slot): array
    {
        $config = $slot->getFieldConfig()->get('brands');

        if ($config === null) {
            return [];
        }

        $value = $config->getValue();

        if (!\is_array($value)) {
            return [];
        }

        // Yalnızca dizi olan elemanları geçir — bozuk config render'ı çökertmesin.
        return \array_values(\array_filter($value, static fn ($brand) => \is_array($brand)));
    }

    private function normaliseId(mixed $id): ?string
    {
        if (!\is_string($id) || $id === '') {
            return null;
        }

        return \strtolower($id);
    }
}
