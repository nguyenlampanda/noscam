<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'scam_type' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'bank_account' => ['nullable', 'string', 'max:100'],
            'bank' => ['nullable', 'string', 'max:150'],
            'social' => ['nullable', 'string', 'max:500'],
            'website' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:10000'],
            'loss_amount' => ['nullable', 'numeric', 'min:0'],
            'occurred_at' => [
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'evidences' => [
                'nullable',
                'array',
                'max:5',
            ],

            'evidences.*' => [
                'file',
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:5120',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'evidences.array' =>
                'Danh sách bằng chứng không hợp lệ.',

            'evidences.max' =>
                'Mỗi báo cáo chỉ được tải lên tối đa 5 tệp.',

            'evidences.*.file' =>
                'Bằng chứng tải lên phải là tệp hợp lệ.',

            'evidences.*.mimes' =>
                'Bằng chứng chỉ hỗ trợ JPG, JPEG, PNG, WEBP hoặc PDF.',

            'evidences.*.max' =>
                'Mỗi tệp bằng chứng không được vượt quá 5 MB.',
        ];
    }

    public function after(): array
    {
        return [
            function ($validator) {
                $hasInformation =
                    filled($this->phone) ||
                    filled($this->bank_account) ||
                    filled($this->social) ||
                    filled($this->website) ||
                    filled($this->description);

                if (! $hasInformation) {
                    $validator->errors()->add(
                        'report',
                        'Vui lòng cung cấp ít nhất một thông tin liên quan.'
                    );
                }
            },
        ];
    }
}