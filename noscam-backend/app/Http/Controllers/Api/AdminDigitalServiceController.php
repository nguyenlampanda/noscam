<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminDigitalServiceController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless(
            $request->user()?->isAdmin(),
            403,
            'Chỉ quản trị viên được thực hiện thao tác này.'
        );
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = DigitalService::query();

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $filters = $request->validate([
            'category' => ['sometimes', 'string', 'max:100'],
            'platform' => ['sometimes', 'string', 'max:50'],
            'pricing_type' => ['sometimes', Rule::in(['fixed', 'quote'])],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'search' => ['sometimes', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        if (!empty($filters['platform'])) {
            $query->where('platform', $filters['platform']);
        }

        if (!empty($filters['pricing_type'])) {
            $query->where('pricing_type', $filters['pricing_type']);
        }

        if (isset($filters['status'])) {
            $query->where('is_active', $filters['status'] === 'active');
        }

        return response()->json(
            $query->orderBy('sort_order')
                ->orderBy('id')
                ->paginate(30)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $this->validatedData($request);

        $service = DigitalService::create($data);

        return response()->json([
            'message' => 'Đã tạo dịch vụ.',
            'data' => $service,
        ], 201);
    }

    public function update(
        Request $request,
        DigitalService $digitalService
    ): JsonResponse {
        $this->authorizeAdmin($request);

        $data = $this->validatedData($request, $digitalService);

        $digitalService->update($data);

        return response()->json([
            'message' => 'Đã cập nhật dịch vụ.',
            'data' => $digitalService->refresh(),
        ]);
    }

    public function status(
        Request $request,
        DigitalService $digitalService
    ): JsonResponse {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $digitalService->update($data);

        return response()->json([
            'message' => 'Đã cập nhật trạng thái.',
            'data' => $digitalService->refresh(),
        ]);
    }

    private function validatedData(
        Request $request,
        ?DigitalService $service = null
    ): array {
        $data = $request->validate([
            'code' => [
                'required',
                'string',
                'max:100',
                Rule::unique('digital_services', 'code')
                    ->ignore($service?->id),
            ],
            'category' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'pricing_type' => [
                'required',
                Rule::in(['fixed', 'quote']),
            ],
            'price_vnd' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'platform' => ['nullable', 'string', 'max:50'],
            'requirements' => ['nullable', 'array'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if ($data['pricing_type'] === 'fixed') {
            if (
                !isset($data['price_vnd']) ||
                (float) $data['price_vnd'] <= 0
            ) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'price_vnd' => 'Dịch vụ giá cố định phải có giá lớn hơn 0.',
                ]);
            }
        } else {
            $data['price_vnd'] = null;
        }

        return $data;
    }
}
