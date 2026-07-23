<?php declare(strict_types=1);

namespace VapeStoreTheme\Service;

/**
 * Mega menü görselinin cache'lenebilir, hafif temsili.
 *
 * NEDEN MediaEntity DEĞİL:
 * `MediaEntity` cache'e konulduğunda association'ları, translation'ları ve
 * `Context` bağımlılıklarıyla birlikte şişer; serialize/unserialize maliyeti
 * ve sürüm kırılganlığı getirir. Mega menüde 48px yuvarlak görsel için
 * gereken tek şey URL + alt/title metni. Bu yüzden yalnızca o alanlar
 * saklanır — cache girdisi birkaç yüz bayt kalır ve entity hidrasyonu
 * (media + thumbnails + translation sorguları) tamamen ortadan kalkar.
 *
 * Twig tarafında `.url`, `.alt`, `.title` doğrudan okunabilir.
 */
class CategoryImage implements \JsonSerializable
{
    public function __construct(
        private readonly string $mediaId,
        private readonly string $url,
        private readonly ?string $alt = null,
        private readonly ?string $title = null
    ) {
    }

    public function getMediaId(): string
    {
        return $this->mediaId;
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public function getAlt(): ?string
    {
        return $this->alt;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    /**
     * Twig'de `image.url` yazımını mümkün kılan sihirli erişimciler zaten
     * getter'lar üzerinden çalışır; bu metot yalnızca debug/serileştirme için.
     *
     * @return array{mediaId: string, url: string, alt: string|null, title: string|null}
     */
    public function jsonSerialize(): array
    {
        return [
            'mediaId' => $this->mediaId,
            'url' => $this->url,
            'alt' => $this->alt,
            'title' => $this->title,
        ];
    }
}
