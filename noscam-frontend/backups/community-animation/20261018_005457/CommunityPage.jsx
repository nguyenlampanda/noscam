import NoScamSelect from '../../components/ui/NoScamSelect'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import communityService from '../../services/communityService'
import { getCustomerToken } from '../../services/customerService'

const categories = [
  { value: 'discussion', label: 'Thảo luận' },
  { value: 'question', label: 'Hỏi đáp' },
  { value: 'experience', label: 'Chia sẻ kinh nghiệm' },
  { value: 'warning', label: 'Cảnh báo cộng đồng' },
]

const emptyForm = {
  title: '',
  content: '',
  category: 'discussion',
  is_anonymous: false,
}

function CommunityPage() {
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [composerOpen, setComposerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [openComments, setOpenComments] = useState({})
  const [comments, setComments] = useState({})
  const [commentText, setCommentText] = useState({})
  const [anonymousComments, setAnonymousComments] = useState({})
  const [replyTo, setReplyTo] = useState({})
  const [busyComments, setBusyComments] = useState({})

  const loggedIn = Boolean(getCustomerToken())

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await communityService.posts()
      setPosts(response.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  async function submitPost(event) {
    event.preventDefault()
    setSubmitting(true)
    setNotice('')

    try {
      const response = await communityService.createPost(form)
      setForm(emptyForm)
      setComposerOpen(false)
      setNotice(response.message)
    } catch (err) {
      setNotice(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleComments(postId) {
    if (openComments[postId]) {
      setOpenComments(prev => ({ ...prev, [postId]: false }))
      return
    }

    setOpenComments(prev => ({ ...prev, [postId]: true }))

    try {
      const response = await communityService.comments(postId)
      setComments(prev => ({
        ...prev,
        [postId]: response.data || [],
      }))
    } catch (err) {
      setNotice(err.message)
    }
  }

  async function submitComment(event, postId) {
    event.preventDefault()
    setBusyComments(prev => ({ ...prev, [postId]: true }))

    try {
      const response = await communityService.createComment(postId, {
        content: commentText[postId] || '',
        is_anonymous: Boolean(anonymousComments[postId]),
        parent_id: replyTo[postId] || null,
      })

      setCommentText(prev => ({ ...prev, [postId]: '' }))
      setReplyTo(prev => ({ ...prev, [postId]: null }))
      setNotice(response.message)
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusyComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  async function likePost(postId) {
    if (!loggedIn) {
      setNotice('Vui lòng đăng nhập để thích bài viết.')
      return
    }

    try {
      const response = await communityService.like(postId)

      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, likes_count: response.likes_count }
          : post
      ))
    } catch (err) {
      setNotice(err.message)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          NoScam Community
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Cộng đồng NoScam
        </h1>

        <p className="mt-3 text-slate-600">
          Chia sẻ kinh nghiệm, đặt câu hỏi và cùng nhau phòng tránh lừa đảo.
        </p>

        {notice && (
          <div role="status" className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            {notice}
            <button
              type="button"
              className="ml-3 underline"
              onClick={() => setNotice('')}
            >
              Đóng
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  N
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (loggedIn) {
                      setComposerOpen(true)
                    }
                  }}
                  className="flex-1 rounded-full bg-slate-100 px-5 py-3 text-left text-sm text-slate-500 transition hover:bg-slate-200"
                >
                  Bạn muốn chia sẻ điều gì với cộng đồng?
                </button>
              </div>

            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold">Bảng tin cộng đồng</h2>

              {loading && <p>Đang tải bài viết...</p>}
              {error && <p role="alert" className="text-red-600">{error}</p>}

              {!loading && !error && posts.length === 0 && (
                <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
                  Chưa có bài viết nào được duyệt.
                </div>
              )}

              {posts.map(post => (
                <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-sm text-slate-500">
                    <span className="font-semibold text-blue-600">{post.author}</span>
                    {' · '}
                    {categories.find(category => category.value === post.category)?.label || 'Thảo luận'}
                  </div>

                  <h3 className="mt-3 text-xl font-bold">{post.title}</h3>
                  <p className="mt-3 whitespace-pre-wrap break-words text-slate-700">
                    {post.content}
                  </p>

                  <div className="mt-5 flex gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => likePost(post.id)}
                      className="rounded-lg bg-slate-100 px-4 py-2 text-sm"
                    >
                      Thích · {post.likes_count || 0}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      className="rounded-lg bg-slate-100 px-4 py-2 text-sm"
                    >
                      Bình luận · {post.comments_count || 0}
                    </button>
                  </div>

                  {openComments[post.id] && (
                    <div className="mt-5 space-y-4 border-t pt-4">
                      {(comments[post.id] || []).map(comment => (
                        <div key={comment.id} className="rounded-xl bg-slate-50 p-4">
                          <p className="text-sm font-semibold">{comment.author}</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{comment.content}</p>

                          {loggedIn && (
                            <button
                              type="button"
                              className="mt-2 text-xs font-semibold text-blue-600"
                              onClick={() => setReplyTo(prev => ({
                                ...prev,
                                [post.id]: comment.id,
                              }))}
                            >
                              Trả lời
                            </button>
                          )}
                        </div>
                      ))}

                      {loggedIn ? (
                        <form
                          onSubmit={event => submitComment(event, post.id)}
                          className="space-y-3"
                        >
                          {replyTo[post.id] && (
                            <button
                              type="button"
                              onClick={() => setReplyTo(prev => ({
                                ...prev,
                                [post.id]: null,
                              }))}
                              className="text-xs text-blue-600"
                            >
                              Đang trả lời #{replyTo[post.id]} · Hủy
                            </button>
                          )}

                          <textarea
                            required
                            minLength={2}
                            maxLength={3000}
                            rows={3}
                            value={commentText[post.id] || ''}
                            onChange={event => setCommentText(prev => ({
                              ...prev,
                              [post.id]: event.target.value,
                            }))}
                            placeholder="Viết bình luận..."
                            className="w-full rounded-xl border p-3"
                          />

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(anonymousComments[post.id])}
                              onChange={event => setAnonymousComments(prev => ({
                                ...prev,
                                [post.id]: event.target.checked,
                              }))}
                            />
                            Bình luận ẩn danh
                          </label>

                          <button
                            type="submit"
                            disabled={Boolean(busyComments[post.id])}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Gửi bình luận
                          </button>
                        </form>
                      ) : (
                        <Link to="/login" className="text-sm text-blue-600">
                          Đăng nhập để bình luận
                        </Link>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-5">
              <h2 className="font-bold">Về cộng đồng</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Nơi trao đổi, đặt câu hỏi và chia sẻ kinh nghiệm phòng tránh lừa đảo.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <h2 className="font-bold">An toàn thông tin</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Không chia sẻ OTP, mật khẩu hoặc dữ liệu cá nhân nhạy cảm.
              </p>
              <Link to="/report" className="mt-4 inline-block text-sm font-semibold text-blue-600">
                Báo cáo scam chính thức →
              </Link>
            </div>
          </aside>
        </div>
      </div>
        {composerOpen && loggedIn && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
            role="presentation"
            onMouseDown={event => {
              if (event.target === event.currentTarget && !submitting) {
                setComposerOpen(false)
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="community-composer-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2
                  id="community-composer-title"
                  className="text-xl font-bold text-slate-950"
                >
                  Tạo bài viết
                </h2>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setComposerOpen(false)}
                  aria-label="Đóng cửa sổ tạo bài viết"
                  className="rounded-full bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={submitPost} className="space-y-4">
                <input
                  required
                  minLength={5}
                  maxLength={180}
                  value={form.title}
                  onChange={event => setForm(prev => ({
                    ...prev,
                    title: event.target.value,
                  }))}
                  placeholder="Tiêu đề bài viết"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />

                <NoScamSelect
                  value={form.category}
                  onChange={event => setForm(prev => ({
                    ...prev,
                    category: event.target.value,
                  }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </NoScamSelect>

                <textarea
                  required
                  minLength={20}
                  maxLength={10000}
                  rows={7}
                  value={form.content}
                  onChange={event => setForm(prev => ({
                    ...prev,
                    content: event.target.value,
                  }))}
                  placeholder="Bạn muốn chia sẻ điều gì?..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />

                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_anonymous}
                    onChange={event => setForm(prev => ({
                      ...prev,
                      is_anonymous: event.target.checked,
                    }))}
                    className="h-4 w-4"
                  />
                  Đăng bài ẩn danh
                </label>

                <p className="text-xs text-slate-500">
                  Bài viết sẽ được kiểm duyệt trước khi xuất hiện trên bảng tin.
                </p>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setComposerOpen(false)}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Đang gửi...' : 'Đăng bài'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

    </main>
  )
}

export default CommunityPage
