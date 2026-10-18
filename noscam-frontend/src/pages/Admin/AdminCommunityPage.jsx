import { useNoScamUI } from '../../components/ui/NoScamUI'
import { useCallback, useEffect, useState } from 'react'
import AdminNav from '../../components/admin/AdminNav'
import adminCommunityService from '../../services/adminCommunityService'

const filters = [
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
]

function AdminCommunityPage() {
  const { confirm } = useNoScamUI()
  const [type, setType] = useState('posts')
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [viewerImages, setViewerImages] = useState(null)
  const [viewerIndex, setViewerIndex] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await adminCommunityService.list(type, status, page)
      const rows = response.data

      setItems(Array.isArray(rows) ? rows : rows?.data || [])
      setLastPage(response.meta?.last_page || rows?.last_page || 1)
      setTotal(response.meta?.total || rows?.total || 0)
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }, [type, status, page])

  useEffect(() => {
    load()
  }, [load])

  function changeType(value) {
    setType(value)
    setPage(1)
    setNotice('')
  }

  function changeStatus(value) {
    setStatus(value)
    setPage(1)
    setNotice('')
  }

  async function moderate(item, nextStatus) {
    const action = nextStatus === 'approved' ? 'duyệt' : 'từ chối'

    if (!await confirm(`Xác nhận ${action} nội dung #${item.id}?`)) {
      return
    }

    setBusyId(item.id)
    setError('')
    setNotice('')

    try {
      await adminCommunityService.update(type, item.id, nextStatus)
      setNotice(`Đã ${action} nội dung #${item.id}.`)
      await load()
    } catch (err) {
      setError(err.message || 'Không thể cập nhật.')
    } finally {
      setBusyId(null)
    }
  }

  function openImageViewer(images, index) {
    setViewerImages(images)
    setViewerIndex(index)
  }

  function previousImage() {
    setViewerIndex(index =>
      (index - 1 + viewerImages.length) % viewerImages.length
    )
  }

  function nextImage() {
    setViewerIndex(index =>
      (index + 1) % viewerImages.length
    )
  }

  useEffect(() => {
    if (!viewerImages) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setViewerImages(null)
      } else if (event.key === 'ArrowLeft') {
        setViewerIndex(index =>
          (index - 1 + viewerImages.length) % viewerImages.length
        )
      } else if (event.key === 'ArrowRight') {
        setViewerIndex(index =>
          (index + 1) % viewerImages.length
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [viewerImages])

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
          NoScam Community
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Kiểm duyệt cộng đồng
        </h1>

        <p className="mt-3 text-slate-600">
          Quản lý bài viết và bình luận, độc lập với hệ thống báo cáo scam.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {[
            { value: 'posts', label: 'Bài viết' },
            { value: 'comments', label: 'Bình luận' },
          ].map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeType(option.value)}
              className={`rounded-xl px-5 py-3 text-sm font-semibold ${
                type === option.value
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.map(filter => (
              <button
                key={filter.value}
                type="button"
                onClick={() => changeStatus(filter.value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  status === filter.value
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
          >
            Làm mới
          </button>
        </div>

        {notice && (
          <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">
            {notice}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <p className="my-5 text-sm text-slate-500">
          Tổng cộng: {total} nội dung
        </p>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500">
            Đang tải dữ liệu...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Không có nội dung ở trạng thái này.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                  <span className="font-bold">#{item.id}</span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                    item.is_anonymous
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {item.is_anonymous ? 'Đăng ẩn danh' : 'Đăng công khai'}
                  </span>

                  {type === 'posts' && (
                    <span className="font-medium text-slate-700">
                      Username: {item.author?.username || item.author?.name || 'Không xác định'}
                    </span>
                  )}
                  {item.created_at && (
                    <span>{new Date(item.created_at).toLocaleString('vi-VN')}</span>
                  )}
                </div>

                {type === 'posts' ? (
                  <>
                    <h2 className="mt-3 text-lg font-bold text-slate-950">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Chủ đề: {item.category || 'discussion'}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Bài viết #{item.post_id}
                    {item.parent_id ? ` · Trả lời #${item.parent_id}` : ''}
                  </p>
                )}

                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {item.content}
                </p>

                {type === 'posts' &&
                  Array.isArray(item.images) &&
                  item.images.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-3 text-sm font-semibold text-slate-700">
                        Hình ảnh đính kèm ({item.images.length})
                      </p>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                        {item.images.map((image, index) => (
                          <button
                            key={`${item.id}-${index}`}
                            type="button"
                            onClick={() => openImageViewer(item.images, index)}
                            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                            aria-label={`Xem ảnh ${index + 1}`}
                          >
                            <img
                              src={image}
                              alt={`Ảnh đính kèm ${index + 1}`}
                              loading="lazy"
                              className="h-32 w-full object-cover transition duration-200 group-hover:scale-105"
                            />
                            <span className="absolute bottom-2 right-2 rounded-md bg-slate-950/70 px-2 py-1 text-xs text-white">
                              {index + 1}/{item.images.length}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                  {item.status !== 'approved' && (
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => moderate(item, 'approved')}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Duyệt
                    </button>
                  )}

                  {item.status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => moderate(item, 'rejected')}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                    >
                      Từ chối
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && lastPage > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(value => value - 1)}
              className="rounded-lg border bg-white px-4 py-2 disabled:opacity-40"
            >
              Trang trước
            </button>

            <span className="text-sm text-slate-600">
              {page} / {lastPage}
            </span>

            <button
              type="button"
              disabled={page >= lastPage}
              onClick={() => setPage(value => value + 1)}
              className="rounded-lg border bg-white px-4 py-2 disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        )}
      </main>

      {viewerImages && (
        <div
          id="admin-community-image-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Xem hình ảnh bài viết"
          className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-slate-950/95 p-4"
          onClick={() => setViewerImages(null)}
        >
          <button
            type="button"
            onClick={() => setViewerImages(null)}
            aria-label="Đóng trình xem ảnh"
            className="absolute right-5 top-5 rounded-full bg-white/15 px-4 py-2 text-xl text-white hover:bg-white/25"
          >
            ✕
          </button>

          {viewerImages.length > 1 && (
            <button
              type="button"
              aria-label="Ảnh trước"
              onClick={event => {
                event.stopPropagation()
                previousImage()
              }}
              className="absolute left-3 z-10 rounded-full bg-white/15 px-4 py-3 text-white hover:bg-white/25"
            >
              ❮
            </button>
          )}

          <img
            src={viewerImages[viewerIndex]}
            alt={`Ảnh ${viewerIndex + 1}`}
            onClick={event => event.stopPropagation()}
            className="max-h-[85vh] max-w-[85vw] object-contain"
          />

          {viewerImages.length > 1 && (
            <button
              type="button"
              aria-label="Ảnh tiếp theo"
              onClick={event => {
                event.stopPropagation()
                nextImage()
              }}
              className="absolute right-3 z-10 rounded-full bg-white/15 px-4 py-3 text-white hover:bg-white/25"
            >
              ❯
            </button>
          )}

          <div className="absolute bottom-5 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white">
            {viewerIndex + 1} / {viewerImages.length}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCommunityPage
