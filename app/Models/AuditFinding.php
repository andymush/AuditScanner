<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditFinding extends Model
{
    use HasUuids;

    protected $fillable = [
        'audit_report_id',
        'type',
        'severity',
        'cvss_score',
        'file',
        'line',
        'description',
        'fix_suggestion',
        'fix_suggestions',
        'cve_references',
        'consensus',
        'confidence_score',
        'confirmed_by',
        'reasoning_trace',
    ];

    protected $casts = [
        'cvss_score'       => 'float',
        'confidence_score' => 'float',
        'line'             => 'integer',
        'fix_suggestions'  => 'array',
        'cve_references'   => 'array',
        'confirmed_by'     => 'array',
        'reasoning_trace'  => 'array',
    ];

    public function auditReport(): BelongsTo
    {
        return $this->belongsTo(AuditReport::class);
    }
}