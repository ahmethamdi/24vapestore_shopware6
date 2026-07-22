<?php declare(strict_types=1);

namespace VapeStoreTheme\Command;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\Uuid\Uuid;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * 24vapestore.de kategori ağacını Shopware 6'ya aktarır.
 *
 *   bin/console vape:import-categories           # önizleme, hiçbir şey yazmaz
 *   bin/console vape:import-categories --write   # gerçekten yazar
 *
 * Ağaç kaynağı: docs/reference/category-tree-full.json (canlı siteden crawl edildi).
 *
 * Yeniden çalıştırılabilir: aynı ebeveyn altında aynı isimli kategori varsa
 * atlanır. Yarıda kalan bir aktarım güvenle tekrar başlatılabilir.
 */
#[AsCommand(
    name: 'vape:import-categories',
    description: '24vapestore.de kategori ağacını içe aktarır',
)]
class ImportCategoriesCommand extends Command
{
    private const CHUNK_SIZE = 50;

    private int $created = 0;
    private int $skipped = 0;

    /** @var array<string, string> "parentId|isim" => kategori id */
    private array $existing = [];

    /** @var array<int, array<string, mixed>> */
    private array $payload = [];

    public function __construct(
        private readonly EntityRepository $categoryRepository,
        private readonly Connection $connection,
        private readonly string $projectDir,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('write', null, InputOption::VALUE_NONE, 'Değişiklikleri gerçekten yaz')
            ->addOption('file', null, InputOption::VALUE_REQUIRED, 'Ağaç JSON dosyası',
                'docs/reference/category-tree-full.json');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $write = (bool) $input->getOption('write');

        $treeFile = $this->projectDir . '/' . $input->getOption('file');

        if (!is_file($treeFile)) {
            $io->error("Ağaç dosyası bulunamadı: {$treeFile}");

            return Command::FAILURE;
        }

        try {
            $tree = json_decode((string) file_get_contents($treeFile), true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            $io->error('Ağaç dosyası okunamadı: ' . $e->getMessage());

            return Command::FAILURE;
        }

        if (!\is_array($tree) || $tree === []) {
            $io->error('Ağaç boş.');

            return Command::FAILURE;
        }

        $rootId = $this->connection->fetchOne(
            'SELECT LOWER(HEX(id)) FROM category WHERE parent_id IS NULL ORDER BY created_at ASC LIMIT 1'
        );

        if (!\is_string($rootId) || $rootId === '') {
            $io->error('Kök kategori bulunamadı.');

            return Command::FAILURE;
        }

        $rootName = $this->connection->fetchOne(
            'SELECT name FROM category_translation WHERE category_id = UNHEX(?) LIMIT 1',
            [$rootId]
        );

        $io->title('Kategori aktarımı');
        $io->text([
            "Kök kategori: <info>{$rootName}</info>",
            'Mod: ' . ($write ? '<comment>YAZMA</comment>' : 'ÖNİZLEME (yazmak için --write)'),
        ]);

        $this->loadExisting();
        $this->walk($tree, $rootId, 0, $io);

        $io->newLine();
        $io->text("Yeni: <info>{$this->created}</info> · Mevcut (atlandı): {$this->skipped}");

        if (!$write) {
            $io->note('Önizleme bitti. Yazmak için --write ekle.');

            return Command::SUCCESS;
        }

        if ($this->payload === []) {
            $io->success('Yazılacak yeni kategori yok — ağaç zaten güncel.');

            return Command::SUCCESS;
        }

        $context = Context::createDefaultContext();

        // walk() üstten aşağı ürettiği için ebeveynler her zaman çocuklardan
        // önce gelir; chunk'lama bu sırayı bozmaz.
        $io->progressStart(\count($this->payload));

        foreach (array_chunk($this->payload, self::CHUNK_SIZE) as $chunk) {
            $this->categoryRepository->create($chunk, $context);
            $io->progressAdvance(\count($chunk));
        }

        $io->progressFinish();
        $io->success("{$this->created} kategori oluşturuldu.");

        return Command::SUCCESS;
    }

    private function loadExisting(): void
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT LOWER(HEX(c.id)) AS id, LOWER(HEX(c.parent_id)) AS parent_id, ct.name
             FROM category c
             JOIN category_translation ct ON ct.category_id = c.id'
        );

        foreach ($rows as $row) {
            $this->existing[$this->key((string) ($row['parent_id'] ?? ''), (string) $row['name'])] = (string) $row['id'];
        }
    }

    /**
     * @param array<string, array{label: ?string, children: array<string, mixed>}> $nodes
     */
    private function walk(array $nodes, string $parentId, int $depth, SymfonyStyle $io): void
    {
        foreach ($nodes as $slug => $node) {
            if (!\is_array($node)) {
                continue;
            }

            $name = \is_string($node['label'] ?? null) && $node['label'] !== ''
                ? $node['label']
                : (string) $slug;

            $key = $this->key($parentId, $name);

            if (isset($this->existing[$key])) {
                $id = $this->existing[$key];
                ++$this->skipped;
            } else {
                $id = Uuid::randomHex();
                $this->existing[$key] = $id;
                ++$this->created;

                $this->payload[] = [
                    'id' => $id,
                    'parentId' => $parentId,
                    'name' => $name,
                    'active' => true,
                    'visible' => true,
                    'type' => 'page',
                    'productAssignmentType' => 'product',
                    'displayNestedProducts' => true,
                ];

                if ($depth < 2) {
                    $io->text(str_repeat('  ', $depth) . "+ {$name}");
                }
            }

            $children = $node['children'] ?? [];

            if (\is_array($children) && $children !== []) {
                $this->walk($children, $id, $depth + 1, $io);
            }
        }
    }

    private function key(string $parentId, string $name): string
    {
        return $parentId . '|' . mb_strtolower($name);
    }
}
