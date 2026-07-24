<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Psr\Log\LoggerInterface;
use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\FieldConfig;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Cms\SalesChannel\Struct\ProductSliderStruct;
use Shopware\Core\Content\Media\MediaDefinition;
use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Content\ProductStream\Service\ProductStreamBuilderInterface;
use Shopware\Core\Framework\DataAbstractionLayer\Exception\EntityNotFoundException;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\NotEqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Grouping\FieldGrouping;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\System\SalesChannel\Entity\SalesChannelRepository;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

/**
 * Vitrin (vape-showcase) çözümleyici — banner + ürün ızgarası BİRLEŞİK.
 *
 * Bu element solda büyük kampanya banner'ı, sağda 4'lü ürün ızgarası taşır.
 * İki KAYNAK aynı anda çözülür:
 *
 *   1. BANNER GÖRSELİ — config.mediaId → MediaEntity.
 *      PromoBannerCmsElementResolver'daki batch/ImageStruct deseni yerine burada
 *      medya TEK criteria ile MediaEntity olarak çözülür (hero medya deseni), çünkü
 *      element.data'ya kendi birleşik yapımızı (banner + products) koyuyoruz.
 *      Görsel yoksa media null kalır → twig düz zemine düşer.
 *
 *   2. ÜRÜNLER — static (config.products ID dizisi) veya stream
 *      (config.productStreamId + limit). ProductRailCmsElementResolver ile AYNI
 *      mantık: ürünler DOĞRUDAN sales-channel ürün deposundan çözülür, çünkü
 *      core'un product-box'ı `product.calculatedPrice` bekler ve bunu yalnızca
 *      sales-channel deposu doldurur. addAssociation('cover','options.group',
 *      'manufacturer'). Varsayılan limit 4 (2x2 ızgara).
 *
 * element.data (ProductSliderStruct) yapısı:
 *   - products: ProductCollection  (sağ ızgara — core struct getProducts())
 *   - streamId: ?string            (stream modunda)
 *   - ext['bannerMedia']: ?MediaEntity   (sol banner arka planı)
 *
 * Banner metin alanları (eyebrow/title/text/cta) config'te düz alan olduğu için
 * resolver'da çözülmez; twig onları `element.translated.config.*`'ten okur.
 *
 * ⚠️ DB'de 0 ürün / görsel seçili değil → HATA YOK: boş ProductCollection döner,
 *    banner media null kalır, twig ikisini de güvenle placeholder'a düşürür.
 *
 * @internal
 */
class ShowcaseCmsElementResolver extends AbstractCmsElementResolver
{
    private const FALLBACK_LIMIT = 4;
    private const MEDIA_KEY = 'vape-showcase-media';

    /**
     * @param SalesChannelRepository<ProductCollection> $productRepository
     */
    public function __construct(
        private readonly ProductStreamBuilderInterface $productStreamBuilder,
        private readonly SalesChannelRepository $productRepository,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function getType(): string
    {
        return 'vape-showcase';
    }

    /**
     * Banner görselini toplu sorguya bildirir (framework tek batch'te getirir).
     * Ürünler enrich() içinde ayrı çözülür (fiyat için sales-channel deposu şart).
     */
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
        // Her koşulda bir struct set edilir; boş bile olsa twig
        // element.data.products / bannerMedia'ya güvenle bakar (patlamaz).
        $struct = new ProductSliderStruct();
        $struct->setProducts(new ProductCollection());
        $slot->setData($struct);

        // --- 1. banner görseli ---
        $this->enrichBannerMedia($slot, $result, $struct);

        // --- 2. ürünler ---
        $context = $resolverContext->getSalesChannelContext();

        if ($this->isStream($slot)) {
            $this->enrichStream($slot, $context, $struct);

            return;
        }

        $this->enrichStatic($slot, $context, $struct);
    }

    // ---------------------------------------------------------------------
    // BANNER MEDYASI
    // ---------------------------------------------------------------------

    private function enrichBannerMedia(
        CmsSlotEntity $slot,
        ElementDataCollection $result,
        ProductSliderStruct $struct
    ): void {
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
            // Birleşik struct: banner medyasını ext olarak taşırız
            // (products struct'ın kendi alanı; banner ekstra).
            $struct->addExtension('bannerMedia', $media);
        }
    }

    // ---------------------------------------------------------------------
    // ÜRÜNLER — STATIC
    // ---------------------------------------------------------------------

    private function enrichStatic(
        CmsSlotEntity $slot,
        SalesChannelContext $context,
        ProductSliderStruct $struct
    ): void {
        $ids = $this->readProductIds($slot);

        if ($ids === []) {
            return;
        }

        $criteria = new Criteria($ids);
        $criteria->addAssociation('cover');
        $criteria->addAssociation('options.group');
        $criteria->addAssociation('manufacturer');   // kart marka eyebrow'u için

        $products = $this->productRepository->search($criteria, $context)->getEntities();

        if (!$products instanceof ProductCollection) {
            return;
        }

        // Yöneticinin seçtiği sırayı koru.
        $products->sortByIdArray($ids);

        $struct->setProducts($products);
    }

    // ---------------------------------------------------------------------
    // ÜRÜNLER — STREAM
    // ---------------------------------------------------------------------

    private function enrichStream(
        CmsSlotEntity $slot,
        SalesChannelContext $context,
        ProductSliderStruct $struct
    ): void {
        $streamId = $this->readStreamId($slot);

        if ($streamId === null) {
            return;
        }

        try {
            $filters = $this->productStreamBuilder->buildFilters($streamId, $context->getContext());
        } catch (EntityNotFoundException $exception) {
            $this->logger->warning(
                'Product stream configured for vape-showcase could not be found.',
                ['productStreamId' => $streamId, 'exception' => $exception]
            );

            return;
        }

        $criteria = new Criteria();
        $criteria->addState(Criteria::STATE_ELASTICSEARCH_AWARE);
        $criteria->addFilter(...$filters);
        $criteria->setLimit($this->readLimit($slot));
        $criteria->addSorting(new FieldSorting('name', FieldSorting::ASCENDING));
        $criteria->addAssociation('cover');
        $criteria->addAssociation('options.group');
        $criteria->addAssociation('manufacturer');   // kart marka eyebrow'u için

        // Varyant gruplaması — aynı ana ürünün varyantları ızgarayı doldurmasın.
        $criteria->addGroupField(new FieldGrouping('displayGroup'));
        $criteria->addFilter(new NotEqualsFilter('displayGroup', null));

        $products = $this->productRepository->search($criteria, $context)->getEntities();

        if (!$products instanceof ProductCollection) {
            return;
        }

        $struct->setProducts($products);
        $struct->setStreamId($streamId);
    }

    // ---------------------------------------------------------------------
    // Config okuyucular
    // ---------------------------------------------------------------------

    private function isStream(CmsSlotEntity $slot): bool
    {
        $source = $slot->getFieldConfig()->get('productSource');

        return $source !== null && $source->getValue() === 'stream';
    }

    /**
     * @return array<int, string>
     */
    private function readProductIds(CmsSlotEntity $slot): array
    {
        $config = $slot->getFieldConfig()->get('products');

        if ($config === null) {
            return [];
        }

        $value = $config->getValue();

        if (!\is_array($value)) {
            return [];
        }

        $ids = [];
        foreach ($value as $id) {
            if (\is_string($id) && $id !== '') {
                $ids[] = \strtolower($id);
            }
        }

        return \array_values(\array_unique($ids));
    }

    private function readStreamId(CmsSlotEntity $slot): ?string
    {
        $config = $slot->getFieldConfig()->get('productStreamId');

        if ($config === null) {
            return null;
        }

        $value = $config->getValue();

        if (!\is_string($value) || $value === '') {
            return null;
        }

        return \strtolower($value);
    }

    private function readLimit(CmsSlotEntity $slot): int
    {
        $config = $slot->getFieldConfig()->get('limit');

        if ($config === null) {
            return self::FALLBACK_LIMIT;
        }

        $value = $config->getValue();

        if (!\is_numeric($value) || (int) $value < 1) {
            return self::FALLBACK_LIMIT;
        }

        return (int) $value;
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
