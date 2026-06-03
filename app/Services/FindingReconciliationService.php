<?php

namespace App\Services;

class FindingReconciliationService
{
    private const LINE_PROXIMITY = 5;

    public function reconcile(array $claudeFindings, array $geminiFindings): array
    {
        $matched = [];
        $usedGeminiIndexes = [];

        foreach ($claudeFindings as $claudeFinding) {
            $matchIndex = $this->findMatch($claudeFinding, $geminiFindings, $usedGeminiIndexes);

            if ($matchIndex !== null) {
                $matched[] = $this->buildConfirmedFinding($claudeFinding, $geminiFindings[$matchIndex]);
                $usedGeminiIndexes[] = $matchIndex;
            } else {
                $matched[] = $this->buildSingleEngineFinding($claudeFinding, 'claude_only', 'claude');
            }
        }

        foreach ($geminiFindings as $index => $geminiItem) {
            if (in_array($index, $usedGeminiIndexes, true)) {
                continue;
            }
            $matched[] = $this->buildSingleEngineFinding($geminiItem, 'gemini_only', 'gemini');
        }

        usort($matched, function (array $a, array $b): int {
            if ($a['consensus'] !== $b['consensus']) {
                return $a['consensus'] === 'confirmed' ? -1 : 1;
            }

            return $b['cvss_score'] <=> $a['cvss_score'];
        });

        return $matched;
    }

    private function findMatch(array $claudeFinding, array $geminiFindings, array $usedIndexes): ?int
    {
        foreach ($geminiFindings as $index => $gemini) {
            if (in_array($index, $usedIndexes, true)) {
                continue;
            }

            if ($claudeFinding['type'] !== $gemini['type']) {
                continue;
            }

            if ($claudeFinding['file'] !== $gemini['file']) {
                continue;
            }

            $claudeLine = $claudeFinding['line'] ?? null;
            $geminiLine = $gemini['line'] ?? null;

            if ($claudeLine !== null && $geminiLine !== null) {
                if (abs($claudeLine - $geminiLine) > self::LINE_PROXIMITY) {
                    continue;
                }
            }

            return $index;
        }

        return null;
    }

    private function buildConfirmedFinding(array $claude, array $gemini): array
    {
        return [
            'type'             => $claude['type'],
            'severity'         => $claude['severity'],
            'cvss_score'       => max($claude['cvss_score'], $gemini['cvss_score']),
            'file'             => $claude['file'],
            'line'             => $claude['line'],
            'description'      => $claude['description'],
            'fix_suggestion'   => $claude['fix_suggestion'],
            'fix_suggestions'  => [
                'primary'     => $claude['fix_suggestion'],
                'alternative' => $gemini['fix_suggestion'],
            ],
            'cve_references'  => $claude['cve_references'] ?? [],
            'consensus'       => 'confirmed',
            'confidence_score' => 0.95,
            'confirmed_by'    => ['claude', 'gemini'],
            'reasoning_trace' => $this->buildReasoningTrace($claude),
        ];
    }

    private function buildSingleEngineFinding(array $finding, string $consensus, string $engine): array
    {
        return [
            'type'             => $finding['type'],
            'severity'         => $finding['severity'],
            'cvss_score'       => $finding['cvss_score'],
            'file'             => $finding['file'],
            'line'             => $finding['line'],
            'description'      => $finding['description'],
            'fix_suggestion'   => $finding['fix_suggestion'],
            'fix_suggestions'  => [
                'primary'     => $finding['fix_suggestion'],
                'alternative' => null,
            ],
            'cve_references'  => $finding['cve_references'] ?? [],
            'consensus'       => $consensus,
            'confidence_score' => 0.65,
            'confirmed_by'    => [$engine],
            'reasoning_trace' => $this->buildReasoningTrace($finding),
        ];
    }

    private function buildReasoningTrace(array $finding): array
    {
        if (! empty($finding['reasoning'])) {
            return array_filter(explode("\n", $finding['reasoning']));
        }

        return [];
    }
}