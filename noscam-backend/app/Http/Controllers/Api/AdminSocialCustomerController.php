<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialOrder;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\Social\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class AdminSocialCustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->where('role', 'user')
            ->with('wallet')
            ->withCount('socialOrders');

        if ($request->filled('search')) {
            $search = trim(
                (string) $request->input('search')
            );

            $query->where(function ($q) use ($search) {
                $q->where(
                    'username',
                    'like',
                    "%{$search}%"
                )
                ->orWhere(
                    'name',
                    'like',
                    "%{$search}%"
                )
                ->orWhere(
                    'email',
                    'like',
                    "%{$search}%"
                );
            });
        }

        return response()->json(
            $query
                ->latest()
                ->paginate(50)
        );
    }

    public function show(User $user): JsonResponse
    {
        abort_if(
            $user->role !== 'user',
            404
        );

        $user->load('wallet');

        $transactions = WalletTransaction::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit(50)
            ->get();

        $orders = SocialOrder::query()
            ->where('user_id', $user->id)
            ->with([
                'service:id,code,name,platform,category',
                'provider:id,name,slug',
            ])
            ->latest()
            ->limit(30)
            ->get();

        return response()->json([
            'data' => [
                'user' => $user,
                'transactions' => $transactions,
                'orders' => $orders,
            ],
        ]);
    }


    /* NOSCAM_ADMIN_USERS_V1 */

    private function requireAdministrator(Request $request): void
    {
        abort_unless(
            $request->user()?->role === 'admin',
            403,
            'Chỉ Admin được thực hiện thao tác này.'
        );
    }

    public function updateProfile(
        Request $request,
        User $user
    ): JsonResponse {
        $this->requireAdministrator($request);
        abort_unless($user->role === 'user', 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'email')
                    ->ignore($user->id),
            ],
            'phone' => [
                'nullable',
                'string',
                'regex:/^0[35789][0-9]{8}$/',
            ],
        ]);

        $before = $user->only([
            'name', 'email', 'phone'
        ]);

        $user->name = trim($data['name']);
        $user->email = filled($data['email'] ?? null)
            ? strtolower(trim($data['email']))
            : null;
        $user->phone = filled($data['phone'] ?? null)
            ? trim($data['phone'])
            : null;

        $user->save();

        Log::info('admin_user_profile_updated', [
            'admin_id' => $request->user()->id,
            'user_id' => $user->id,
            'changed_fields' => array_keys(
                array_diff_assoc(
                    $user->only(['name', 'email', 'phone']),
                    $before
                )
            ),
        ]);

        return response()->json([
            'message' => 'Đã cập nhật hồ sơ người dùng.',
            'data' => ['user' => $user->fresh()],
        ]);
    }

    public function revokeSessions(
        Request $request,
        User $user
    ): JsonResponse {
        $this->requireAdministrator($request);
        abort_unless($user->role === 'user', 404);

        $count = $user->tokens()->delete();

        Log::warning('admin_user_sessions_revoked', [
            'admin_id' => $request->user()->id,
            'user_id' => $user->id,
            'revoked_tokens' => $count,
        ]);

        return response()->json([
            'message' => 'Đã thu hồi phiên đăng nhập.',
            'data' => ['revoked_tokens' => $count],
        ]);
    }

    public function adjustWallet(
        Request $request,
        User $user,
        WalletService $walletService
    ): JsonResponse {
        abort_if(
            $user->role !== 'user',
            404
        );

        $data = $request->validate([
            'direction' => [
                'required',
                'in:credit,debit',
            ],
            'amount' => [
                'required',
                'numeric',
                'min:1',
            ],
            'note' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $amount = (float) $data['amount'];

        $note = trim(
            (string) ($data['note'] ?? '')
        );

        $transaction = DB::transaction(
            function () use (
                $request,
                $user,
                $walletService,
                $data,
                $amount,
                $note
            ) {
                if ($data['direction'] === 'credit') {
                    return $walletService->credit(
                        user: $user,
                        amount: $amount,
                        type: 'deposit',
                        description:
                            $note !== ''
                                ? $note
                                : 'Admin cộng tiền vào ví',
                        createdBy:
                            $request->user()?->id,
                        meta: [
                            'source' =>
                                'admin_customer_management',
                        ]
                    );
                }

                return $walletService->debit(
                    user: $user,
                    amount: $amount,
                    type: 'adjustment',
                    description:
                        $note !== ''
                            ? $note
                            : 'Admin trừ tiền trong ví',
                    meta: [
                        'source' =>
                            'admin_customer_management',
                        'created_by' =>
                            $request->user()?->id,
                    ]
                );
            },
            3
        );

        return response()->json([
            'message' =>
                $data['direction'] === 'credit'
                    ? 'Đã cộng tiền vào ví.'
                    : 'Đã trừ tiền trong ví.',

            'data' => [
                'transaction' => $transaction,
                'wallet' => $walletService
                    ->getOrCreate($user)
                    ->fresh(),
            ],
        ]);
    }
}
