<?php

namespace App\Console\Commands;

use App\Services\Providers\ClaudeSecurityProvider;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('audithawk:test-claude')]
#[Description('Send a trivially vulnerable snippet to Claude and dump the findings.')]
class TestClaudeConnection extends Command
{
    public function handle(ClaudeSecurityProvider $claude): int
    {
        $this->info('Testing Claude connection...');

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
            $findings = $claude->scanCodebase($files, 'test-audit-'.time());
            $this->info('Claude returned '.count($findings).' finding(s):');
            $this->line(json_encode($findings, JSON_PRETTY_PRINT));

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Claude connection failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}