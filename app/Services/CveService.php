<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CveService
{
    private const OSV_URL = 'https://api.osv.dev/v1/query';

    private const CACHE_TTL = 86400; // 24 hours

    public function enrichFindings(array $findings): array
    {
        foreach ($findings as &$finding) {
            if ($finding['type'] !== 'insecure_dependency') {
                continue;
            }

            $parsed = $this->parsePackageFromDescription($finding['description']);
            if ($parsed === null) {
                continue;
            }

            $cves = $this->fetchCves($parsed['name'], $parsed['version']);
            if (! empty($cves)) {
                $finding['cve_references'] = array_unique(
                    array_merge($finding['cve_references'] ?? [], $cves)
                );
            }
        }
        unset($finding);

        return $findings;
    }

    private function fetchCves(string $packageName, string $version): array
    {
        $cacheKey = "cve:{$packageName}:{$version}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($packageName, $version): array {
            try {
                $response = Http::timeout(10)->post(self::OSV_URL, [
                    'version' => $version,
                    'package' => ['name' => $packageName],
                ]);

                if ($response->failed()) {
                    return [];
                }

                $vulns = $response->json('vulns', []);

                return array_values(array_filter(array_map(
                    fn (array $v): ?string => $v['id'] ?? null,
                    $vulns
                )));
            } catch (\Throwable $e) {
                Log::warning('AuditHawk: CVE lookup failed', ['package' => $packageName, 'error' => $e->getMessage()]);

                return [];
            }
        });
    }

    private function parsePackageFromDescription(string $description): ?array
    {
        // Match patterns like "package@1.2.3", "package 1.2.3", "package version 1.2.3"
        if (preg_match('/([a-zA-Z0-9\-_\/\.]+)[@\s]+([\d]+\.[\d]+[\d\.\w\-]*)/', $description, $matches)) {
            return ['name' => $matches[1], 'version' => $matches[2]];
        }

        return null;
    }
}