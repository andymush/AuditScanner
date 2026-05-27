<?php
// config/audithawk.php

return [

    'anthropic' => [
        'key'      => env('ANTHROPIC_API_KEY'),
        'model'    => env('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514'),
        'base_url' => 'https://api.anthropic.com/v1',
        'version'  => '2023-06-01',
        'max_tokens' => 8096,
    ],

    'gemini' => [
        'key'      => env('GEMINI_API_KEY'),
        'model'    => env('GEMINI_MODEL', 'gemini-2.0-flash'),
        'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/models'),
        'max_tokens' => 8192,
        'temperature' => 0.1,
    ],

    'github' => [
        'token'    => env('GITHUB_TOKEN'),
        'base_url' => 'https://api.github.com',
    ],

    'audit' => [
        // File extensions worth scanning
        'auditable_extensions' => [
            'php', 'js', 'ts', 'py', 'go', 'java', 'rb',
            'env', 'json', 'yaml', 'yml', 'xml', 'sql',
            'sh', 'bash', 'config', 'conf', 'ini',
        ],

        // Directories to skip entirely
        'skip_directories' => [
            'vendor', 'node_modules', '.git', 'storage',
            'bootstrap/cache', 'public/build', 'dist',
        ],

        // Max file size to send to AI (bytes)
        'max_file_size' => 100000, // 100KB per file

        // Max total files per audit
        'max_files' => 50,
    ],

];