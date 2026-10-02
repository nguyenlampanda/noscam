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
            'scam_type' => [
                'nullable',
                'string',
                'max:100',
            ],

            'phone' => [
                'nullable',
                'string',
                'max:30',
            ],

            'bank_account' => [
                'nullable',
                'string',
                'max:100',
            ],

            'bank' => [
                'nullable',
                'string',
                'max:150',
            ],

            'social' => [
                'nullable',
                'string',
                'max:500',
            ],

            'website' => [
                'nullable',
                'string',
                'max:500',
            ],

            'description' => [
                'nullable',
                'string',
                'max:10000',
            ],

            'loss_amount' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'occurred_at' => [
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'website_confirm' => [
                'nullable',
                'string',
                'max:200',
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
            'phone.max' =>
                'Số điện thoại không hợp lệ.',

            'bank_account.max' =>
                'Số tài khoản quá dài.',

            'description.max' =>
                'Nội dung mô tả không được vượt quá 10.000 ký tự.',

            'loss_amount.numeric' =>
                'Số tiền thiệt hại phải là số.',

            'loss_amount.min' =>
                'Số tiền thiệt hại không được nhỏ hơn 0.',

            'occurred_at.date' =>
                'Ngày xảy ra không hợp lệ.',

            'occurred_at.before_or_equal' =>
                'Ngày xảy ra không được nằm trong tương lai.',

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
                /*
                 * Nếu honeypot có dữ liệu thì không cần
                 * validation tiếp ở đây.
                 * Controller sẽ xử lý âm thầm.
                 */
                if (filled($this->website_confirm)) {
                    return;
                }

                $hasInformation =
                    filled($this->phone) ||
                    filled($this->bank_account) ||
                    filled($this->social) ||
                    filled($this->website) ||
                    filled($this->description);

                if (! $hasInformation) {
                    $validator
                        ->errors()
                        ->add(
                            'report',
                            'Vui lòng cung cấp ít nhất một thông tin liên quan.'
                        );
                }

                $this->validatePhone($validator);
                $this->validateBankAccount($validator);
                $this->validateWebsite($validator);
            },
        ];
    }

    private function validatePhone(
        $validator
    ): void {
        if (! filled($this->phone)) {
            return;
        }

        $digits =
            preg_replace(
                '~[^0-9]+~',
                '',
                (string) $this->phone
            ) ?? '';

        if (
            strlen($digits) < 9 ||
            strlen($digits) > 12
        ) {
            $validator
                ->errors()
                ->add(
                    'phone',
                    'Số điện thoại không hợp lệ.'
                );
        }
    }

    private function validateBankAccount(
        $validator
    ): void {
        if (! filled($this->bank_account)) {
            return;
        }

        $value =
            preg_replace(
                '~[\s-]+~',
                '',
                (string) $this->bank_account
            ) ?? '';

        if (
            ! preg_match(
                '~^[A-Za-z0-9]{4,30}$~',
                $value
            )
        ) {
            $validator
                ->errors()
                ->add(
                    'bank_account',
                    'Số tài khoản không hợp lệ.'
                );
        }
    }

    private function validateWebsite(
        $validator
    ): void {
        if (! filled($this->website)) {
            return;
        }

        $website = trim(
            (string) $this->website
        );

        if (
            ! preg_match(
                '~^https?://~i',
                $website
            )
        ) {
            $website =
                'https://' . $website;
        }

        $host = parse_url(
            $website,
            PHP_URL_HOST
        );

        if (
            ! is_string($host) ||
            $host === '' ||
            ! str_contains($host, '.')
        ) {
            $validator
                ->errors()
                ->add(
                    'website',
                    'Website không hợp lệ.'
                );
        }
    }
}