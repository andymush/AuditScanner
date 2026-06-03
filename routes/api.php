<?php

use App\Http\Controllers\AuditController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->prefix('audits')->group(function (): void {
    Route::post('/', [AuditController::class, 'submit']);
    Route::get('/', [AuditController::class, 'index']);
    Route::get('/{id}', [AuditController::class, 'show']);
    Route::get('/{id}/stream', [AuditController::class, 'stream']);
});