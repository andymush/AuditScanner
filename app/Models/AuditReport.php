<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuditReport extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'status',
        'source_type',
        'repo_url',
        'repo_name',
        'meta',
        'error_message',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'meta'         => 'array',
        'started_at'   => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function findings(): HasMany
    {
        return $this->hasMany(AuditFinding::class);
    }

    public function getSummaryAttribute(): array
    {
        $findings = $this->findings;

        return [
            'total'     => $findings->count(),
            'critical'  => $findings->where('severity', 'critical')->count(),
            'high'      => $findings->where('severity', 'high')->count(),
            'medium'    => $findings->where('severity', 'medium')->count(),
            'low'       => $findings->where('severity', 'low')->count(),
            'confirmed' => $findings->where('consensus', 'confirmed')->count(),
        ];
    }
}