<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\SalesChannel\Struct\ImageStruct;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Media\MediaDefinition;
use Shopware\Core\Content\Media\MediaEntity;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;

/**
 * Hero element için medya çözümleyici.
 *
 * Admin tarafında `defaultConfig`'teki `entity` tanımı medyayı otomatik yükler,
 * ama bu YALNIZCA CMS editöründe geçerlidir. Storefront'ta medyanın slot'a
 * bağlanması için bu resolver gerekir — aksi halde `element.data.media` boş
 * gelir ve görsel hiç render edilmez.
 *
 * Akış: collect() Criteria bildirir → framework toplu sorgu çalıştırır →
 * enrich() sonucu slot'a yazar → Twig `element.data.media` ile okur.
 *
 * Core'un ImageCmsElementResolver'ı örnek alındı: slot'a ImageStruct set edilir,
 * böylece Twig'de `element.data.media` erişimi core image element'iyle aynı olur.
 */
class HeroCmsElementResolver extends AbstractCmsElementResolver
{
    public function getType(): string
    {
        return 'vape-hero';
    }

    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        $mediaConfig = $slot->getFieldConfig()->get('media');

        // Hero'da medya yalnızca statik seçilir (mapped/default desteklenmez).
        if (
            $mediaConfig === null
            || !$mediaConfig->isStatic()
            || $mediaConfig->getValue() === null
        ) {
            return null;
        }

        $mediaId = $mediaConfig->getStringValue();

        if ($mediaId === '') {
            return null;
        }

        $criteria = new Criteria([$mediaId]);

        $criteriaCollection = new CriteriaCollection();
        $criteriaCollection->add('media_' . $slot->getUniqueIdentifier(), MediaDefinition::class, $criteria);

        return $criteriaCollection;
    }

    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        $image = new ImageStruct();
        $slot->setData($image);

        $mediaConfig = $slot->getFieldConfig()->get('media');

        if (
            $mediaConfig === null
            || !$mediaConfig->isStatic()
            || $mediaConfig->getValue() === null
        ) {
            return;
        }

        $mediaId = $mediaConfig->getStringValue();

        if ($mediaId === '') {
            return;
        }

        $image->setMediaId($mediaId);

        $searchResult = $result->get('media_' . $slot->getUniqueIdentifier());

        if ($searchResult === null) {
            return;
        }

        $media = $searchResult->get($mediaId);

        if (!$media instanceof MediaEntity) {
            return;
        }

        $image->setMedia($media);
    }
}
