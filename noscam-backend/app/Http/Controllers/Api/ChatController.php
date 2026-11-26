<?php



namespace App\Http\Controllers\Api;

use App\Events\ChatMessageSent;

use App\Http\Controllers\Controller;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ChatController extends Controller
{
    private function isCustomer(Request $request): bool
    {
        return $request->user()->role === 'user';
    }

    private function isAdmin(Request $request): bool
    {
        return $request->user()->role === 'admin';
    }

    // NOSCAM_CHAT_UNREAD_V4
    public function customerUnread(Request $request)
    {
        if (!$this->isCustomer($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $conversation = ChatConversation::where(
            'customer_id', $request->user()->id
        )->first();

        $count = $conversation
            ? $conversation->messages()
                ->where('sender_id', '!=', $request->user()->id)
                ->whereNull('read_at')
                ->count()
            : 0;

        return response()->json([
            'unread_count' => $count
        ]);
    }

    public function adminUnread(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $count = ChatMessage::query()
            ->whereNull('read_at')
            ->whereHas('sender', function ($query) {
                $query->where('role', 'user');
            })
            ->count();

        return response()->json([
            'unread_count' => $count
        ]);
    }

    public function customerMessages(Request $request)
    {
        if (!$this->isCustomer($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $conversation = ChatConversation::where(
            'customer_id', $request->user()->id
        )->first();

        if (!$conversation) {
            return response()->json([
                'conversation_id' => null,
                'messages' => [],
            ]);
        }

        return response()->json([
            'conversation_id' => $conversation->id,
            'messages' => $conversation->messages()
                ->orderByDesc('id')
                ->limit(100)
                ->get()
                ->reverse()
                ->values(),
        ]);
    }

    public function customerSend(Request $request)
    {
        if (!$this->isCustomer($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'body' => ['nullable', 'required_without:image', 'string', 'max:5000'],
            'image' => [
                'nullable',
                'required_without:body',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:10240',
                'dimensions:max_width=8000,max_height=8000',
            ],
        ]);

        $imagePath = $this->storeChatImage($request);

        try {
            $message = DB::transaction(function () use ($request, $data, $imagePath) {
            $conversation = ChatConversation::firstOrCreate([
                'customer_id' => $request->user()->id,
            ]);

            $message = new ChatMessage();
            $message->conversation_id = $conversation->id;
            $message->sender_id = $request->user()->id;
            $message->body = $data['body'] ?? '';
            $message->image_path = $imagePath;
            $message->save();

            $conversation->last_message_at = now();
            $conversation->save();

            return $message;
            });
        } catch (\Throwable $exception) {
            if ($imagePath) {
                Storage::disk('local')->delete($imagePath);
            }

            throw $exception;
        }

        $this->broadcastChatMessage($message);

        return response()->json(['message' => $message], 201);
    }

    public function customerRead(Request $request)
    {
        if (!$this->isCustomer($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $conversation = ChatConversation::where(
            'customer_id', $request->user()->id
        )->first();

        if ($conversation) {
            $conversation->messages()
                ->where('sender_id', '!=', $request->user()->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        return response()->json(['success' => true]);
    }

    public function adminConversations(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(
            ChatConversation::with('customer:id,name,username')
                ->withCount([
                    'messages as unread_count' => function ($query) use ($request) {
                        $query->whereHas('sender', function ($sender) {
                            $sender->where('role', 'user');
                        })->whereNull('read_at');
                    },
                ])
                ->orderByDesc('last_message_at')
                ->paginate(30)
        );
    }

    public function adminMessages(Request $request, ChatConversation $conversation)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'conversation_id' => $conversation->id,
            'messages' => $conversation->messages()
                ->orderByDesc('id')
                ->limit(100)
                ->get()
                ->reverse()
                ->values(),
        ]);
    }

    public function adminSend(Request $request, ChatConversation $conversation)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'body' => ['nullable', 'required_without:image', 'string', 'max:5000'],
            'image' => [
                'nullable',
                'required_without:body',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:10240',
                'dimensions:max_width=8000,max_height=8000',
            ],
        ]);

        $imagePath = $this->storeChatImage($request);

        try {
            $message = DB::transaction(function () use ($request, $conversation, $data, $imagePath) {
            $message = new ChatMessage();
            $message->conversation_id = $conversation->id;
            $message->sender_id = $request->user()->id;
            $message->body = $data['body'] ?? '';
            $message->image_path = $imagePath;
            $message->save();

            $conversation->last_message_at = now();
            $conversation->save();

            return $message;
            });
        } catch (\Throwable $exception) {
            if ($imagePath) {
                Storage::disk('local')->delete($imagePath);
            }

            throw $exception;
        }

        $this->broadcastChatMessage($message);

        return response()->json(['message' => $message], 201);
    }

    public function adminRead(Request $request, ChatConversation $conversation)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $conversation->messages()
            ->whereHas('sender', function ($sender) {
                $sender->where('role', 'user');
            })
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    // NOSCAM_CHAT_REALTIME_FALLBACK_V1
    private function broadcastChatMessage(ChatMessage $message): void
    {
        try {
            ChatMessageSent::dispatch($message);
        } catch (\Throwable $exception) {
            \Illuminate\Support\Facades\Log::warning(
                'Chat realtime delivery failed',
                [
                    'message_id' => $message->id,
                    'exception_type' => get_class($exception),
                ]
            );
        }
    }

    // NOSCAM_CHAT_IMAGES_V1
    private function storeChatImage(Request $request): ?string
    {
        if (!$request->hasFile('image')) {
            return null;
        }

        $path = $request->file('image')->store(
            'chat-images',
            'local'
        );

        if (!$path) {
            throw ValidationException::withMessages([
                'image' => 'Khong the luu hinh anh.',
            ]);
        }

        return $path;
    }

    public function customerImage(Request $request, ChatMessage $message)
    {
        abort_unless($this->isCustomer($request), 403);

        abort_unless(
            $message->conversation()
                ->where('customer_id', $request->user()->id)
                ->exists(),
            404
        );

        return $this->serveChatImage($message);
    }

    public function adminImage(Request $request, ChatMessage $message)
    {
        abort_unless($this->isAdmin($request), 403);

        return $this->serveChatImage($message);
    }

    private function serveChatImage(ChatMessage $message)
    {
        $path = $message->image_path;

        abort_unless(
            $path && str_starts_with($path, 'chat-images/'),
            404
        );

        $disk = Storage::disk('local');

        abort_unless($disk->exists($path), 404);

        $mime = $disk->mimeType($path);

        abort_unless(
            in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true),
            404
        );

        return $disk->response($path, null, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

}
