<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAuditRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'source_type' => ['required', 'in:github_url,file_upload'],
            'repo_url' => [
                'required_if:source_type,github_url',
                'nullable',
                'regex:/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/.*)?$/',
            ],
            'file' => ['required_if:source_type,file_upload', 'nullable', 'file', 'mimes:zip', 'max:20480'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'source_type.required' => 'Please select a source type.',
            'source_type.in' => 'Source type must be GitHub URL or file upload.',
            'repo_url.required_if' => 'A GitHub repository URL is required.',
            'repo_url.regex' => 'URL must be a valid GitHub repository: https://github.com/owner/repository',
            'file.required_if' => 'Please upload a ZIP file.',
            'file.mimes' => 'Only ZIP files are accepted.',
            'file.max' => 'ZIP file must be under 20 MB.',
        ];
    }
}
