<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Exchange\ExchangeDisputeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AdminExchangeDisputeController extends Controller
{
    public function resolve(
        Request $request,
        int $disputeId,
        ExchangeDisputeService $service
    ): JsonResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validate([
            'decision' => [
                'required',
                'string',
                Rule::in(['approve', 'refund']),
            ],
            'reason' => [
                'required',
                'string',
                'max:2000',
                function ($attribute, $value, $fail) {
                    if (trim($value) === '') {
                        $fail('Lý do phân xử không được để trống.');
                    }
                },
            ],
        ]);

        try {
            $dispute = $service->resolve(
                $disputeId,
                $request->user(),
                $validated['decision'],
                $validated['reason']
            );
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'dispute' => [$exception->getMessage()],
            ]);
        }

        return response()->json([
            'id' => $dispute->id,
            'claim_id' => $dispute->claim_id,
            'status' => $dispute->status,
            'admin_reason' => $dispute->admin_reason,
            'resolved_at' => $dispute->resolved_at,
        ]);
    }
}
