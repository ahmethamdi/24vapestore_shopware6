<?php declare(strict_types=1);

namespace VapeStoreTheme\DataResolver;

use Psr\Log\LoggerInterface;
use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Cms\SalesChannel\Struct\ProductBoxStruct;
use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Content\Product\SalesChannel\SalesChannelProductEntity;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\System\SalesChannel\Entity\SalesChannelRepository;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

/**
 * Haftanın ürünü (vape-product-spotlight) çözümleyici.
 *
 * TEK bir `productId` config alanından bir ürünü storefront'ta çözer ve core'un
 * `ProductBoxStruct`'ına (setProduct) yazar. Twig `element.data.product` ile okur.
 *
 * ⚠️ FİYAT: ürün DOĞRUDAN sales-channel ürün deposundan (sales_channel.product.
 *    repository) çözülür — jenerik DAL yerine. Sebep: `product.calculatedPrice`
 *    yalnızca sales-channel deposu (fiyat/vergi/context-farkında) tarafından
 *    doldurulur; core fiyat partial'ı bunu bekler.
 *
 * ⚠️ MARKA: bu projede sales_channel.product.repository `manufacturer`
 *    association'ını DÜŞÜRÜYOR (bilinen sorun). Bu yüzden eyebrow'da marka adı
 *    lazım olursa manufacturer ADI ayrı bir jenerik `product.repository`
 *    sorgusuyla getirilir ve struct'a `manufacturerName` extension'ı olarak
 *    eklenir. Böylece fiyat sales-channel'dan, marka jenerik depodan gelir;
 *    ikisi çakışmaz.
 *
 * Ürün seçilmemiş / bulunamamışsa struct boş kalır (product = null) ve twig
 * sakin bir nötr placeholder gösterir (renkli harf YOK).
 *
 * Akış: ürünler enrich() içinde doğrudan çözülür (fiyat için sales-channel
 * search gerektiğinden collect()/enrich() Criteria akışı yerine tek search).
 *
 * @internal
 */
class ProductSpotlightCmsElementResolver extends AbstractCmsElementResolver
{
    /**
     * @param SalesChannelRepository<ProductCollection> $salesChannelProductRepository
     * @param EntityRepository<ProductCollection> $productRepository
     */
    public function __construct(
        private readonly SalesChannelRepository $salesChannelProductRepository,
        private readonly EntityRepository $productRepository,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function getType(): string
    {
        return 'vape-product-spotlight';
    }

    /**
     * Ürün enrich() içinde doğrudan (sales-channel deposundan, fiyat için)
     * çözülür. Bu yüzden collect() aşamasında bildirilecek Criteria yok.
     * null döndürmek framework için güvenlidir.
     */
    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        return null;
    }

    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        // Her koşulda bir struct set edilir; ürün null bile olsa twig
        // element.data.product'a güvenle bakar (patlamaz).
        $struct = new ProductBoxStruct();
        $slot->setData($struct);

        $productId = $this->readProductId($slot);

        if ($productId === null) {
            return;
        }

        $context = $resolverContext->getSalesChannelContext();

        $product = $this->loadProduct($productId, $context);

        if ($product === null) {
            return;
        }

        // Marka adını (varsa) ayrı yükle ve struct'a extension olarak ekle.
        $this->attachManufacturerName($product, $context);

        $struct->setProduct($product);
        $struct->setProductId($product->getId());
    }

    private function loadProduct(string $productId, SalesChannelContext $context): ?SalesChannelProductEntity
    {
        $criteria = new Criteria([$productId]);
        $criteria->addAssociation('cover');
        $criteria->addAssociation('options.group');

        $products = $this->salesChannelProductRepository->search($criteria, $context)->getEntities();

        if (!$products instanceof ProductCollection) {
            return null;
        }

        $product = $products->get($productId);

        return $product instanceof SalesChannelProductEntity ? $product : null;
    }

    /**
     * Marka adını jenerik `product.repository` üzerinden getirip ürüne
     * `manufacturerName` extension'ı olarak ekler.
     *
     * ⚠️ sales_channel.product.repository manufacturer'ı düşürdüğü için burada
     *    jenerik depo kullanılır. Sadece ada ihtiyaç var; tam entity yüklenmez.
     */
    private function attachManufacturerName(
        SalesChannelProductEntity $product,
        SalesChannelContext $context
    ): void {
        try {
            $criteria = new Criteria([$product->getId()]);
            $criteria->addAssociation('manufacturer');

            /** @var ProductCollection $result */
            $result = $this->productRepository->search($criteria, $context->getContext())->getEntities();

            $plainProduct = $result->get($product->getId());

            $manufacturer = $plainProduct?->getManufacturer();

            if ($manufacturer !== null) {
                $product->addExtension(
                    'vapeManufacturerName',
                    new \Shopware\Core\Framework\Struct\ArrayStruct([
                        'name' => $manufacturer->getTranslation('name') ?? $manufacturer->getName(),
                    ])
                );
            }
        } catch (\Throwable $exception) {
            // Marka opsiyoneldir; hata olursa eyebrow'da yalnızca statik metin
            // (config eyebrow) gösterilir. Spotlight bu yüzden patlamaz.
            $this->logger->warning(
                'Manufacturer name for vape-product-spotlight could not be loaded.',
                ['productId' => $product->getId(), 'exception' => $exception]
            );
        }
    }

    private function readProductId(CmsSlotEntity $slot): ?string
    {
        $config = $slot->getFieldConfig()->get('productId');

        if ($config === null) {
            return null;
        }

        $value = $config->getValue();

        if (!\is_string($value) || $value === '') {
            return null;
        }

        // Shopware entity ID'leri küçük harf saklanır; büyük harfli config
        // değeri arama ile eşleşmez.
        return \strtolower($value);
    }
}
