<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    public function login(
        Request $request
    ): JsonResponse {
        $credentials =
            $request->validate([
                'email' => [
                    'required',
                    'email',
                ],

                'password' => [
                    'required',
                    'string',
                ],
            ]);

        $email = strtolower(
            trim(
                $credentials['email']
            )
        );

        $user = User::query()
            ->where(
                'email',
                $email
            )
            ->first();

        if (
            ! $user ||
            ! Hash::check(
                $credentials['password'],
                $user->password
            )
        ) {
            throw ValidationException::withMessages([
                'email' => [
                    'Email hoặc mật khẩu không chính xác.',
                ],
            ]);
        }

        if (! $user->canModerate()) {
            return response()->json([
                'message' =>
                    'Tài khoản không có quyền truy cập khu vực quản trị.',
            ], 403);
        }

        $user
            ->tokens()
            ->delete();

        $token = $user
            ->createToken(
                'admin-panel',
                [
                    'moderate-reports',
                ]
            )
            ->plainTextToken;

        return response()->json([
            'message' =>
                'Đăng nhập thành công.',

            'data' => [
                'token' =>
                    $token,

                'user' =>
                    $this->userData(
                        $user
                    ),
            ],
        ]);
    }

    public function me(
        Request $request
    ): JsonResponse {
        $user =
            $request->user();

        if (
            ! $user ||
            ! $user->canModerate()
        ) {
            return response()->json([
                'message' =>
                    'Phiên đăng nhập không hợp lệ.',
            ], 403);
        }

        return response()->json([
            'data' => [
                'user' =>
                    $this->userData(
                        $user
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
            'message' =>
                'Đăng xuất thành công.',
        ]);
    }

    private function userData(
        User $user
    ): array {
        return [
            'id' =>
                $user->id,

            'name' =>
                $user->name,

            'email' =>
                $user->email,

            'role' =>
                $user->role,
        ];
    }
}