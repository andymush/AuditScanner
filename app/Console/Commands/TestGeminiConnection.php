<?php

namespace App\Console\Commands;

use App\Services\Providers\GeminiSecurityProvider;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('audithawk:test-gemini')]
#[Description('Send a trivially vulnerable snippet to Gemini and dump the findings.')]
class TestGeminiConnection extends Command
{
    public function handle(GeminiSecurityProvider $gemini): int
    {
        $this->info('Testing Gemini connection...');

        $files = [
            [
                'path'    => 'test/VulnerableController.php',
                'content' => <<<'PHP'
<?php
class UserController {
    public function show(Request $request) {
        $id = $request->input('id');
        $user = DB::select("SELECT * FROM users WHERE id = $id");

        $apiKey = "sk-live-abc123supersecretkey";

        return view('user', ['user' => $user]);
    }
}
PHP,
            ],
        ];

        try {
            $findings = $gemini->scanCodebase($files, 'test-audit-'.time());
            $this->info('Gemini returned '.count($findings).' finding(s):');
            $this->line(json_encode($findings, JSON_PRETTY_PRINT));

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Gemini connection failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}