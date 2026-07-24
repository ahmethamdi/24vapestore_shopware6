<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Psr\Log\LoggerInterface;
use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Content\ProductStream\Service\ProductStreamBuilderInterface;
use Shopware\Core\Framework\DataAbstractionLayer\Exception\EntityNotFoundException;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\NotEqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Grouping\FieldGrouping;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\Framework\Struct\ArrayStruct;
use Shopware\Core\System\SalesChannel\Entity\SalesChannelRepository;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

/**
 * Sekmeli ürün ızgarası (vape-product-tabs) — SEKME (tab) tabanlı çözümleyici.
 *
 * DAVRANIŞ:
 *   Üstte 2-4 SEKME vardır (config.tabs dizisi). Her sekmenin bir etiketi ve
 *   bir ürün kaynağı vardır. Aktif sekmenin ürünleri altında responsive bir
 *   IZGARA (grid) olarak gösterilir — carousel/slider DEĞİL, dolu görünüm için.
 *
 *   Tüm sekmelerin ürünleri burada önceden çözülür; storefront hepsini render
 *   eder (ilk panel görünür, diğerleri gizli), sekme geçişi client-side JS ile
 *   olur — sunucuya gidiş-dönüş YOK. JS yoksa ilk panel görünür kalır.
 *
 * ⚠️ Ürünler DOĞRUDAN sales-channel ürün deposundan (sales_channel.product.
 *    repository) çözülür. Sebep: core'un `component/product/card/box.html.twig`
 *    kutusu `product.calculatedPrice` bekler ve bunu YALNIZCA sales-channel
 *    deposu (fiyat/vergi/context-farkında) doldurur. Bu yüzden collect() null
 *    döner ve tüm ürünler enrich() içinde çözülür (ProductRail/FeaturedSplit
 *    deseni).
 *
 * ÜRÜN KAYNAĞI modları (config her sekmede `productSource`):
 *   - 'static' (VARSAYILAN): sekmenin `products` ID dizisi (elle seçilmiş).
 *   - 'stream': sekmenin `productStreamId`'si + `limit` (dinamik ürün akışı).
 *
 * ⚠️ Sekme başına EN FAZLA bir ürün sorgusu. Kart-içi N+1 yok: cover ilişkisi
 *    criteria'ya eklenir. 4 sekme → en çok 4 sorgu.
 *
 * ⚠️ DB'de 0 ürün olsa da güvenli: her sekme boş bir ProductCollection alır,
 *    twig o panelde nazik "keine Produkte" durumu gösterir, patlamaz.
 *
 * Sonuç `element.data` içine bir ArrayStruct olarak yazılır:
 *   { tabs: [ { id, label, products: ProductCollection }, ... ] }
 *
 * @internal
 */
class ProductTabsCmsElementResolver extends AbstractCmsElementResolver
{
    private const FALLBACK_LIMIT = 8;
    private const MAX_LIMIT = 24;

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
        return 'vape-product-tabs';
    }

    /**
     * Ürünler enrich() içinde sales-channel deposundan çözüldüğü için
     * collect() aşamasında bildirilecek Criteria yok (ProductRail deseni).
     */
    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        return null;
    }

    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        $tabs = $this->readTabs($slot);

        if ($tabs === []) {
            $slot->setData(new ArrayStruct(['tabs' => []]));

            return;
        }

        $context = $resolverContext->getSalesChannelContext();

        $resolved = [];
        $panelSeed = 0;

        foreach ($tabs as $tab) {
            $source = \is_string($tab['productSource'] ?? null) ? $tab['productSource'] : 'static';
            $limit = $this->clampLimit($tab['limit'] ?? null);

            $products = match ($source) {
                'stream' => $this->resolveStream($tab, $limit, $context),
                default => $this->resolveStatic($tab, $context),
            };

            $resolved[] = [
                // Panel/tab eşleşmesi için kararlı bir kimlik.
                'id' => 'tab-' . $slot->getUniqueIdentifier() . '-' . $panelSeed,
                'label' => \trim((string) ($tab['label'] ?? '')),
                'products' => $products,
            ];

            ++$panelSeed;
        }

        $slot->setData(new ArrayStruct(['tabs' => $resolved]));
    }

    // ---------------------------------------------------------------------
    // ÜRÜN KAYNAKLARI
    // ---------------------------------------------------------------------

    /**
     * 'static' modu: sekmenin `products` ID dizisi (yönetici sırasını korur).
     *
     * @param array<string, mixed> $tab
     */
    private function resolveStatic(array $tab, SalesChannelContext $context): ProductCollection
    {
        $ids = $this->readIdArray($tab['products'] ?? null);

        if ($ids === []) {
            return new ProductCollection();
        }

        $criteria = new Criteria($ids);
        $criteria->addAssociation('cover');
        $criteria->addAssociation('options.group');
        $criteria->addAssociation('manufacturer');   // kart marka eyebrow'u için

        $products = $this->search($criteria, $context);
        $products->sortByIdArray($ids);

        return $products;
    }

    /**
     * 'stream' modu: sekmenin `productStreamId` filtreleri + limit.
     *
     * @param array<string, mixed> $tab
     */
    private function resolveStream(array $tab, int $limit, SalesChannelContext $context): ProductCollection
    {
        $streamId = $this->normaliseId($tab['productStreamId'] ?? null);

        if ($streamId === null) {
            return new ProductCollection();
        }

        try {
            $filters = $this->productStreamBuilder->buildFilters($streamId, $context->getContext());
        } catch (EntityNotFoundException $exception) {
            $this->logger->warning(
                'Product stream configured for a vape-product-tabs tab could not be found.',
                ['productStreamId' => $streamId, 'exception' => $exception]
            );

            return new ProductCollection();
        }

        $criteria = new Criteria();
        $criteria->setLimit($limit);
        $criteria->addState(Criteria::STATE_ELASTICSEARCH_AWARE);
        $criteria->addFilter(...$filters);
        $criteria->addSorting(new FieldSorting('product.name', FieldSorting::ASCENDING));
        $criteria->addAssociation('cover');
        $criteria->addAssociation('options.group');
        $criteria->addAssociation('manufacturer');   // kart marka eyebrow'u için

        // Varyant gruplaması — aynı ana ürünün varyantları ızgarayı doldurmasın.
        $criteria->addGroupField(new FieldGrouping('displayGroup'));
        $criteria->addFilter(new NotEqualsFilter('displayGroup', null));

        return $this->search($criteria, $context);
    }

    private function search(Criteria $criteria, SalesChannelContext $context): ProductCollection
    {
        $products = $this->productRepository->search($criteria, $context)->getEntities();

        return $products instanceof ProductCollection ? $products : new ProductCollection();
    }

    // ---------------------------------------------------------------------
    // Config okuyucular
    // ---------------------------------------------------------------------

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readTabs(CmsSlotEntity $slot): array
    {
        $config = $slot->getFieldConfig()->get('tabs');

        if ($config === null) {
            return [];
        }

        $value = $config->getValue();

        if (!\is_array($value)) {
            return [];
        }

        // Yalnızca dizi olan elemanları geçir — bozuk config render'ı çökertmesin.
        return \array_values(\array_filter($value, static fn ($tab) => \is_array($tab)));
    }

    /**
     * @return array<int, string>
     */
    private function readIdArray(mixed $value): array
    {
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

    private function clampLimit(mixed $value): int
    {
        if (!\is_numeric($value) || (int) $value < 1) {
            return self::FALLBACK_LIMIT;
        }

        return \min((int) $value, self::MAX_LIMIT);
    }

    private function normaliseId(mixed $id): ?string
    {
        if (!\is_string($id) || $id === '') {
            return null;
        }

        return \strtolower($id);
    }
}
