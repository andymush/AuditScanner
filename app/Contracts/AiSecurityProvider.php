<?php

namespace App\Contracts;

interface AiSecurityProvider
{
    public function scanCodebase(array $files, string $auditId): array;

    public function getProviderName(): string;
}