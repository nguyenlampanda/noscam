<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class CustomerProfileController extends Controller
{
    public function show(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    public function update(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        $data = $request->validate([
            'name' => [
                'nullable',
                'string',
                'max:100',
            ],

            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique(
                    'users',
                    'email'
                )->ignore($user->id),
            ],
        ]);

        $user->name =
            filled($data['name'] ?? null)
                ? trim($data['name'])
                : $user->username;

        $user->email =
            filled($data['email'] ?? null)
                ? strtolower(
                    trim($data['email'])
                )
                : null;

        $user->save();

        return response()->json([
            'message' =>
                'Cập nhật thông tin thành công.',

            'data' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    public function changePassword(
        Request $request
    ): JsonResponse {
        $data = $request->validate([
            'current_password' => [
                'required',
                'string',
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $user = $request->user();

        if (
            !Hash::check(
                $data['current_password'],
                $user->password
            )
        ) {
            return response()->json([
                'message' =>
                    'Mật khẩu hiện tại không chính xác.',
            ], 422);
        }

        $user->password =
            $data['password'];

        $user->save();

        return response()->json([
            'message' =>
                'Đổi mật khẩu thành công.',
        ]);
    }
}
