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
 * Banner grid (vape-banner-grid) için arka plan görseli çözümleyici.
 *
 * Bannerlar config'te bir dizi olarak durur; her banner mediaId (arka plan
 * görseli), eyebrow, title, text, ctaText ve url içerir. Admin tarafındaki
 * `entity` auto-collect düz alanlar için çalışır, dizi içindeki ID'leri görmez
 * — bu yüzden storefront için burada elle çözümlenir.
 *
 * Akış: collect() tüm bannerlardaki mediaId'ler için TEK Criteria bildirir
 * (N+1 yok) → framework toplu sorgu çalıştırır → enrich() her banner'ı
 * çözümlenmiş MediaEntity ile eşleştirip slot'a yazar → Twig
 * `element.data.banners` ile okur.
 *
 * Görsel yoksa `media` null kalır ve storefront twig'i nötr gradient
 * placeholder'a (kırmızı işaret çizgisi) düşer.
 *
 * Boş config (0 banner) → element.data.banners boş dizi; twig hiç render etmez,
 * patlamadan.
 *
 * ⚠️ Shopware entity ID'lerini küçük harfle saklar. Config'e büyük harfli bir ID
 *    yazılırsa arama eşleşmez ve entity sessizce bulunamaz — ID'ler normalize edilir.
 */
class BannerGridCmsElementResolver extends AbstractCmsElementResolver
{
    private const MEDIA_KEY = 'vape-banner-grid-media';

    public function getType(): string
    {
        return 'vape-banner-grid';
    }

    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        $banners = $this->readBanners($slot);

        if ($banners === []) {
            return null;
        }

        $mediaIds = [];

        foreach ($banners as $banner) {
            $mediaId = $this->normaliseId($banner['mediaId'] ?? null);

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
        $banners = $this->readBanners($slot);

        if ($banners === []) {
            $slot->setData(new ArrayStruct(['banners' => []]));

            return;
        }

        $mediaResult = $result->get(self::MEDIA_KEY . '_' . $slot->getUniqueIdentifier());

        $resolved = [];

        foreach ($banners as $banner) {
            $title = \trim((string) ($banner['title'] ?? ''));
            $eyebrow = \trim((string) ($banner['eyebrow'] ?? ''));
            $text = \trim((string) ($banner['text'] ?? ''));

            $mediaId = $this->normaliseId($banner['mediaId'] ?? null);
            $media = null;

            if ($mediaId !== null && $mediaResult !== null) {
                $candidate = $mediaResult->get($mediaId);
                $media = $candidate instanceof MediaEntity ? $candidate : null;
            }

            // Tamamen boş banner (ne görsel, ne metin) = yönetici henüz
            // doldurmamış seed → atla, storefront'ta boş kutu basmasın.
            if ($media === null && $title === '' && $eyebrow === '' && $text === '') {
                continue;
            }

            $resolved[] = [
                'eyebrow' => $eyebrow,
                'title' => $title,
                'text' => $text,
                'ctaText' => \trim((string) ($banner['ctaText'] ?? '')),
                'url' => \trim((string) ($banner['url'] ?? '')),
                'media' => $media,
            ];
        }

        $slot->setData(new ArrayStruct(['banners' => $resolved]));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readBanners(CmsSlotEntity $slot): array
    {
        $config = $slot->getFieldConfig()->get('banners');

        if ($config === null) {
            return [];
        }

        $value = $config->getValue();

        if (!\is_array($value)) {
            return [];
        }

        // Yalnızca dizi olan elemanları geçir — bozuk config render'ı çökertmesin.
        return \array_values(\array_filter($value, static fn ($banner) => \is_array($banner)));
    }

    private function normaliseId(mixed $id): ?string
    {
        if (!\is_string($id) || $id === '') {
            return null;
        }

        return \strtolower($id);
    }
}
