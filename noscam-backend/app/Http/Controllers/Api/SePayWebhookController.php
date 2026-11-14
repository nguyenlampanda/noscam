<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\Social\SePaySettlementService;

class SePayWebhookController extends Controller
{
    public function receive(
        Request $request,
        SePaySettlementService $settlement
    ): JsonResponse
    {
        $key = config('sepay.webhook_key');

        if (!is_string($key) || $key === '') {
            return response()->json(['success' => false], 503);
        }

        $authorization = $request->header('Authorization', '');

        if (!str_starts_with($authorization, 'Apikey ')
            || !hash_equals($key, substr($authorization, 7))) {
            return response()->json(['success' => false], 401);
        }

        $data = $request->validate([
            'id' => ['required', 'integer', 'min:1'],
            'accountNumber' => ['required', 'string'],
            'transferType' => ['required', 'in:in,out'],
            'transferAmount' => ['required', 'integer', 'min:1'],
            'content' => ['required', 'string'],
            'transactionDate' => ['nullable', 'string'],
        ]);

        $expectedAccount = config('sepay.bank_account');

        if (!is_string($expectedAccount) || $expectedAccount === '') {
            return response()->json(['success' => false], 503);
        }

        $status = 'received';
        $error = null;

        if ($data['transferType'] !== 'in') {
            $status = 'unmatched';
            $error = 'Không phải giao dịch tiền vào.';
        } elseif (!hash_equals(
            $expectedAccount,
            $data['accountNumber']
        )) {
            $status = 'unmatched';
            $error = 'Tài khoản nhận không khớp.';
        }

        // NOSCAM_SEPAY_USERNAME_MATCH_V2
        $username = null;
        $topupId = null;

        if ($status === 'received') {
            $matcher = app(\App\Services\Social\SePayTransferMatcher::class);
            $username = $matcher->usernameFromContent(
                (string) $data['content']
            );

            if ($username !== null) {
                if ((int) $data['transferAmount'] < 10000) {
                    $status = 'unmatched';
                    $error = 'Số tiền nạp tối thiểu là 10.000đ.';
                }

                $user = $matcher->userFromContent(
                    (string) $data['content']
                );

                if ($user === null) {
                    $status = 'unmatched';
                    $error = 'Không tìm thấy username.';
                } elseif ($status === 'received') {
                    $status = 'received';
                    $error = 'Đã nhận diện username, chờ đối soát.';
                }
            }
        }

        // NOSCAM_SEPAY_MATCH_V1
        $topupId = null;

        if ($status === 'received' && $username === null) {
            $content = trim($data['content']);

            // Chỉ nhận mã TP nguyên vẹn hoặc nằm giữa các khoảng trắng.
            preg_match_all(
                '/(?<![A-Za-z0-9-])TP-[0-9]{14}-[A-Za-z0-9]{6}(?![A-Za-z0-9-])/',
                $content,
                $matches
            );

            $codes = array_unique($matches[0]);

            if (count($codes) !== 1) {
                $status = 'unmatched';
                $error = 'Không tìm thấy đúng một mã nạp hợp lệ.';
            } else {
                $topup = DB::table('wallet_topups')
                    ->where('code', array_values($codes)[0])
                    ->first();

                if (!$topup) {
                    $status = 'unmatched';
                    $error = 'Không tìm thấy yêu cầu nạp.';
                } elseif ($topup->status !== 'pending') {
                    $status = 'unmatched';
                    $error = 'Yêu cầu nạp không còn chờ xử lý.';
                } elseif ($topup->method !== 'bank_transfer') {
                    $status = 'unmatched';
                    $error = 'Phương thức nạp không hợp lệ.';
                } elseif (
                    !$this->sameVnd(
                        $topup->amount,
                        $data['transferAmount']
                    )
                ) {
                    $status = 'unmatched';
                    $error = 'Số tiền chuyển khoản không khớp.';
                } else {
                    $status = 'matched';
                    $topupId = $topup->id;
                }
            }
        }

        // NOSCAM_SEPAY_AUTOMATIC_TOPUP_V3
        // Unique(provider, provider_transaction_id) is the concurrency gate.
        // A new SP topup is created only by the request that inserted its webhook.
        try {
            [$webhookId, $created] = DB::transaction(function () use (
                $data, $request, $status, $error, $topupId, $username
            ) {
                $inserted = DB::table('bank_webhook_transactions')->insertOrIgnore([
                    'provider' => 'sepay',
                    'provider_transaction_id' => (string) $data['id'],
                    'bank_account' => $data['accountNumber'],
                    'transfer_type' => $data['transferType'],
                    'amount' => $data['transferAmount'],
                    'transfer_content' => $data['content'],
                    'status' => $status,
                    'wallet_topup_id' => $topupId,
                    'error_message' => $error,
                    'payload' => json_encode($request->all()),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $stored = DB::table('bank_webhook_transactions')
                    ->where('provider', 'sepay')
                    ->where('provider_transaction_id', (string) $data['id'])
                    ->first();

                if (!$stored) {
                    throw new \RuntimeException('Webhook was not persisted.');
                }

                if ((string) $stored->bank_account !== (string) $data['accountNumber']
                    || (string) $stored->transfer_type !== (string) $data['transferType']
                    || !$this->sameVnd($stored->amount, $data['transferAmount'])
                    || (string) $stored->transfer_content !== (string) $data['content']) {
                    return [null, false];
                }

                if ($inserted === 1 && $status === 'received' && $username !== null) {
                    $user = app(\App\Services\Social\SePayTransferMatcher::class)
                        ->userFromContent((string) $data['content']);

                    if (!$user || (int) $data['transferAmount'] < 10000) {
                        throw new \RuntimeException('Invalid username topup.');
                    }

                    $newTopupId = DB::table('wallet_topups')->insertGetId([
                        'code' => 'SP-'.$data['id'],
                        'user_id' => $user->id,
                        'amount' => $data['transferAmount'],
                        'method' => 'bank_transfer',
                        'status' => 'pending',
                        'bank_reference' => (string) $data['id'],
                        'note' => 'VietinBank automatic topup',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    DB::table('bank_webhook_transactions')
                        ->where('id', $stored->id)
                        ->update([
                            'wallet_topup_id' => $newTopupId,
                            'status' => 'matched',
                            'error_message' => null,
                            'updated_at' => now(),
                        ]);
                }

                return [(int) $stored->id, $inserted === 1];
            }, 3);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => 'Unable to record transaction.',
            ], 503);
        }

        if ($webhookId === null) {
            return response()->json([
                'success' => false,
                'message' => 'Conflicting transaction ID.',
            ], 409);
        }

        // Never auto-settle legacy TP topups: they belong to the manual flow.
        // A duplicate SP delivery can retry a failed settlement safely.
        if (config('sepay.auto_credit_enabled') === true) {
            $stored = DB::table('bank_webhook_transactions')
                ->where('id', $webhookId)->first();
            if ($stored && $stored->status === 'matched' && $stored->wallet_topup_id) {
                $linkedTopup = DB::table('wallet_topups')
                    ->where('id', $stored->wallet_topup_id)->first();
                if ($linkedTopup && str_starts_with((string) $linkedTopup->code, 'SP-')) {
                    try {
                        $settlement->settle($webhookId);
                    } catch (\Throwable $e) {
                        report($e);
                        return response()->json([
                            'success' => false,
                            'message' => 'Settlement failed.',
                        ], 503);
                    }
                }
            }
        }

        return response()->json(['success' => true], $created ? 201 : 200);
    }

    private function sameVnd(
        mixed $left,
        mixed $right
    ): bool {
        $normalize = static function (mixed $value): ?string {
            $value = (string) $value;

            if (!preg_match(
                '/^\d+(?:\.\d{1,4})?$/',
                $value
            )) {
                return null;
            }

            [$whole, $fraction] = array_pad(
                explode('.', $value, 2),
                2,
                ''
            );

            if (trim($fraction, '0') !== '') {
                return null;
            }

            $whole = ltrim($whole, '0');

            return $whole === '' ? '0' : $whole;
        };

        $a = $normalize($left);
        $b = $normalize($right);

        return $a !== null
            && $b !== null
            && $a === $b;
    }

}
