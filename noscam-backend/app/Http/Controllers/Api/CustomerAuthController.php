<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Social\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CustomerAuthController extends Controller
{
    public function register(
        Request $request,
        WalletService $walletService
    ): JsonResponse {
        $data = $request->validate([
            'username' => [
                'required',
                'string',
                'min:3',
                'max:30',
                'regex:/^[a-zA-Z0-9._]+$/',
                'unique:users,username',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $username = strtolower(
            trim($data['username'])
        );

        $user = DB::transaction(
            function () use (
                $username,
                $data,
                $walletService
            ) {
                $user = User::create([
                    'name' => $username,
                    'username' => $username,
                    'email' => null,
                    'password' => $data['password'],
                    'role' => 'user',
                ]);

                $walletService
                    ->getOrCreate($user);

                return $user;
            }
        );

        $token = $user
            ->createToken(
                'customer-web',
                ['customer']
            )
            ->plainTextToken;

        return response()->json([
            'message' => 'Đăng ký thành công.',
            'data' => [
                'token' => $token,
                'user' => $this->userData($user),
            ],
        ], 201);
    }

    public function login(
        Request $request
    ): JsonResponse {
        $data = $request->validate([
            'username' => [
                'required',
                'string',
            ],
            'password' => [
                'required',
                'string',
            ],
        ]);

        $username = strtolower(
            trim($data['username'])
        );

        $user = User::query()
            ->where('username', $username)
            ->first();

        if (
            !$user ||
            !Hash::check(
                $data['password'],
                $user->password
            )
        ) {
            throw ValidationException::withMessages([
                'username' => [
                    'Username hoặc mật khẩu không chính xác.',
                ],
            ]);
        }

        if ($user->canModerate()) {
            return response()->json([
                'message' =>
                    'Vui lòng sử dụng trang đăng nhập quản trị.',
            ], 403);
        }

        $user->tokens()
            ->where(
                'name',
                'customer-web'
            )
            ->delete();

        $token = $user
            ->createToken(
                'customer-web',
                ['customer']
            )
            ->plainTextToken;

        return response()->json([
            'message' => 'Đăng nhập thành công.',
            'data' => [
                'token' => $token,
                'user' => $this->userData($user),
            ],
        ]);
    }

    public function me(
        Request $request
    ): JsonResponse {
        return response()->json([
            'data' => [
                'user' => $this->userData(
                    $request->user()
                ),
            ],
        ]);
    }

    public function logout(
        Request $request
    ): JsonResponse {
        $request
            ->user()
            ?->currentAccessToken()
            ?->delete();

        return response()->json([
            'message' => 'Đăng xuất thành công.',
        ]);
    }

    private function userData(
        User $user
    ): array {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->name,
            'email' => $user->email,
        ];
    }
}
