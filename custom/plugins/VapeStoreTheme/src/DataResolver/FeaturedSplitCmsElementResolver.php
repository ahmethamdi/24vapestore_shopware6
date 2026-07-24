<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Psr\Log\LoggerInterface;
use Shopware\Core\Content\Category\CategoryCollection;
use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Content\ProductStream\Service\ProductStreamBuilderInterface;
use Shopware\Core\Framework\DataAbstractionLayer\Exception\EntityNotFoundException;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\NotEqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Grouping\FieldGrouping;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\Framework\Struct\ArrayStruct;
use Shopware\Core\System\SalesChannel\Entity\SalesChannelRepository;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

/**
 * Öne çıkanlar split — SEKME (tab) tabanlı ürün çözümleyici.
 *
 * YENİ DAVRANIŞ:
 *   Sol sütun bir dikey SEKME listesidir. Her sekme bir KATEGORİ'dir
 *   (config.tabs dizisi). Aktif sekmeye göre SAĞ sütunda o kategorinin
 *   ürünlerinden oluşan yatay bir kart slider'ı gösterilir.
 *
 *   Tüm sekmelerin ürünleri burada önceden çözülür; storefront hepsini
 *   render eder (aktif panel görünür, diğerleri gizli), sekme geçişi
 *   client-side JS ile olur — sunucuya gidiş-dönüş YOK.
 *
 * ⚠️ Ürünler DOĞRUDAN sales-channel ürün deposundan (sales_channel.product.
 *    repository) çözülür. Sebep: core'un `component/product/card/box.html.twig`
 *    kutusu `product.calculatedPrice` bekler ve bunu YALNIZCA sales-channel
 *    deposu (fiyat/vergi/context-farkında) doldurur. Bu yüzden collect()
 *    null döner ve tüm ürünler enrich() içinde çözülür (ProductRail deseni).
 *
 * ÜRÜN KAYNAĞI modları (config her sekmede `productSource`):
 *   - 'category' (VARSAYILAN): sekmenin kategorisi ve alt ağacındaki ürünler
 *     (product-category-tree ContainsFilter). Kullanıcının asıl istediği mod.
 *   - 'static': sekmenin `products` ID dizisi (elle seçilmiş ürünler).
 *   - 'stream': sekmenin `productStreamId`'si (dinamik ürün akışı).
 *
 * ⚠️ Sekme başına EN FAZLA bir ürün sorgusu (kategori/static/stream). Kart-içi
 *    N+1 yok: cover ilişkisi criteria'ya eklenir. 3 sekme → en çok 3 sorgu.
 *
 * ⚠️ DB'de 0 ürün olsa da güvenli: her sekme boş bir ProductCollection alır,
 *    twig o panelde nazik "keine Produkte" durumu gösterir, patlamaz.
 *
 * Sekme etiketi: config `label` boşsa, kategori adı kullanılır (bunun için
 * kategori adları ayrı, hafif bir DAL sorgusuyla toplu getirilir).
 *
 * Sol sütun düz alanları (eyebrow / headline / description / cta) resolver'a
 * ihtiyaç duymaz; twig `element.translated.config.*` ile okur.
 *
 * @internal
 */
class FeaturedSplitCmsElementResolver extends AbstractCmsElementResolver
{
    private const FALLBACK_LIMIT = 8;
    private const MAX_LIMIT = 24;

    /**
     * @param SalesChannelRepository<ProductCollection>       $productRepository
     * @param \Shopware\Core\Framework\DataAbstractionLayer\EntityRepository<CategoryCollection> $categoryRepository
     */
    public function __construct(
        private readonly ProductStreamBuilderInterface $productStreamBuilder,
        private readonly SalesChannelRepository $productRepository,
        private readonly \Shopware\Core\Framework\DataAbstractionLayer\EntityRepository $categoryRepository,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function getType(): string
    {
        return 'vape-featured-split';
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

        // Etiketi boş olan sekmeler için kategori adlarını TEK sorguda topla.
        $categoryNames = $this->loadCategoryNames($tabs, $context);

        $resolved = [];
        $panelSeed = 0;

        foreach ($tabs as $tab) {
            $categoryId = $this->normaliseId($tab['categoryId'] ?? null);
            $source = \is_string($tab['productSource'] ?? null) ? $tab['productSource'] : 'category';
            $limit = $this->clampLimit($tab['limit'] ?? null);

            $products = match ($source) {
                'static' => $this->resolveStatic($tab, $context),
                'stream' => $this->resolveStream($tab, $limit, $context),
                default => $this->resolveCategory($categoryId, $limit, $context),
            };

            $label = \trim((string) ($tab['label'] ?? ''));
            if ($label === '' && $categoryId !== null) {
                $label = $categoryNames[$categoryId] ?? '';
            }

            $resolved[] = [
                // Panel/tab eşleşmesi için kararlı bir kimlik.
                'id' => 'tab-' . $slot->getUniqueIdentifier() . '-' . $panelSeed,
                'categoryId' => $categoryId,
                'categoryName' => $categoryId !== null ? ($categoryNames[$categoryId] ?? '') : '',
                'label' => $label,
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
     * 'category' modu: kategorinin ve alt ağacının ürünleri.
     *
     * `categoriesRo` bir ürünün ait olduğu tüm kategorileri (tüm üst
     * kategoriler dahil, optimize edilmiş read-only ağaç) içerir; bu yüzden
     * `categoriesRo.id` üzerine EqualsFilter, seçilen kategorinin ALT AĞACINDAKİ
     * tüm ürünleri de yakalar. (Core ProductListingRoute ile aynı desen.)
     */
    private function resolveCategory(?string $categoryId, int $limit, SalesChannelContext $context): ProductCollection
    {
        if ($categoryId === null) {
            return new ProductCollection();
        }

        $criteria = new Criteria();
        $criteria->setLimit($limit);
        $criteria->addState(Criteria::STATE_ELASTICSEARCH_AWARE);
        $criteria->addFilter(new EqualsFilter('product.categoriesRo.id', $categoryId));
        $criteria->addSorting(new FieldSorting('product.markAsTopseller', FieldSorting::DESCENDING));
        $criteria->addSorting(new FieldSorting('product.name', FieldSorting::ASCENDING));
        $this->applyCommon($criteria);

        return $this->search($criteria, $context);
    }

    /**
     * 'static' modu: sekmenin `products` ID dizisi.
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

        $products = $this->search($criteria, $context);
        $products->sortByIdArray($ids);

        return $products;
    }

    /**
     * 'stream' modu: sekmenin `productStreamId` filtreleri.
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
                'Product stream configured for a vape-featured-split tab could not be found.',
                ['productStreamId' => $streamId, 'exception' => $exception]
            );

            return new ProductCollection();
        }

        $criteria = new Criteria();
        $criteria->setLimit($limit);
        $criteria->addState(Criteria::STATE_ELASTICSEARCH_AWARE);
        $criteria->addFilter(...$filters);
        $criteria->addSorting(new FieldSorting('product.name', FieldSorting::ASCENDING));
        $this->applyCommon($criteria);

        return $this->search($criteria, $context);
    }

    /**
     * Kart görseli için cover + varyant gruplama (aynı ana ürün tekrar etmesin).
     */
    private function applyCommon(Criteria $criteria): void
    {
        $criteria->addAssociation('cover');
        $criteria->addAssociation('options.group');
        $criteria->addGroupField(new FieldGrouping('displayGroup'));
        $criteria->addFilter(new NotEqualsFilter('displayGroup', null));
    }

    private function search(Criteria $criteria, SalesChannelContext $context): ProductCollection
    {
        $products = $this->productRepository->search($criteria, $context)->getEntities();

        return $products instanceof ProductCollection ? $products : new ProductCollection();
    }

    // ---------------------------------------------------------------------
    // KATEGORİ ADLARI (sekme etiketi fallback'i)
    // ---------------------------------------------------------------------

    /**
     * Etiketi boş sekmelerin kategori adlarını TEK sorguda getirir.
     *
     * @param array<int, array<string, mixed>> $tabs
     *
     * @return array<string, string> categoryId => çevrilmiş ad
     */
    private function loadCategoryNames(array $tabs, SalesChannelContext $context): array
    {
        $ids = [];
        foreach ($tabs as $tab) {
            $id = $this->normaliseId($tab['categoryId'] ?? null);
            if ($id !== null) {
                $ids[$id] = $id;
            }
        }

        if ($ids === []) {
            return [];
        }

        $criteria = new Criteria(\array_values($ids));
        $categories = $this->categoryRepository
            ->search($criteria, $context->getContext())
            ->getEntities();

        $names = [];
        if ($categories instanceof CategoryCollection) {
            foreach ($categories as $category) {
                $names[$category->getId()] = (string) ($category->getTranslation('name') ?? $category->getName() ?? '');
            }
        }

        return $names;
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
