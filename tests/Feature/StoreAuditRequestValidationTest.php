<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StoreAuditRequestValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_valid_github_url_passes(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/audits', [
            'source_type' => 'github_url',
            'repo_url' => 'https://github.com/owner/repository',
        ]);

        $response->assertStatus(202);
    }

    public function test_github_url_with_subpath_passes(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/audits', [
            'source_type' => 'github_url',
            'repo_url' => 'https://github.com/owner/repository/tree/main',
        ]);

        $response->assertStatus(202);
    }

    public function test_non_github_url_is_rejected(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/audits', [
            'source_type' => 'github_url',
            'repo_url' => 'https://gitlab.com/owner/repository',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['repo_url']);
    }

    public function test_http_github_url_is_rejected(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/audits', [
            'source_type' => 'github_url',
            'repo_url' => 'http://github.com/owner/repository',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['repo_url']);
    }

    public function test_github_url_missing_repo_segment_is_rejected(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/audits', [
            'source_type' => 'github_url',
            'repo_url' => 'https://github.com/owner',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['repo_url']);
    }

    public function test_github_url_bare_domain_is_rejected(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/audits', [
            'source_type' => 'github_url',
            'repo_url' => 'https://github.com/',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['repo_url']);
    }

    public function test_arbitrary_string_is_rejected(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/audits', [
            'source_type' => 'github_url',
            'repo_url' => 'not-a-url',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['repo_url']);
    }

    public function test_empty_url_is_rejected(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/audits', [
            'source_type' => 'github_url',
            'repo_url' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['repo_url']);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->postJson('/api/audits', [
            'source_type' => 'github_url',
            'repo_url' => 'https://github.com/owner/repository',
        ]);

        $response->assertStatus(401);
    }

    public function test_valid_zip_upload_passes(): void
    {
        Storage::fake('local');

        $response = $this->actingAs($this->user)
            ->withHeader('Accept', 'application/json')
            ->post('/api/audits', [
                'source_type' => 'file_upload',
                'file' => UploadedFile::fake()->create('project.zip', 1024, 'application/zip'),
            ]);

        $response->assertStatus(202);
    }

    public function test_non_zip_file_is_rejected(): void
    {
        Storage::fake('local');

        $response = $this->actingAs($this->user)
            ->withHeader('Accept', 'application/json')
            ->post('/api/audits', [
                'source_type' => 'file_upload',
                'file' => UploadedFile::fake()->create('project.tar.gz', 1024, 'application/gzip'),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_zip_exceeding_size_limit_is_rejected(): void
    {
        Storage::fake('local');

        $response = $this->actingAs($this->user)
            ->withHeader('Accept', 'application/json')
            ->post('/api/audits', [
                'source_type' => 'file_upload',
                'file' => UploadedFile::fake()->create('large.zip', 21000, 'application/zip'),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_file_upload_without_file_is_rejected(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/audits', [
            'source_type' => 'file_upload',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }
}
