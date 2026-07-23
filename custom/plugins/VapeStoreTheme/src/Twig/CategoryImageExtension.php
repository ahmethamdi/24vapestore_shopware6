<?php declare(strict_types=1);

namespace VapeStoreTheme\Twig;

use Shopware\Core\Content\Category\CategoryEntity;
use Shopware\Core\Content\Media\MediaEntity;
use Shopware\Core\Framework\Context;
use VapeStoreTheme\Service\CategoryImage;
use VapeStoreTheme\Service\CategoryImageResolver;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Mega menü kategori görselini twig'e açar.
 *
 * Twig'de tek satır kullanım:
 *
 *   {% set catMedia = vape_category_image(item.category, context.context) %}
 *
 * Dönen değer:
 *   - MediaEntity  → kategori medyası VEYA alt ağaçtaki bir ürünün kapağı
 *   - null         → hiçbiri yok, twig baş harfe düşsün
 *
 * Öncelik sırası burada uygulanır: önce kategorinin kendi medyası
 * (NavigationRoute zaten `media` association'ını yüklüyor, ek sorgu yok),
 * o yoksa servis üzerinden ürün kapağı.
 */
class CategoryImageExtension extends AbstractExtension
{
    public function __construct(
        private readonly CategoryImageResolver $resolver
    ) {
    }

    /**
     * @return array<int, TwigFunction>
     */
    public function getFunctions(): array
    {
        return [
            new TwigFunction('vape_category_image', $this->getCategoryImage(...)),
            new TwigFunction('vape_category_images', $this->getCategoryImages(...)),
        ];
    }

    /**
     * Tek kategori için görsel çözer (öncelik sırası dahil).
     *
     * Her iki kaynak da aynı `CategoryImage` şeklinde döner; böylece twig
     * tarafında `.url` / `.alt` / `.title` tek biçimde okunur, kaynağın
     * kategori medyası mı ürün kapağı mı olduğunu bilmek gerekmez.
     *
     * @param CategoryEntity|null $category Navigation tree item'ının kategorisi
     */
    public function getCategoryImage(?CategoryEntity $category, ?Context $context): ?CategoryImage
    {
        if ($category === null) {
            return null;
        }

        // 1. öncelik: kategorinin kendi medyası.
        // NavigationRoute bunu zaten yüklüyor → ek sorgu YOK.
        $ownMedia = $category->getMedia();
        if ($ownMedia instanceof MediaEntity) {
            return new CategoryImage(
                $ownMedia->getId(),
                $ownMedia->getUrl(),
                $ownMedia->getAlt(),
                $ownMedia->getTitle()
            );
        }

        if ($context === null) {
            return null;
        }

        // 2. öncelik: alt ağaçtaki herhangi bir ürünün kapak görseli.
        return $this->resolver->getFallbackMedia($category->getId(), $context);
    }

    /**
     * Menü render'ından ÖNCE toplu ısıtma (warm-up) için.
     *
     * Mega menüde ana kategorileri döngüye sokmadan önce bir kez çağrılırsa
     * tüm kategoriler tek sorguda çözülür ve sonraki
     * `vape_category_image()` çağrıları cache'ten döner.
     *
     * @param iterable<mixed> $categories CategoryEntity listesi veya navigation tree
     *
     * @return array<string, CategoryImage>
     */
    public function getCategoryImages(iterable $categories, ?Context $context): array
    {
        if ($context === null) {
            return [];
        }

        $ids = [];
        foreach ($categories as $category) {
            if ($category instanceof CategoryEntity && !$category->getMedia() instanceof MediaEntity) {
                // Yalnızca kendi medyası OLMAYANLAR için ürün kapağı aramaya değer.
                $ids[] = $category->getId();
            }
        }

        if ($ids === []) {
            return [];
        }

        return $this->resolver->getFallbackMediaMap($ids, $context);
    }
}
