import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  motion,
  AnimatePresence,
} from 'framer-motion'

import AdminNav from '../../components/admin/AdminNav'
import SocialAdminNav from '../../components/admin/social/SocialAdminNav'
import adminService from '../../services/adminService'

function money(value) {
  return new Intl.NumberFormat(
    'vi-VN',
    {
      maximumFractionDigits: 4,
    },
  ).format(
    Number(value || 0),
  )
}


function vnd(value) {
  return `${new Intl.NumberFormat(
    'vi-VN',
    {
      maximumFractionDigits: 0,
    },
  ).format(Number(value || 0))}đ`
}

function profitAmount(
  sellPrice,
  costPrice,
) {
  return (
    Number(sellPrice || 0) -
    Number(costPrice || 0)
  )
}

function profitPercent(
  sellPrice,
  costPrice,
) {
  const cost =
    Number(costPrice || 0)

  if (cost <= 0) {
    return 0
  }

  return (
    profitAmount(
      sellPrice,
      cost,
    ) /
    cost *
    100
  )
}

function ProviderBadge({
  provider,
}) {
  const names = {
    vietnamfb: 'VietnamFB',
    nganhangsub: 'NganHangSub',
    hacklike17: 'HackLike17',
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
      {names[provider?.driver] ||
        provider?.name ||
        'Provider'}
    </span>
  )
}

function MapModal({ item, onClose, onDone }) {
  const sourceName = item.provider_service_name || ''
  const source = sourceName.toLowerCase()

  const detectedPlatform =
    /instagram|\big\b/i.test(source) ? 'instagram' :
    /tiktok|tik tok/i.test(source) ? 'tiktok' :
    /facebook|\bfb\b/i.test(source) ? 'facebook' :
    'other'

  const detectedCategory =
    /follow|follower/i.test(source) ? 'follow' :
    /comment/i.test(source) ? 'comment' :
    /share/i.test(source) ? 'share' :
    /view|watch/i.test(source) ? 'view' :
    /reaction|react/i.test(source) ? 'reaction' :
    /like/i.test(source) ? 'like' :
    /member/i.test(source) ? 'member' :
    /save|favorite|favourite/i.test(source) ? 'save' :
    'other'

  const [platform, setPlatform] = useState(detectedPlatform)
  const [category, setCategory] = useState(detectedCategory)
  const [name, setName] = useState(sourceName)
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cost1000 = Number(
    item.cost_price_vnd ?? item.cost_price_per_1000 ?? 0
  )
  const cost1 = cost1000 / 1000
  const sell1 = Number(price)
  const profit1 = sell1 - cost1

  const format = (value) =>
    new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 7,
    }).format(Number(value || 0))

  async function submit() {
    setError('')

    if (item.social_service_id || item.service?.id) {
      setError('Dịch vụ API này đã được đưa lên bán.')
      return
    }

    if (!name.trim()) {
      setError('Vui lòng nhập tên dịch vụ.')
      return
    }

    if (platform === 'other' || category === 'other') {
      setError('Vui lòng xác nhận nền tảng và loại dịch vụ.')
      return
    }

    if (
      price.trim() === '' ||
      !Number.isFinite(sell1) ||
      sell1 <= cost1
    ) {
      setError(
        `Giá bán phải cao hơn giá vốn ${format(cost1)}đ/lượt.`
      )
      return
    }

    const min = Number(item.min_quantity || 1)
    const max = Number(item.max_quantity || 1000000)

    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      max < min
    ) {
      setError('Số lượng Min/Max không hợp lệ.')
      return
    }

    setBusy(true)

    try {
      await adminService.mapSocialProviderService(item.id, {
        platform,
        category,
        name: name.trim(),
        description: description.trim() || null,
        sell_price_per_1000: Number((sell1 * 1000).toFixed(4)),
        min_quantity: min,
        max_quantity: max,
        priority: Number(item.priority ?? 100),
        is_active: true,
      })

      await onDone()
      onClose()
    } catch (err) {
      setError(
        err?.data?.message ||
        err?.message ||
        'Không thể đưa dịch vụ lên bán.'
      )
    } finally {
      setBusy(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400'

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Đưa lên bán
            </h2>
            <div className="mt-2">
              <ProviderBadge provider={item.provider} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
          >
            ×
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-bold text-slate-500">
            Tên dịch vụ gốc từ API
          </div>
          <div className="mt-1 break-words font-semibold">
            {sourceName}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ID: {item.provider_service_id}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Nền tảng</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={fieldClass}
            >
              <option value="other">Chưa xác định</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">Loại dịch vụ</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={fieldClass}
            >
              <option value="other">Chưa xác định</option>
              <option value="follow">Follow</option>
              <option value="like">Like</option>
              <option value="comment">Comment</option>
              <option value="view">View</option>
              <option value="share">Share</option>
              <option value="reaction">Reaction</option>
              <option value="member">Member</option>
              <option value="save">Save</option>
            </select>
          </label>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Tự nhận diện từ tên API. Có thể chỉnh lại nếu cần.
        </p>

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-bold">
            Tên khách hàng nhìn thấy
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
            className={fieldClass}
          />
        </label>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="text-xs font-bold text-blue-600">
              Giá vốn / 1 lượt
            </div>
            <div className="mt-1 text-xl font-black text-blue-800">
              {format(cost1)}đ
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-bold text-slate-500">
              Min / Max từ API
            </div>
            <div className="mt-1 font-bold">
              {format(item.min_quantity || 1)}
              {' – '}
              {format(item.max_quantity || 1000000)}
            </div>
          </div>
        </div>

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-bold">
            Giá bán / 1 lượt (VND)
          </span>
          <input
            type="number"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ví dụ: 0.5 hoặc 2"
            className={fieldClass}
          />
        </label>

        {price !== '' && Number.isFinite(sell1) && (
          <div className={`mt-3 rounded-xl p-3 text-sm font-bold ${
            profit1 > 0
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}>
            Lãi dự kiến: {format(profit1)}đ/lượt
            {' · '}
            {cost1 > 0
              ? `${format((profit1 / cost1) * 100)}%`
              : 'Chưa có tỷ lệ'}
          </div>
        )}

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-bold">
            Ghi chú hiển thị cho khách
          </span>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            placeholder="Tỷ lệ tụt, tốc độ, bảo hành, lưu ý..."
            className={fieldClass}
          />
        </label>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-black text-white disabled:opacity-50"
        >
          {busy ? 'Đang lưu...' : 'Đưa lên bán'}
        </button>
      </motion.div>
    </motion.div>
  )
}


function PriceModal({ item, onClose, onDone }) {
  const service = item.service || {}
  const cost1000 = Number(
    item.cost_price_vnd ?? item.cost_price_per_1000 ?? 0
  )
  const cost1 = cost1000 / 1000

  const [name, setName] = useState(service.name || '')
  const [platform, setPlatform] = useState(service.platform || 'other')
  const [category, setCategory] = useState(service.category || 'other')
  const [description, setDescription] = useState(service.description || '')
  const [price, setPrice] = useState(
    service.sell_price_per_1000 == null
      ? ''
      : String(Number(service.sell_price_per_1000) / 1000)
  )
  const [min, setMin] = useState(
    String(service.min_quantity ?? item.min_quantity ?? 1)
  )
  const [max, setMax] = useState(
    String(service.max_quantity ?? item.max_quantity ?? 1000000)
  )
  const [active, setActive] = useState(Boolean(service.is_active))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const field =
    'w-full rounded-xl border border-slate-200 px-4 py-3 ' +
    'outline-none focus:border-blue-500 bg-white'

  const price1 = Number(price)
  const providerMin = Number(item.min_quantity ?? 1)
  const providerMax = Number(item.max_quantity ?? 1000000)

  async function save() {
    setError('')

    if (!service.id || !service.code) {
      setError('Thiếu ID hoặc mã dịch vụ. Không thể lưu.')
      return
    }

    if (!name.trim() || !category.trim()) {
      setError('Vui lòng nhập tên và loại dịch vụ.')
      return
    }

    if (
      price.trim() === '' ||
      !Number.isFinite(price1) ||
      price1 <= cost1
    ) {
      setError(
        'Giá bán / 1 phải lớn hơn giá vốn ' +
        cost1.toLocaleString('vi-VN', {
          maximumFractionDigits: 6
        }) + 'đ.'
      )
      return
    }

    const minNumber = Number(min)
    const maxNumber = Number(max)

    if (
      !Number.isInteger(minNumber) ||
      !Number.isInteger(maxNumber) ||
      minNumber < providerMin ||
      maxNumber > providerMax ||
      maxNumber < minNumber
    ) {
      setError(
        'Min/Max phải nằm trong giới hạn Provider: ' +
        providerMin.toLocaleString('vi-VN') +
        ' – ' +
        providerMax.toLocaleString('vi-VN')
      )
      return
    }

    setBusy(true)
    try {
      await adminService.updateSocialService(service.id, {
        code: service.code,
        platform,
        category: category.trim(),
        name: name.trim(),
        description: description.trim() || null,
        min_quantity: minNumber,
        max_quantity: maxNumber,
        sell_price_per_1000: Number((price1 * 1000).toFixed(4)),
        is_active: active,
        sort_order: Number(service.sort_order ?? 0)
      })
      await onDone()
      onClose()
    } catch (err) {
      setError(
        err?.data?.message ||
        err?.message ||
        'Không thể cập nhật dịch vụ.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Chỉnh sửa dịch vụ
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Dịch vụ nguồn: {item.provider_service_name}
            </p>
            <p className="text-xs text-slate-400">
              ID nguồn: {item.provider_service_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border px-3 py-2"
          >
            Đóng
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 space-y-1">
            <span className="text-sm font-bold">Tên hiển thị cho khách</span>
            <input
              className={field}
              value={name}
              maxLength={255}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Nền tảng</span>
            <select
              className={field}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="other">Khác</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Loại dịch vụ</span>
            <select
              className={field}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {![
                'follow', 'like', 'view', 'comment', 'share',
                'reaction', 'member', 'save', 'other'
              ].includes(category) && (
                <option value={category}>{category}</option>
              )}
              <option value="follow">Follow</option>
              <option value="like">Like</option>
              <option value="view">View</option>
              <option value="comment">Comment</option>
              <option value="share">Share</option>
              <option value="reaction">Reaction</option>
              <option value="member">Member</option>
              <option value="save">Save</option>
              <option value="other">Khác</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Giá bán / 1 (VND)</span>
            <input
              type="number"
              min="0"
              step="any"
              className={field}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <span className="block text-xs text-slate-500">
              Giá vốn: {cost1.toLocaleString('vi-VN', {
                maximumFractionDigits: 6
              })}đ / 1
            </span>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Trạng thái</span>
            <select
              className={field}
              value={active ? '1' : '0'}
              onChange={(e) => setActive(e.target.value === '1')}
            >
              <option value="1">Đang bán</option>
              <option value="0">Tạm ngừng bán</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Số lượng tối thiểu</span>
            <input
              type="number"
              step="1"
              className={field}
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-bold">Số lượng tối đa</span>
            <input
              type="number"
              step="1"
              className={field}
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </label>

          <label className="sm:col-span-2 space-y-1">
            <span className="text-sm font-bold">
              Mô tả / Ghi chú hiển thị cho khách
            </span>
            <textarea
              rows={5}
              maxLength={5000}
              className={field}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thông tin tốc độ, bảo hành, tỷ lệ tụt..."
            />
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </motion.div>
    </motion.div>
  )
}

export default function AdminSocialServicesPage() {
  const [items, setItems] =
    useState([])

  const [services, setServices] =
    useState([])

  const [providers, setProviders] =
    useState([])

  const [meta, setMeta] =
    useState({})

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [selected, setSelected] =
    useState(null)

  const [priceSelected, setPriceSelected] =
    useState(null)

  const [search, setSearch] =
    useState('')

  const [providerId, setProviderId] =
    useState('')

  const [mapped, setMapped] =
    useState('')

  const [page, setPage] =
    useState(1)

  const load = useCallback(
    async () => {
      setLoading(true)
      setError('')

      try {
        const [
          sourceResponse,
          serviceResponse,
          providerResponse,
        ] = await Promise.all([
          adminService
            .getSocialProviderServices({
              providerId,
              mapped,
              search,
              page,
              perPage: 50,
            }),

          adminService
            .getSocialServices(),

          adminService
            .getSocialProviders(),
        ])

        const source =
          sourceResponse?.data?.data
            ? sourceResponse.data
            : sourceResponse

        const servicePayload =
          serviceResponse?.data?.data
            ? serviceResponse.data
            : serviceResponse

        const providerPayload =
          Array.isArray(
            providerResponse?.data,
          )
            ? providerResponse.data
            : providerResponse

        setItems(
          Array.isArray(source?.data)
            ? source.data
            : [],
        )

        setMeta({
          current_page:
            source?.current_page || 1,
          last_page:
            source?.last_page || 1,
          total:
            source?.total || 0,
        })

        setServices(
          Array.isArray(
            servicePayload?.data,
          )
            ? servicePayload.data
            : Array.isArray(
                servicePayload,
              )
              ? servicePayload
              : [],
        )

        setProviders(
          Array.isArray(
            providerPayload,
          )
            ? providerPayload
            : Array.isArray(
                providerPayload?.data,
              )
              ? providerPayload.data
              : [],
        )
      } catch (err) {
        setError(
          err?.data?.message ||
            err?.message ||
            'Không tải được dịch vụ.',
        )
      } finally {
        setLoading(false)
      }
    },
    [
      mapped,
      page,
      providerId,
      search,
    ],
  )

  useEffect(() => {
    const timer =
      setTimeout(load, 250)

    return () =>
      clearTimeout(timer)
  }, [load])

  async function toggle(item) {
    try {
      await adminService
        .updateSocialProviderService(
          item.id,
          {
            is_active:
              !item.is_active,
          },
        )

      await load()
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          'Không cập nhật được.',
      )
    }
  }

  async function unmap(item) {
    if (
      !window.confirm(
        'Bỏ dịch vụ nguồn này khỏi dịch vụ đang bán?',
      )
    ) {
      return
    }

    try {
      await adminService
        .unmapSocialProviderService(
          item.id,
        )

      await load()
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          'Không bỏ map được.',
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Social Services
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Quản lý dịch vụ
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Quản lý catalog nguồn,
            giá vốn và map thành dịch vụ
            bán trên NoScam.
          </p>
        </div>

        <SocialAdminNav />

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(e) => {
              setSearch(
                e.target.value,
              )
              setPage(1)
            }}
            placeholder="Tìm tên hoặc ID dịch vụ..."
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400"
          />

          <select
            value={providerId}
            onChange={(e) => {
              setProviderId(
                e.target.value,
              )
              setPage(1)
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <option value="">
              Tất cả nhà cung cấp
            </option>

            {providers.map(
              (provider) => (
                <option
                  key={provider.id}
                  value={provider.id}
                >
                  {provider.name}
                </option>
              ),
            )}
          </select>

          <select
            value={mapped}
            onChange={(e) => {
              setMapped(
                e.target.value,
              )
              setPage(1)
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <option value="">
              Tất cả trạng thái
            </option>
            <option value="false">
              Chưa map
            </option>
            <option value="true">
              Đã map
            </option>
          </select>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-500">
            Tìm thấy{' '}
            <strong className="text-slate-950">
              {meta.total || 0}
            </strong>{' '}
            dịch vụ nguồn
          </div>

          <div className="text-sm font-semibold text-slate-400">
            Trang {meta.current_page || 1}
            {' / '}
            {meta.last_page || 1}
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-4">
                    Dịch vụ nguồn
                  </th>
                  <th className="px-5 py-4">
                    Provider
                  </th>
                  <th className="px-5 py-4">
                    Giá API
                  </th>

                  <th className="px-5 py-4">
                    Giá vốn VND
                  </th>
                  <th className="px-5 py-4">
                    Min / Max
                  </th>
                  <th className="px-5 py-4">
                    Map
                  </th>
                  <th className="px-5 py-4">
                    Trạng thái
                  </th>
                  <th className="px-5 py-4 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-16 text-center font-semibold text-slate-400"
                    >
                      Đang tải...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-16 text-center font-semibold text-slate-400"
                    >
                      Không có dịch vụ.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="max-w-sm font-bold text-slate-900">
                          {item.provider_service_name}
                        </div>

                        <div className="mt-1 text-xs font-semibold text-slate-400">
                          ID {item.provider_service_id}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <ProviderBadge
                          provider={item.provider}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-black text-slate-900">
                          {money(
                            item.cost_price_per_1000,
                          )}{' '}
                          <span className="text-xs text-slate-400">
                            {item.cost_currency ||
                              item.provider?.currency}
                          </span>
                        </div>

                        {Number(
                          item.price_multiplier || 1,
                        ) !== 1 && (
                          <div className="mt-1 text-xs font-semibold text-slate-400">
                            Hệ số ×
                            {Number(
                              item.price_multiplier,
                            ).toLocaleString(
                              'vi-VN',
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-black text-blue-700">
                          {vnd(
                            item.cost_price_vnd ??
                              item.cost_price_per_1000,
                          )}
                        </div>

                        {Number(
                          item.exchange_rate_to_vnd || 1,
                        ) !== 1 && (
                          <div className="mt-1 text-xs font-semibold text-slate-400">
                            Rate{' '}
                            {money(
                              item.exchange_rate_to_vnd,
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        {money(item.min_quantity)}
                        {' / '}
                        {money(item.max_quantity)}
                      </td>

                      <td className="px-5 py-4">
                        {item.is_mapped ? (
                          <div>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                              Đã map
                            </span>

                            <div className="mt-2 max-w-[180px] text-xs font-semibold text-slate-500">
                              {item.service?.name}
                            </div>
                          </div>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                            Chưa map
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            toggle(item)
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            item.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {item.is_active
                            ? 'Đang bật'
                            : 'Đang tắt'}
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {!item.is_mapped && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelected(
                                  item,
                                )
                              }
                              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                            >
                              Đưa lên bán
                            </button>
                          )}

                          {item.is_mapped && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setPriceSelected(
                                    item,
                                  )
                                }
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                              >
                                Chỉnh sửa
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  unmap(item)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                              >
                                Bỏ map
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={
              Number(meta.current_page) <=
              1
            }
            onClick={() =>
              setPage((value) =>
                Math.max(
                  1,
                  value - 1,
                ),
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            Trước
          </button>

          <button
            type="button"
            disabled={
              Number(meta.current_page) >=
              Number(meta.last_page)
            }
            onClick={() =>
              setPage(
                (value) =>
                  value + 1,
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </main>

      <AnimatePresence>
        {selected && (
          <MapModal
            item={selected}
            services={services}
            onClose={() =>
              setSelected(null)
            }
            onDone={load}
          />
        )}

        {priceSelected && (
          <PriceModal
            item={priceSelected}
            onClose={() =>
              setPriceSelected(null)
            }
            onDone={load}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
