<?php

namespace App\Providers;

use App\Services\AuditPipelineService;
use App\Services\CveService;
use App\Services\FindingReconciliationService;
use App\Services\Providers\ClaudeSecurityProvider;
use App\Services\Providers\GeminiSecurityProvider;
use App\Services\RepoIngestionService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ClaudeSecurityProvider::class);
        $this->app->singleton(GeminiSecurityProvider::class);
        $this->app->singleton(FindingReconciliationService::class);
        $this->app->singleton(CveService::class);
        $this->app->singleton(AuditPipelineService::class);
        $this->app->singleton(RepoIngestionService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->enforceApiKeys();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function enforceApiKeys(): void
    {
        if (app()->runningUnitTests() || app()->runningInConsole() || config('audithawk.demo_mode')) {
            return;
        }

        if (empty(config('audithawk.gemini.key'))) {
            throw new \RuntimeException('GEMINI_API_KEY is missing from .env');
        }
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
