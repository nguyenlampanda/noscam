import { useCallback, useEffect, useState } from 'react'
import AdminNav from '../../components/admin/AdminNav'
import adminCommunityService from '../../services/adminCommunityService'

const filters = [
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
]

function AdminCommunityPage() {
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

    if (!window.confirm(`Xác nhận ${action} nội dung #${item.id}?`)) {
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
                  <span>{item.is_anonymous ? 'Ẩn danh' : 'Công khai'}</span>
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
    </div>
  )
}

export default AdminCommunityPage
