import { NoScamBrand } from '../../components/ui/NoScamUI'
import NoScamSelect from '../../components/ui/NoScamSelect'
import './community-motion.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import communityService from '../../services/communityService'
import { getCustomerToken } from '../../services/customerService'

const categories = [
  { value: 'discussion', label: 'Thảo luận' },
  { value: 'question', label: 'Hỏi đáp' },
  { value: 'experience', label: 'Chia sẻ kinh nghiệm' },
  { value: 'warning', label: 'Cảnh báo cộng đồng' },
  { value: 'job_offer', label: 'Tuyển dụng / Đăng job' },
  { value: 'job_seeking', label: 'Tìm việc MMO' },
  { value: 'service_offer', label: 'Cung cấp dịch vụ' },
  { value: 'partnership', label: 'Tìm đối tác' },
]

const emptyForm = {
  title: '',
  content: '',
  category: 'discussion',
  is_anonymous: false,
}

function CommunityPage() {
  const [posts, setPosts] = useState([])
  const [mmoSearch, setMmoSearch] = useState('')
  const [mmoFilter, setMmoFilter] = useState('all')
  // NOSCAM_MMO_API_V2
  const [mmoWorkMode, setMmoWorkMode] = useState('all')
  const [mmoCity, setMmoCity] = useState('')
  const [mmoPage, setMmoPage] = useState(1)
  const [mmoMeta, setMmoMeta] = useState({
    current_page: 1, last_page: 1, total: 0,
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [likedPosts, setLikedPosts] = useState({})
  const [busyLikes, setBusyLikes] = useState({})
  const [commentSuccessOpen, setCommentSuccessOpen] = useState(false)

  const [form, setForm] = useState(emptyForm)
  // NOSCAM_MMO_JOB_FORM_V1
  const initialJob = {
    work_mode: 'remote',
    city: '',
    address: '',
    salary: '',
    salary_unit: 'month',
    deadline: '',
    contact: '',
  }
  const [job, setJob] = useState(initialJob)
  const mmoTypes = ['job_offer', 'job_seeking', 'service_offer', 'partnership']
  const isMmo = mmoTypes.includes(form.category)

  const [composerOpen, setComposerOpen] = useState(false)
  const [postSuccessOpen, setPostSuccessOpen] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [confirmPost, setConfirmPost] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [imageError, setImageError] = useState('')
  const [viewer, setViewer] = useState(null)
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

  const filteredPosts = posts

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(mmoSearch)
    }, 450)
    return () => clearTimeout(timer)
  }, [mmoSearch])

  useEffect(() => {
    setMmoPage(1)
  }, [debouncedSearch, mmoFilter, mmoWorkMode, mmoCity])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await communityService.posts(mmoPage, {
        q: debouncedSearch,
        category: mmoFilter,
        work_mode: mmoWorkMode,
        city: mmoCity,
      })
      setPosts(response.data || [])
      setMmoMeta(response.meta || {
        current_page: mmoPage, last_page: 1,
        total: (response.data || []).length,
      })
      setLikedPosts(Object.fromEntries(
        (response.data || []).map(post => [post.id, Boolean(post.liked_by_me)])
      ))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [mmoPage, debouncedSearch, mmoFilter, mmoWorkMode, mmoCity])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const previews = useMemo(() => selectedImages.map(file => ({
    file, url: URL.createObjectURL(file),
  })), [selectedImages])

  useEffect(() => () => previews.forEach(item => URL.revokeObjectURL(item.url)), [previews])

  function resetComposer() {
    setForm(emptyForm)
    setJob(initialJob)
    setSelectedImages([])
    setImageError('')
    setConfirmPost(false)
    setConfirmDiscard(false)
    setComposerOpen(false)
  }

  function requestClose() {
    if (submitting) return
    if (form.title.trim() || form.content.trim() ||
        selectedImages.length ||
        Object.entries(job).some(([key, value]) =>
          key !== 'work_mode' && key !== 'salary_unit' && Boolean(value)
        )) {
      setConfirmDiscard(true)
    } else {
      resetComposer()
    }
  }

  function addImages(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    const allowed = files.filter(file =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) &&
      file.size <= 5 * 1024 * 1024
    )
    if (allowed.length !== files.length) {
      setImageError('Chỉ nhận ảnh JPG, PNG, WebP tối đa 5 MB/ảnh.')
    } else if (selectedImages.length + allowed.length > 10) {
      setImageError('Mỗi bài chỉ được tối đa 10 ảnh.')
    } else {
      setImageError('')
    }
    setSelectedImages(prev => [...prev, ...allowed].slice(0, 10))
  }

  async function publishPost() {
    if (submitting) return
    setConfirmPost(false)
    setSubmitting(true)
    setNotice('')
    try {
      const workLabels = {
        remote: 'Online / Remote',
        onsite: 'Trực tiếp',
        hybrid: 'Hybrid',
      }
      const salaryLabels = {
        hour: 'giờ',
        day: 'ngày',
        month: 'tháng',
        project: 'dự án / sản phẩm',
        negotiable: 'thỏa thuận',
      }
      const details = isMmo ? [
        'THÔNG TIN MMO',
        'Hình thức: ' + workLabels[job.work_mode],
        job.city.trim() ? 'Tỉnh/thành phố: ' + job.city.trim() : '',
        job.address.trim() ? 'Địa điểm: ' + job.address.trim() : '',
        job.salary.trim() ? 'Thu nhập / Giá: ' + job.salary.trim() +
          ' / ' + salaryLabels[job.salary_unit] : '',
        job.deadline ? 'Hạn nhận hồ sơ: ' + job.deadline : '',
        job.contact.trim() ? 'Liên hệ / Ứng tuyển: ' + job.contact.trim() : '',
      ].filter(Boolean).join('\\n') : ''
      const finalContent = details
        ? details + '\\n\\nMÔ TẢ CHI TIẾT\\n' + form.content.trim()
        : form.content
      const response = await communityService.createPost({
        ...form,
        content: isMmo ? form.content.trim() : finalContent,
        ...(isMmo ? {
          work_mode: job.work_mode,
          city: job.city,
          address: job.address,
          salary: job.salary,
          salary_unit: job.salary_unit,
          deadline: job.deadline,
          contact: job.contact,
        } : {}),
        images: selectedImages,
      })
      resetComposer()
      setNotice(response.message || 'Bài viết đã được gửi kiểm duyệt.')
    
      setPostSuccessOpen(true)
      } catch (err) {
      setImageError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function submitPost(event) {
    event.preventDefault()
    if (!form.title.trim() && !form.content.trim() && !selectedImages.length) {
      setImageError('Hãy viết nội dung hoặc chọn ít nhất một ảnh.')
      return
    }
    if (isMmo) {
      if (!form.title.trim()) {
        setImageError('Bài MMO cần có tiêu đề.')
        return
      }
      if (!form.content.trim()) {
        setImageError('Vui lòng nhập mô tả chi tiết.')
        return
      }
      if (job.work_mode !== 'remote' && !job.city.trim()) {
        setImageError('Vui lòng nhập tỉnh/thành phố làm việc.')
        return
      }
      if (job.work_mode !== 'remote' && !job.address.trim()) {
        setImageError('Vui lòng nhập địa chỉ hoặc khu vực làm việc.')
        return
      }
      if (!job.contact.trim()) {
        setImageError('Vui lòng nhập cách liên hệ hoặc ứng tuyển.')
        return
      }
      const combinedLength = form.content.length +
        job.city.length + job.address.length +
        job.salary.length + job.contact.length + 300
      if (combinedLength > 10000) {
        setImageError('Nội dung quá dài, vui lòng rút gọn.')
        return
      }
    }
    setImageError('')
    setConfirmPost(true)
  }

  function PhotoGrid({ images }) {
    if (!Array.isArray(images) || !images.length) return null
    return (
      <div className={`mt-4 grid gap-1 overflow-hidden rounded-2xl ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {images.slice(0, 4).map((src, index) => (
          <button key={`${index}-${src}`} type="button"
            className="relative overflow-hidden bg-slate-100"
            onClick={() => setViewer({ images, index })}>
            <img src={src} alt={`Ảnh bài viết ${index + 1}`} loading="lazy"
              className="h-52 w-full object-cover transition hover:scale-[1.02] sm:h-64" />
            {index === 3 && images.length > 4 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-3xl font-bold text-white">
                +{images.length - 4}
              </span>
            )}
          </button>
        ))}
      </div>
    )
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

      if (response.data) {
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), response.data],
        }))
        setPosts(prev => prev.map(post =>
          post.id === postId
            ? { ...post, comments_count: (post.comments_count || 0) + 1 }
            : post
        ))
      }

      setCommentText(prev => ({ ...prev, [postId]: '' }))
      setReplyTo(prev => ({ ...prev, [postId]: null }))
      setNotice('')
      setCommentSuccessOpen(false)
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

    if (busyLikes[postId]) return

    setBusyLikes(prev => ({ ...prev, [postId]: true }))

    try {
      const alreadyLiked = Boolean(likedPosts[postId])
      const response = alreadyLiked
        ? await communityService.unlike(postId)
        : await communityService.like(postId)

      setLikedPosts(prev => ({
        ...prev,
        [postId]: Boolean(response.liked),
      }))

      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, likes_count: response.likes_count }
          : post
      ))
    } catch (err) {
      setNotice(err.message || 'Không thể cập nhật lượt thích.')
    } finally {
      setBusyLikes(prev => ({ ...prev, [postId]: false }))
    }
  }


  function renderCommentForm(post, parentId = null) {
    const postId = post.id
    const isReply = parentId !== null

    return (
      <form
        onSubmit={event => submitComment(event, postId)}
        className={`space-y-2 ${isReply ? 'mt-3' : 'mt-4'}`}
      >
        {isReply && (
          <div className="flex items-center justify-between gap-2 text-xs text-blue-600">
            <span>Đang trả lời bình luận</span>
            <button
              type="button"
              onClick={() => {
                setReplyTo(prev => ({ ...prev, [postId]: null }))
                setCommentText(prev => ({ ...prev, [postId]: '' }))
              }}
              className="font-semibold hover:underline"
            >
              Hủy
            </button>
          </div>
        )}

        <textarea
          required
          minLength={2}
          maxLength={3000}
          rows={isReply ? 2 : 3}
          autoFocus={isReply}
          value={commentText[postId] || ''}
          onChange={event => setCommentText(prev => ({
            ...prev,
            [postId]: event.target.value,
          }))}
          placeholder={isReply ? 'Viết câu trả lời...' : 'Viết bình luận...'}
          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(anonymousComments[postId])}
              onChange={event => setAnonymousComments(prev => ({
                ...prev,
                [postId]: event.target.checked,
              }))}
            />
            Bình luận ẩn danh
          </label>

          <button
            type="submit"
            disabled={Boolean(busyComments[postId])}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {busyComments[postId]
              ? 'Đang gửi...'
              : isReply ? 'Gửi trả lời' : 'Gửi bình luận'}
          </button>
        </div>
      </form>
    )
  }

  function renderComment(post, comment, allComments, depth = 0, ancestors = []) {
    if (ancestors.includes(comment.id)) return null

    const children = allComments.filter(item =>
      Number(item.parent_id) === Number(comment.id) &&
      Number(item.id) !== Number(comment.id)
    )

    const isReplying = Number(replyTo[post.id]) === Number(comment.id)
    const nextAncestors = [...ancestors, comment.id]

    return (
      <div key={comment.id} className={depth > 0 ? 'mt-3' : 'mb-4'}>
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {(comment.author || 'N').charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="inline-block max-w-full rounded-2xl bg-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                {comment.author}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
                {comment.content}
              </p>
            </div>

            {loggedIn && (
              <div className="mt-1 pl-2">
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(prev => ({
                      ...prev,
                      [post.id]: isReplying ? null : comment.id,
                    }))
                    setCommentText(prev => ({
                      ...prev,
                      [post.id]: '',
                    }))
                  }}
                  className="text-xs font-semibold text-slate-500 transition hover:text-blue-600"
                >
                  Trả lời
                </button>
              </div>
            )}

            {isReplying && loggedIn && renderCommentForm(post, comment.id)}

            {children.length > 0 && (
              <div className="mt-3 border-l-2 border-slate-100 pl-3 sm:pl-5">
                {children.map(child =>
                  renderComment(
                    post,
                    child,
                    allComments,
                    depth + 1,
                    nextAncestors
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="noscam-community min-h-screen bg-slate-50 px-4 py-10">
      <div className="noscam-community-layout mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          NoScam Community
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Cộng đồng MMO NoScam
        </h1>

        <p className="mt-3 text-slate-600">
          Tìm việc, tuyển cộng tác viên, cung cấp dịch vụ và kết nối đối tác an toàn.
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

        <div className="noscam-community-grid mt-8 grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-6">
            <section className="noscam-community-composer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

            <section className="noscam-community-feed space-y-4">
              <h2 className="text-xl font-bold">Bảng tin việc làm & cộng đồng MMO</h2>

              {loading && <p>Đang tải bài viết...</p>}
              {error && <p role="alert" className="text-red-600">{error}</p>}

              {!loading && !error && posts.length === 0 && (
                <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
                  Chưa có bài viết nào được duyệt.
                </div>
              )}

              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-lg font-bold text-slate-900">
                  Khám phá việc làm và dịch vụ MMO
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="search"
                    value={mmoSearch}
                    onChange={event => setMmoSearch(event.target.value)}
                    placeholder="Tìm job, kỹ năng, dịch vụ..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-blue-600"
                  style={{
                      outline: 'none',
                      boxShadow: 'none',
                      WebkitAppearance: 'none',
                    }}
                  />
                  <select
                    value={mmoFilter}
                    onChange={event => setMmoFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="all">Tất cả bài viết</option>
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Hiển thị {filteredPosts.length} / {posts.length} bài đã tải
                </p>
              </section>


              <div className="mb-5 flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'job_offer', label: 'Tuyển dụng' },
                  { value: 'job_seeking', label: 'Tìm việc' },
                  { value: 'service_offer', label: 'Dịch vụ MMO' },
                  { value: 'partnership', label: 'Hợp tác' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMmoFilter(option.value)}
                    aria-pressed={mmoFilter === option.value}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      mmoFilter === option.value
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>


              <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Hình thức làm việc
                  </label>
                  <select
                    value={mmoWorkMode}
                    onChange={e => setMmoWorkMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-0"
                  >
                    <option value="all">Tất cả hình thức</option>
                    <option value="remote">Online / Remote</option>
                    <option value="onsite">Trực tiếp</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tỉnh / thành phố
                  </label>
                  <input
                    value={mmoCity}
                    onChange={e => setMmoCity(e.target.value)}
                    placeholder="Ví dụ: Hồ Chí Minh"
                    maxLength={100}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-0"
                    style={{ outline: 'none', boxShadow: 'none' }}
                  />
                </div>
                <p className="text-xs text-slate-500 sm:col-span-2">
                  Tìm kiếm toàn bộ bài đã được duyệt. Các bài cũ chưa có thông tin
                  địa điểm riêng có thể không xuất hiện khi lọc theo địa điểm.
                </p>
              </div>

              {filteredPosts.map(post => (
                <article key={post.id} className="noscam-community-post rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-sm text-slate-500">
                    <span className="font-semibold text-blue-600">{post.author}</span>
                    {' · '}
                    {categories.find(category => category.value === post.category)?.label || 'Thảo luận'}
                  </div>

                  {post.title && <h3 className="mt-3 text-xl font-bold">{post.title}</h3>}
                  {['job_offer', 'job_seeking', 'service_offer', 'partnership'].includes(post.category) &&
                  (post.work_mode || post.city || post.salary || post.deadline) && (
                    <div className="my-3 flex flex-wrap gap-2">
                      {post.work_mode && (
                        <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                          {({ remote: 'Online / Remote', onsite: 'Trực tiếp', hybrid: 'Hybrid' })[post.work_mode] || post.work_mode}
                        </span>
                      )}
                      {post.city && (
                        <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                          Địa điểm: {post.city}
                        </span>
                      )}
                      {post.salary && (
                        <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                          {post.salary}
                          {post.salary_unit ? ' / ' + ({
                            hour: 'giờ', day: 'ngày', month: 'tháng',
                            project: 'dự án', negotiable: 'thỏa thuận',
                          }[post.salary_unit] || post.salary_unit) : ''}
                        </span>
                      )}
                      {post.deadline && (
                        <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          Hạn tuyển: {post.deadline}
                        </span>
                      )}
                    </div>
                  )}
                {post.content && (
                    <p className="mt-3 whitespace-pre-wrap break-words text-slate-700">{post.content}</p>
                  )}
                  <PhotoGrid images={post.images} />

                  <div className="mt-5 flex gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => likePost(post.id)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          likedPosts[post.id]
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-blue-50'
                        }`}
                    >
                      {likedPosts[post.id] ? 'Đã thích' : 'Thích'} · {post.likes_count || 0}
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
                    <div className="mt-5 pt-4">
                      {(() => {
                        const allComments = comments[post.id] || []
                        const ids = new Set(allComments.map(item => Number(item.id)))

                        const roots = allComments.filter(comment =>
                          !comment.parent_id ||
                          !ids.has(Number(comment.parent_id)) ||
                          Number(comment.parent_id) === Number(comment.id)
                        )

                        return (
                          <>
                            {roots.map(comment =>
                              renderComment(post, comment, allComments)
                            )}

                            {loggedIn ? (
                              !replyTo[post.id] && renderCommentForm(post)
                            ) : (
                              <Link
                                to="/login"
                                className="text-sm font-semibold text-blue-600"
                              >
                                Đăng nhập để bình luận
                              </Link>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}
                </article>
              ))}
            </section>
          </div>

          <aside className="noscam-community-sidebar space-y-4">
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
            className="noscam-community-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
            role="presentation"
            onMouseDown={event => {
              if (event.target === event.currentTarget && !submitting) requestClose()
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="community-composer-title"
              className="noscam-community-modal max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
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
                  onClick={requestClose}
                  aria-label="Đóng cửa sổ tạo bài viết"
                  className="rounded-full bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={submitPost} className="space-y-4">
                <input
                  maxLength={180}
                  value={form.title}
                  onChange={event => setForm(prev => ({
                    ...prev,
                    title: event.target.value,
                  }))}
                  placeholder="Tiêu đề (không bắt buộc)"
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

                {isMmo && (
                  <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
                    <h3 className="font-bold text-slate-900">
                      Thông tin công việc / dịch vụ
                    </h3>
                    <p className="text-xs text-slate-500">
                      Không đăng OTP, mật khẩu hoặc thông tin riêng tư.
                    </p>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Hình thức làm việc
                      </label>
                      <select
                        value={job.work_mode}
                        onChange={e => setJob(prev => ({
                          ...prev, work_mode: e.target.value,
                        }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      >
                        <option value="remote">Online / Remote</option>
                        <option value="onsite">Trực tiếp</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>

                    {job.work_mode !== 'remote' && (
                      <>
                        <div>
                          <label className="mb-2 block text-sm font-semibold">
                            Tỉnh / thành phố *
                          </label>
                          <input
                            maxLength={100}
                            value={job.city}
                            onChange={e => setJob(prev => ({
                              ...prev, city: e.target.value,
                            }))}
                            placeholder="Ví dụ: TP. Hồ Chí Minh"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold">
                            Địa chỉ / khu vực làm việc *
                          </label>
                          <input
                            maxLength={250}
                            value={job.address}
                            onChange={e => setJob(prev => ({
                              ...prev, address: e.target.value,
                            }))}
                            placeholder="Ví dụ: Phường Tân Sơn Nhất, TP.HCM"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Không cần công khai số nhà riêng.
                          </p>
                        </div>
                      </>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Thu nhập / Giá dịch vụ
                        </label>
                        <input
                          maxLength={100}
                          value={job.salary}
                          onChange={e => setJob(prev => ({
                            ...prev, salary: e.target.value,
                          }))}
                          placeholder="Ví dụ: 8.000.000đ"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Đơn vị tính
                        </label>
                        <select
                          value={job.salary_unit}
                          onChange={e => setJob(prev => ({
                            ...prev, salary_unit: e.target.value,
                          }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                          <option value="hour">Theo giờ</option>
                          <option value="day">Theo ngày</option>
                          <option value="month">Theo tháng</option>
                          <option value="project">Theo dự án / sản phẩm</option>
                          <option value="negotiable">Thỏa thuận</option>
                        </select>
                      </div>
                    </div>

                    {form.category === 'job_offer' && (
                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Hạn nhận hồ sơ
                        </label>
                        <input
                          type="date"
                          value={job.deadline}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={e => setJob(prev => ({
                            ...prev, deadline: e.target.value,
                          }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Cách liên hệ / ứng tuyển *
                      </label>
                      <input
                        maxLength={250}
                        value={job.contact}
                        onChange={e => setJob(prev => ({
                          ...prev, contact: e.target.value,
                        }))}
                        placeholder="Email công việc hoặc đường dẫn ứng tuyển"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Thông tin này sẽ hiển thị công khai sau khi duyệt.
                      </p>
                    </div>
                  </div>
                )}

                <textarea
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

                <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <label className="inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm">
                    + Thêm ảnh ({selectedImages.length}/10)
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp"
                      className="sr-only" onChange={addImages} />
                  </label>
                  {imageError && <p role="alert" className="text-sm text-red-600">{imageError}</p>}
                  {!!previews.length && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {previews.map((item, index) => (
                        <div key={item.url} className="relative overflow-hidden rounded-xl bg-white">
                          <img src={item.url} alt={`Ảnh đã chọn ${index + 1}`}
                            className="h-28 w-full object-cover" />
                          <button type="button" aria-label={`Xóa ảnh ${index + 1}`}
                            onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                            className="absolute right-1 top-1 rounded-full bg-slate-900/80 px-2 py-1 text-xs text-white">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Bài viết và hình ảnh sẽ được kiểm duyệt trước khi xuất hiện trên bảng tin.
                </p>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={requestClose}
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

        {confirmPost && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4">
            <section role="alertdialog" aria-modal="true" aria-label="Xác nhận đăng bài"
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4"><NoScamBrand /></div>
<h2 className="text-xl font-bold">Xác nhận đăng bài</h2>
              <p className="mt-3 text-sm text-slate-600">Gửi bài viết và ảnh để quản trị viên kiểm duyệt?</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmPost(false)}
                  className="rounded-xl border px-5 py-2.5">Hủy</button>
                <button type="button" disabled={submitting} onClick={publishPost}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-700">Đồng ý</button>
              </div>
            </section>
          </div>
        )}

        {confirmDiscard && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4">
            <section role="alertdialog" aria-modal="true" aria-label="Hủy bài viết"
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4"><NoScamBrand /></div>
<h2 className="text-xl font-bold">Hủy bài đang soạn?</h2>
              <p className="mt-3 text-sm text-slate-600">Nội dung và hình ảnh đã chọn sẽ bị bỏ.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmDiscard(false)}
                  className="rounded-xl border px-5 py-2.5">Tiếp tục soạn</button>
                <button type="button" onClick={resetComposer}
                  className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white">Đồng ý hủy</button>
              </div>
            </section>
          </div>
        )}

        {viewer && (
          <div role="dialog" aria-modal="true" aria-label="Xem ảnh bài viết"
            className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/95 p-4"
            onClick={() => setViewer(null)}>
            <button type="button" aria-label="Đóng ảnh" onClick={() => setViewer(null)}
              className="absolute right-5 top-5 text-3xl text-white">✕</button>
            <button type="button" aria-label="Ảnh trước" onClick={event => {
              event.stopPropagation()
              setViewer(prev => ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }))
            }} className="absolute left-3 rounded-full bg-white/20 px-3 py-2 text-white">❮</button>
            <img src={viewer.images[viewer.index]} alt={`Ảnh ${viewer.index + 1}`}
              onClick={event => event.stopPropagation()}
              className="max-h-[85vh] max-w-[80vw] object-contain" />
            <button type="button" aria-label="Ảnh tiếp" onClick={event => {
              event.stopPropagation()
              setViewer(prev => ({ ...prev, index: (prev.index + 1) % prev.images.length }))
            }} className="absolute right-3 rounded-full bg-white/20 px-3 py-2 text-white">❯</button>
            <span className="absolute bottom-4 text-sm text-white">{viewer.index + 1} / {viewer.images.length}</span>
          </div>
        )}


      {commentSuccessOpen && (
        <div className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-slate-950/65 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-comment-success-title"
            className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600">
              ✓
            </div>
            <h2
              id="community-comment-success-title"
              className="text-xl font-bold text-slate-900"
            >
              Gửi bình luận thành công!
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bình luận của bạn đã được đăng và đang hiển thị
              trong bài viết.
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => setCommentSuccessOpen(false)}
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Đóng
            </button>
          </section>
        </div>
      )}

      {postSuccessOpen && (
        <div
          className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-slate-950/65 p-4"
          role="presentation"
        >
          <section
            id="community-success-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-success-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl"
          >
            <div className="border-b border-slate-100 bg-blue-50/50 px-6 py-6">
              <NoScamBrand />
            </div>

            <div className="px-6 py-7 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-600">
                ✓
              </div>

              <h2
                id="community-success-title"
                className="text-xl font-bold text-slate-900"
              >
                Gửi bài viết thành công!
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Bài viết và hình ảnh của bạn đã được gửi đến quản trị viên
                để kiểm duyệt. Bài viết sẽ xuất hiện trên cộng đồng
                sau khi được phê duyệt.
              </p>

              <button
                type="button"
                autoFocus
                onClick={() => setPostSuccessOpen(false)}
                className="mt-7 w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="text-sm text-slate-600">
                  Trang {mmoMeta.current_page} / {mmoMeta.last_page}
                  {' '}· Tổng {mmoMeta.total} bài
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loading || mmoPage <= 1}
                    onClick={() => setMmoPage(page => Math.max(1, page - 1))}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    disabled={loading || mmoPage >= mmoMeta.last_page}
                    onClick={() => setMmoPage(page => page + 1)}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Trang sau
                  </button>
                </div>
              </div>

    </main>
  )
}

export default CommunityPage
