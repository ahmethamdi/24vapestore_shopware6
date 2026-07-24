<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Psr\Log\LoggerInterface;
use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Cms\SalesChannel\Struct\ProductSliderStruct;
use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Content\ProductStream\Service\ProductStreamBuilderInterface;
use Shopware\Core\Framework\DataAbstractionLayer\Exception\EntityNotFoundException;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\NotEqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Grouping\FieldGrouping;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\System\SalesChannel\Entity\SalesChannelRepository;

/**
 * Ürün rayı (vape-product-rail) için ürün çözümleyici.
 *
 * İki mod:
 *   - static: config.products (ID dizisi) → seçilen ürünler getirilir.
 *   - stream: config.productStreamId + config.limit → product stream
 *     filtreleri kurulur ve limit kadar ürün getirilir.
 *
 * ⚠️ Ürünler DOĞRUDAN sales-channel ürün deposundan (sales_channel.product.
 *    repository) çözülür — jenerik DAL yerine. Sebep: core'un product-box'ı
 *    `product.calculatedPrice` bekler ve bunu YALNIZCA sales-channel deposu
 *    (fiyat/vergi/context-farkında) doldurur. Bu yüzden collect()/enrich()
 *    CriteriaCollection akışı yerine enrich() içinde tek search yapılır.
 *
 * Sonuç core'un `ProductSliderStruct`'ına yazılır (setProducts). Storefront
 * twig'i core'un `component/product/card/box.html.twig` kutusuyla render eder
 * — fiyat formatı, indirim, çeviri, wishlist hep core'dan gelir.
 *
 * ⚠️ DB'de 0 ürün olsa da hata YOK: her iki modda da boş ProductCollection
 *    döner, twig boş rayı sorunsuz render eder.
 *
 * Desen kaynağı: core StaticProductProcessor + ProductStreamProcessor
 * (tek resolver'da sadeleştirildi; bu element yalnızca iki kaynak destekler).
 *
 * @internal
 */
class ProductRailCmsElementResolver extends AbstractCmsElementResolver
{
    private const FALLBACK_LIMIT = 8;

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
        return 'vape-product-rail';
    }

    /**
     * Ürünler enrich() içinde doğrudan çözüldüğü için collect() aşamasında
     * bildirilecek Criteria yok. (Core'un stream işlemcisi de nihai ürünleri
     * ayrı bir search ile getirir.) null döndürmek framework için güvenlidir.
     */
    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        return null;
    }

    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        // Her koşulda bir struct set edilir; boş bile olsa twig
        // element.data.products'a güvenle bakar (patlamaz).
        $struct = new ProductSliderStruct();
        $struct->setProducts(new ProductCollection());
        $slot->setData($struct);

        $context = $resolverContext->getSalesChannelContext();

        if ($this->isStream($slot)) {
            $this->enrichStream($slot, $context, $struct);

            return;
        }

        $this->enrichStatic($slot, $context, $struct);
    }

    // ---------------------------------------------------------------------
    // STATIC
    // ---------------------------------------------------------------------

    private function enrichStatic(
        CmsSlotEntity $slot,
        \Shopware\Core\System\SalesChannel\SalesChannelContext $context,
        ProductSliderStruct $struct
    ): void {
        $ids = $this->readProductIds($slot);

        if ($ids === []) {
            return;
        }

        $criteria = new Criteria($ids);
        $criteria->addAssociation('cover');
        $criteria->addAssociation('options.group');

        $products = $this->productRepository->search($criteria, $context)->getEntities();

        if (!$products instanceof ProductCollection) {
            return;
        }

        // Yöneticinin seçtiği sırayı koru.
        $products->sortByIdArray($ids);

        $struct->setProducts($products);
    }

    // ---------------------------------------------------------------------
    // STREAM
    // ---------------------------------------------------------------------

    private function enrichStream(
        CmsSlotEntity $slot,
        \Shopware\Core\System\SalesChannel\SalesChannelContext $context,
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
                'Product stream configured for vape-product-rail could not be found.',
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

        // Varyant gruplaması — aynı ana ürünün varyantları rayı doldurmasın.
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
}
