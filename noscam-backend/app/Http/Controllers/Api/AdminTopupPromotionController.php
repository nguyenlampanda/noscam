<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminTopupPromotionController extends Controller
{
    public function index(): JsonResponse
    {
        $items = DB::table('topup_promotions')
            ->orderByDesc('id')
            ->paginate(20);

        $audits = DB::table('topup_promotion_audits as a')
            ->leftJoin('users as u', 'u.id', '=', 'a.actor_id')
            ->select('a.id', 'a.promotion_id', 'a.action', 'a.created_at',
                'u.name as actor_name', 'u.email as actor_email')
            ->orderByDesc('a.id')->limit(30)->get();

        return response()->json([
            'data' => $items->items(),
            'current_page' => $items->currentPage(),
            'last_page' => $items->lastPage(),
            'audit_history' => $audits,
        ]);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'mode' => [
                'required',
                Rule::in(['recurring', 'specific_dates', 'time_window']),
            ],
            'bonus_percent' => ['required', 'numeric', 'gt:0', 'lte:100'],
            'min_topup' => ['required', 'numeric', 'min:0'],
            'max_bonus' => ['nullable', 'numeric', 'gt:0'],
            'max_uses_per_user' => ['nullable', 'integer', 'min:1'],
            'max_total_uses' => ['nullable', 'integer', 'min:1'],
            'weekdays' => ['nullable', 'array'],
            'weekdays.*' => ['integer', 'between:1,7', 'distinct'],
            'month_days' => ['nullable', 'array'],
            'month_days.*' => ['integer', 'between:1,31', 'distinct'],
            'specific_dates' => ['nullable', 'array'],
            'specific_dates.*' => ['date_format:Y-m-d', 'distinct'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
        ]);

        $mode = $data['mode'];

        if ($mode === 'recurring') {
            if (empty($data['weekdays']) && empty($data['month_days'])) {
                throw ValidationException::withMessages([
                    'mode' => 'Cần chọn thứ trong tuần hoặc ngày trong tháng.',
                ]);
            }
        }

        if ($mode === 'specific_dates') {
            if (empty($data['specific_dates'])
                && (empty($data['start_date']) || empty($data['end_date']))) {
                throw ValidationException::withMessages([
                    'mode' => 'Cần chọn ngày riêng lẻ hoặc khoảng ngày.',
                ]);
            }
        }

        if ($mode === 'time_window') {
            foreach (['start_date', 'end_date', 'start_time', 'end_time'] as $key) {
                if (empty($data[$key])) {
                    throw ValidationException::withMessages([
                        $key => 'Khung giờ cần đầy đủ ngày và giờ bắt đầu/kết thúc.',
                    ]);
                }
            }
        }

        if (!empty($data['start_date']) && !empty($data['end_date'])
            && $data['start_date'] > $data['end_date']) {
            throw ValidationException::withMessages([
                'end_date' => 'Ngày kết thúc phải sau ngày bắt đầu.',
            ]);
        }

        if ($mode === 'time_window'
            && $data['start_time'] >= $data['end_time']) {
            throw ValidationException::withMessages([
                'end_time' => 'Giờ kết thúc phải sau giờ bắt đầu.',
            ]);
        }

        foreach (['weekdays', 'month_days', 'specific_dates'] as $field) {
            $data[$field] = !empty($data[$field])
                ? json_encode(array_values($data[$field]))
                : null;
        }

        $data['timezone'] = 'Asia/Ho_Chi_Minh';

        return $data;
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $now = now();

        $id = DB::transaction(function () use ($data, $now, $request) {
            $id = DB::table('topup_promotions')->insertGetId([
                ...$data,
                'is_enabled' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->audit($id, $request, 'created', null,
                DB::table('topup_promotions')->find($id));
            return $id;
        });

        return response()->json([
            'message' => 'Đã tạo khuyến mãi, mặc định chưa áp dụng.',
            'data' => DB::table('topup_promotions')->find($id),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $existing = DB::table('topup_promotions')->find($id);

        if (!$existing) {
            return response()->json(['message' => 'Không tìm thấy khuyến mãi.'], 404);
        }

        $data = $this->validated($request);

        DB::transaction(function () use ($id, $request, $data) {
            $before = DB::table('topup_promotions')->lockForUpdate()->find($id);
            if (!$before) abort(404);
            DB::table('topup_promotions')->where('id', $id)
                ->update([...$data, 'updated_at' => now()]);
            $this->audit($id, $request, 'updated', $before,
                DB::table('topup_promotions')->find($id));
        });

        return response()->json([
            'message' => 'Đã cập nhật khuyến mãi.',
            'data' => DB::table('topup_promotions')->find($id),
        ]);
    }

    public function toggle(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'is_enabled' => ['required', 'boolean'],
        ]);

        DB::transaction(function () use ($id, $request, $data) {
            $before = DB::table('topup_promotions')->lockForUpdate()->find($id);
            if (!$before) abort(404);
            DB::table('topup_promotions')->where('id', $id)->update([
                'is_enabled' => $data['is_enabled'],
                'updated_at' => now(),
            ]);
            $this->audit($id, $request, 'toggled', $before,
                DB::table('topup_promotions')->find($id));
        });

        return response()->json([
            'message' => $data['is_enabled']
                ? 'Đã bật áp dụng khuyến mãi.'
                : 'Đã tắt áp dụng khuyến mãi.',
            'data' => DB::table('topup_promotions')->find($id),
        ]);
    }

    private function audit(int $id, Request $request, string $action,
        ?object $before, ?object $after): void
    {
        DB::table('topup_promotion_audits')->insert([
            'promotion_id' => $id,
            'actor_id' => $request->user()?->id,
            'action' => $action,
            'before' => $before ? json_encode($before) : null,
            'after' => $after ? json_encode($after) : null,
            'created_at' => now(),
        ]);
    }

}
