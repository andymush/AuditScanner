<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use ZipArchive;

class RepoIngestionService
{
    public function fetchFromGithub(string $repoUrl): array
    {
        $parsed = $this->parseGithubUrl($repoUrl);
        $owner = $parsed['owner'];
        $repo = $parsed['repo'];

        $headers = ['Accept' => 'application/vnd.github.v3+json'];
        if ($token = config('audithawk.github.token')) {
            $headers['Authorization'] = "token {$token}";
        }

        $treeResponse = Http::withHeaders($headers)
            ->get(config('audithawk.github.base_url')."/repos/{$owner}/{$repo}/git/trees/HEAD?recursive=1");

        if ($treeResponse->failed()) {
            throw new RuntimeException("GitHub API error: {$treeResponse->status()} for {$repoUrl}");
        }

        $tree = $treeResponse->json('tree', []);
        $files = [];
        $count = 0;
        $maxFiles = config('audithawk.audit.max_files', 50);
        $maxSize = config('audithawk.audit.max_file_size', 100000);

        foreach ($tree as $node) {
            if ($count >= $maxFiles) {
                break;
            }

            if ($node['type'] !== 'blob') {
                continue;
            }

            if (! $this->isAuditableFile($node['path'])) {
                continue;
            }

            if (isset($node['size']) && $node['size'] > $maxSize) {
                continue;
            }

            usleep(100000); // 100ms between requests to respect rate limits

            $contentResponse = Http::withHeaders($headers)
                ->get(config('audithawk.github.base_url')."/repos/{$owner}/{$repo}/contents/{$node['path']}");

            if ($contentResponse->failed()) {
                Log::warning('AuditHawk: failed to fetch file', ['path' => $node['path']]);
                continue;
            }

            $content = base64_decode($contentResponse->json('content', ''));
            if ($content === false || $content === '') {
                continue;
            }

            $files[] = ['path' => $node['path'], 'content' => $content];
            $count++;
        }

        return $files;
    }

    public function fetchFromUpload(string $zipPath, string $auditId): array
    {
        $extractPath = storage_path("app/audits/{$auditId}");

        $zip = new ZipArchive;
        if ($zip->open($zipPath) !== true) {
            throw new RuntimeException('Failed to open uploaded zip file.');
        }

        $zip->extractTo($extractPath);
        $zip->close();

        return $this->readDirectory($extractPath, $extractPath);
    }

    public function cleanupTempFiles(string $auditId): void
    {
        $path = storage_path("app/audits/{$auditId}");
        if (is_dir($path)) {
            $this->deleteDirectory($path);
        }
    }

    private function readDirectory(string $dir, string $baseDir): array
    {
        $files = [];
        $maxFiles = config('audithawk.audit.max_files', 50);
        $maxSize = config('audithawk.audit.max_file_size', 100000);
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir));

        foreach ($iterator as $file) {
            if (count($files) >= $maxFiles) {
                break;
            }

            if (! $file->isFile()) {
                continue;
            }

            $relativePath = ltrim(str_replace($baseDir, '', $file->getPathname()), DIRECTORY_SEPARATOR);

            if ($this->isSkippedDirectory($relativePath)) {
                continue;
            }

            if (! $this->isAuditableFile($relativePath)) {
                continue;
            }

            if ($file->getSize() > $maxSize) {
                continue;
            }

            $content = file_get_contents($file->getPathname());
            if ($content === false || $content === '') {
                continue;
            }

            $files[] = ['path' => $relativePath, 'content' => $content];
        }

        return $files;
    }

    private function isAuditableFile(string $path): bool
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, config('audithawk.audit.auditable_extensions', []), true);
    }

    private function isSkippedDirectory(string $path): bool
    {
        foreach (config('audithawk.audit.skip_directories', []) as $dir) {
            if (str_starts_with($path, $dir.DIRECTORY_SEPARATOR) || str_starts_with($path, $dir.'/')) {
                return true;
            }
        }

        return false;
    }

    private function parseGithubUrl(string $url): array
    {
        $path = parse_url($url, PHP_URL_PATH);
        $parts = array_values(array_filter(explode('/', trim($path, '/'))));

        if (count($parts) < 2) {
            throw new RuntimeException("Invalid GitHub URL: {$url}");
        }

        return ['owner' => $parts[0], 'repo' => $parts[1]];
    }

    private function deleteDirectory(string $dir): void
    {
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }

        rmdir($dir);
    }
}