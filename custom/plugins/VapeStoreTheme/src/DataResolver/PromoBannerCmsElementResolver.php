<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\FieldConfig;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Cms\SalesChannel\Struct\ImageStruct;
use Shopware\Core\Content\Media\MediaDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;

/**
 * Promo banner arka plan görseli çözümleyicisi.
 *
 * Tek bir `mediaId` config alanını storefront'ta bir `ImageStruct`'a bağlar
 * (core'un ImageCmsElementResolver'ı örnek alındı). Admin'deki `entity`
 * auto-collect yalnızca editörde çalışır; storefront'ta görselin render
 * olması için bu resolver şarttır — yoksa `element.data.media` boş gelir.
 *
 * Görsel seçilmemişse hiçbir şey set edilmez ve Twig düz `bgColor` zemine düşer.
 *
 * Akış: collect() mediaId için Criteria bildirir → framework toplu sorgu
 * çalıştırır → enrich() medyayı ImageStruct'a yazıp slot'a bağlar →
 * Twig `element.data.media` ile okur.
 */
class PromoBannerCmsElementResolver extends AbstractCmsElementResolver
{
    private const MEDIA_KEY = 'vape-promo-banner-media';

    public function getType(): string
    {
        return 'vape-promo-banner';
    }

    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        $mediaConfig = $slot->getFieldConfig()->get('mediaId');

        if (
            $mediaConfig === null
            || $mediaConfig->isMapped()
            || $mediaConfig->getValue() === null
            || $mediaConfig->getValue() === ''
        ) {
            return null;
        }

        $mediaId = $this->normaliseId($mediaConfig->getValue());

        if ($mediaId === null) {
            return null;
        }

        $criteriaCollection = new CriteriaCollection();
        $criteriaCollection->add(
            self::MEDIA_KEY . '_' . $slot->getUniqueIdentifier(),
            MediaDefinition::class,
            new Criteria([$mediaId])
        );

        return $criteriaCollection;
    }

    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        // Twig'in null'a karşı korunması için her zaman bir struct set edilir.
        $imageStruct = new ImageStruct();
        $slot->setData($imageStruct);

        $mediaConfig = $slot->getFieldConfig()->get('mediaId');

        if ($mediaConfig === null || $mediaConfig->getValue() === null || $mediaConfig->getValue() === '') {
            return;
        }

        if ($mediaConfig->getSource() === FieldConfig::SOURCE_MAPPED) {
            return;
        }

        $searchResult = $result->get(self::MEDIA_KEY . '_' . $slot->getUniqueIdentifier());

        if ($searchResult === null) {
            return;
        }

        $mediaId = $this->normaliseId($mediaConfig->getValue());

        if ($mediaId === null) {
            return;
        }

        $media = $searchResult->get($mediaId);

        if ($media !== null) {
            $imageStruct->setMedia($media);
            $imageStruct->setMediaId($mediaId);
        }
    }

    /**
     * Shopware entity ID'lerini küçük harfle saklar. Config'e büyük harfli bir
     * ID yazılırsa arama eşleşmez ve entity sessizce bulunamaz.
     */
    private function normaliseId(mixed $id): ?string
    {
        if (!\is_string($id) || $id === '') {
            return null;
        }

        return \strtolower($id);
    }
}
