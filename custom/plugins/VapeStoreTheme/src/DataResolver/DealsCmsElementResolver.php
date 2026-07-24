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
 * Günün fırsatları (vape-deals) için kampanya görseli çözümleyici.
 *
 * Fırsatlar config'te bir dizi olarak durur; her fırsat mediaId (kampanya
 * banner'ı), brandLabel, title, price, url ve endDate içerir. Admin tarafındaki
 * `entity` auto-collect düz alanlar için çalışır, dizi içindeki ID'leri görmez
 * — bu yüzden storefront için burada elle çözümlenir.
 *
 * Akış: collect() tüm fırsatlardaki mediaId'ler için TEK Criteria bildirir
 * (N+1 yok) → framework toplu sorgu çalıştırır → enrich() her fırsatı çözümlenmiş
 * MediaEntity ile eşleştirip slot'a yazar → Twig `element.data.deals` ile okur.
 *
 * Görsel yoksa `media` null kalır ve storefront twig'i nötr placeholder'a düşer.
 * Başlığı olmayan (yönetici doldurmamış) fırsat atlanır.
 *
 * ⚠️ Shopware entity ID'lerini küçük harfle saklar. Config'e büyük harfli bir ID
 *    yazılırsa arama eşleşmez ve entity sessizce bulunamaz — ID'ler normalize edilir.
 */
class DealsCmsElementResolver extends AbstractCmsElementResolver
{
    private const MEDIA_KEY = 'vape-deals-media';

    public function getType(): string
    {
        return 'vape-deals';
    }

    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        $deals = $this->readDeals($slot);

        if ($deals === []) {
            return null;
        }

        $mediaIds = [];

        foreach ($deals as $deal) {
            $mediaId = $this->normaliseId($deal['mediaId'] ?? null);

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
        $deals = $this->readDeals($slot);

        if ($deals === []) {
            $slot->setData(new ArrayStruct(['deals' => []]));

            return;
        }

        $mediaResult = $result->get(self::MEDIA_KEY . '_' . $slot->getUniqueIdentifier());

        $resolved = [];

        foreach ($deals as $deal) {
            $title = \trim((string) ($deal['title'] ?? ''));

            // Başlığı olmayan fırsat = yönetici henüz doldurmamış seed → atla.
            if ($title === '') {
                continue;
            }

            $mediaId = $this->normaliseId($deal['mediaId'] ?? null);
            $media = null;

            if ($mediaId !== null && $mediaResult !== null) {
                $candidate = $mediaResult->get($mediaId);
                $media = $candidate instanceof MediaEntity ? $candidate : null;
            }

            $resolved[] = [
                'brandLabel' => \trim((string) ($deal['brandLabel'] ?? '')),
                'title' => $title,
                'price' => \trim((string) ($deal['price'] ?? '')),
                'url' => \trim((string) ($deal['url'] ?? '')),
                'endDate' => \trim((string) ($deal['endDate'] ?? '')),
                'media' => $media,
            ];
        }

        $slot->setData(new ArrayStruct(['deals' => $resolved]));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readDeals(CmsSlotEntity $slot): array
    {
        $config = $slot->getFieldConfig()->get('deals');

        if ($config === null) {
            return [];
        }

        $value = $config->getValue();

        if (!\is_array($value)) {
            return [];
        }

        // Yalnızca dizi olan elemanları geçir — bozuk config render'ı çökertmesin.
        return \array_values(\array_filter($value, static fn ($deal) => \is_array($deal)));
    }

    private function normaliseId(mixed $id): ?string
    {
        if (!\is_string($id) || $id === '') {
            return null;
        }

        return \strtolower($id);
    }
}
