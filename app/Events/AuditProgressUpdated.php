<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AuditProgressUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly string $auditId,
        public readonly array $payload,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("audit.{$this->auditId}")];
    }

    public function broadcastAs(): string
    {
        return 'progress';
    }
}