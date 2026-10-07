import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  motion,
} from 'framer-motion'

import AdminNav from '../../components/admin/AdminNav'
import SocialAdminNav from '../../components/admin/social/SocialAdminNav'
import adminService from '../../services/adminService'

function money(value) {
  return new Intl.NumberFormat(
    'vi-VN',
    {
      maximumFractionDigits: 0,
    },
  ).format(Number(value || 0))
}

function decimal(value, digits = 4) {
  return Number(value || 0).toLocaleString(
    'vi-VN',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    },
  )
}

function providerBalanceOriginal(
  provider,
) {
  const balance =
    Number(provider.balance || 0)

  const currency =
    String(
      provider.currency || 'VND',
    ).toUpperCase()

  if (currency === 'VND') {
    return `${money(balance)}đ`
  }

  if (currency === 'USD') {
    return `$${decimal(balance, 4)}`
  }

  return `${decimal(
    balance,
    4,
  )} ${currency}`
}

function providerBalanceVnd(
  provider,
) {
  const value =
    provider.balance_vnd ??
    (
      Number(provider.balance || 0) *
      Number(
        provider.exchange_rate_to_vnd ||
          1,
      )
    )

  return `${money(value)}đ`
}

function StatCard({
  title,
  value,
  note,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </div>

      {note && (
        <div className="mt-2 text-xs font-medium text-slate-400">
          {note}
        </div>
      )}
    </div>
  )
}

function StatusBadge({
  status,
}) {
  const config = {
    active: [
      'Hoạt động',
      'bg-emerald-50 text-emerald-700',
    ],

    inactive: [
      'Đang tắt',
      'bg-slate-100 text-slate-600',
    ],

    error: [
      'Lỗi',
      'bg-red-50 text-red-600',
    ],
  }

  const item =
    config[status] || [
      status,
      'bg-slate-100 text-slate-600',
    ]

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${item[1]}`}
    >
      {item[0]}
    </span>
  )
}

function ProviderCard({
  provider,
  onRefresh,
}) {
  const [editing, setEditing] =
    useState(false)

  const [busy, setBusy] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [showKey, setShowKey] =
    useState(true)

  const [form, setForm] =
    useState({
      name:
        provider.name || '',

      api_url:
        provider.api_url || '',

      api_key:
        provider.api_key || '',

      priority:
        provider.priority ?? 100,

      auto_sync:
        Boolean(
          provider.auto_sync,
        ),

      status:
        provider.status ||
        'inactive',

      exchange_rate_to_vnd:
        provider
          .exchange_rate_to_vnd ??
        1,

      price_multiplier:
        provider
          .price_multiplier ??
        1,

      username:
        provider.settings
          ?.username || '',
    })

  async function execute(
    action,
    callback,
  ) {
    setBusy(action)
    setMessage('')

    try {
      const response =
        await callback()

      setMessage(
        response?.data?.message ||
          response?.message ||
          'Thành công.',
      )

      await onRefresh()

      return true
    } catch (error) {
      setMessage(
        error?.data?.message ||
          error?.message ||
          'Có lỗi xảy ra.',
      )

      return false
    } finally {
      setBusy('')
    }
  }

  async function save() {
    const payload = {
      name:
        form.name,

      api_url:
        form.api_url,

      priority:
        Number(form.priority),

      auto_sync:
        form.auto_sync,

      status:
        form.status,

      exchange_rate_to_vnd:
        Number(
          form.exchange_rate_to_vnd,
        ),

      price_multiplier:
        Number(
          form.price_multiplier,
        ),
    }

    if (
      form.api_key.trim()
    ) {
      payload.api_key =
        form.api_key.trim()
    }

    if (
      provider.driver ===
      'vietnamfb'
    ) {
      payload.settings = {
        username:
          form.username.trim(),
      }
    }

    const success =
      await execute(
        'save',
        () =>
          adminService
            .updateSocialProvider(
              provider.id,
              payload,
            ),
      )

    if (success) {
      setEditing(false)
    }
  }

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-black text-slate-950">
                {provider.name}
              </h3>

              <StatusBadge
                status={
                  provider.status
                }
              />
            </div>

            <div className="mt-2 text-sm text-slate-500">
              {provider.api_url}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setEditing(
                (value) =>
                  !value,
              )
            }
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {editing
              ? 'Đóng'
              : 'Cấu hình'}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Số dư API
            </div>

            <div className="mt-1 text-lg font-black text-slate-950">
              {providerBalanceOriginal(
                provider,
              )}
            </div>

            {String(
              provider.currency,
            ).toUpperCase() !==
              'VND' && (
              <div className="mt-1 text-xs font-semibold text-slate-400">
                ≈{' '}
                {providerBalanceVnd(
                  provider,
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Tỷ giá
            </div>

            <div className="mt-1 text-lg font-black text-slate-950">
              {money(
                provider
                  .exchange_rate_to_vnd ||
                  1,
              )}
            </div>

            <div className="mt-1 text-xs font-semibold text-slate-400">
              1 {provider.currency || 'VND'} → VND
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Hệ số giá
            </div>

            <div className="mt-1 text-lg font-black text-slate-950">
              ×
              {decimal(
                provider
                  .price_multiplier ||
                  1,
                6,
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Dịch vụ nguồn
            </div>

            <div className="mt-1 text-lg font-black text-slate-950">
              {provider
                .services_count ?? 0}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Đơn hàng
            </div>

            <div className="mt-1 text-lg font-black text-slate-950">
              {provider
                .orders_count ?? 0}
            </div>
          </div>
        </div>

        {provider.last_error && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {provider.last_error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">
            {message}
          </div>
        )}

        {editing && (
          <motion.div
            initial={{
              opacity: 0,
              y: -8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mt-6 grid gap-5 border-t border-slate-100 pt-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Tên nhà cung cấp
                </span>

                <input
                  value={
                    form.name
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name:
                        e.target
                          .value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Priority
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    form.priority
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priority:
                        e.target
                          .value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">
                API URL
              </span>

              <input
                value={
                  form.api_url
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    api_url:
                      e.target.value,
                  })
                }
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
              />
            </label>

            <label className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-700">
                  API key
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setShowKey(
                      (value) =>
                        !value,
                    )
                  }
                  className="text-xs font-bold text-blue-600"
                >
                  {showKey
                    ? 'Ẩn key'
                    : 'Hiện key'}
                </button>
              </div>

              <input
                type={
                  showKey
                    ? 'text'
                    : 'password'
                }
                autoComplete="off"
                value={
                  form.api_key
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    api_key:
                      e.target.value,
                  })
                }
                placeholder="Nhập API key"
                className="rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:border-blue-400"
              />

              <span className="text-xs text-slate-400">
                Chỉ hiển thị trong khu vực quản trị.
              </span>
            </label>

            {provider.driver ===
              'vietnamfb' && (
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Username VietnamFB
                </span>

                <input
                  value={
                    form.username
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      username:
                        e.target
                          .value,
                    })
                  }
                  placeholder="Username tài khoản VietnamFB"
                  className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                />
              </label>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Tỷ giá sang VND
                </span>

                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={
                    form
                      .exchange_rate_to_vnd
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      exchange_rate_to_vnd:
                        e.target
                          .value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                />

                <span className="text-xs text-slate-400">
                  Ví dụ USD: 27500. Nguồn VND: 1.
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Hệ số giá
                </span>

                <input
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  value={
                    form
                      .price_multiplier
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price_multiplier:
                        e.target
                          .value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                />

                <span className="text-xs text-slate-400">
                  Giá vốn VND = giá API × tỷ giá × hệ số.
                </span>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Trạng thái
                </span>

                <select
                  value={
                    form.status
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status:
                        e.target
                          .value,
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <option value="inactive">
                    Đang tắt
                  </option>

                  <option value="active">
                    Hoạt động
                  </option>

                  <option value="error">
                    Lỗi
                  </option>
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    form.auto_sync
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      auto_sync:
                        e.target
                          .checked,
                    })
                  }
                />

                <div>
                  <div className="text-sm font-bold text-slate-700">
                    Tự đồng bộ
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    Cho phép hệ thống đồng bộ catalog tự động.
                  </div>
                </div>
              </label>
            </div>

            <button
              type="button"
              disabled={
                Boolean(busy)
              }
              onClick={save}
              className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {busy === 'save'
                ? 'Đang lưu...'
                : 'Lưu cấu hình'}
            </button>
          </motion.div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={
              Boolean(busy)
            }
            onClick={() =>
              execute(
                'test',
                () =>
                  adminService
                    .testSocialProvider(
                      provider.id,
                    ),
              )
            }
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy === 'test'
              ? 'Đang kiểm tra...'
              : 'Test kết nối'}
          </button>

          <button
            type="button"
            disabled={
              Boolean(busy)
            }
            onClick={() =>
              execute(
                'sync',
                () =>
                  adminService
                    .syncSocialProvider(
                      provider.id,
                    ),
              )
            }
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            {busy === 'sync'
              ? 'Đang đồng bộ...'
              : 'Đồng bộ dịch vụ'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function AdminSocialPage() {
  const [dashboard, setDashboard] =
    useState(null)

  const [providers, setProviders] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const load = useCallback(
    async () => {
      setError('')

      try {
        const [
          dashboardResponse,
          providersResponse,
        ] = await Promise.all([
          adminService
            .getSocialDashboard(),

          adminService
            .getSocialProviders(),
        ])

        const dashboardPayload =
          dashboardResponse
            ?.data?.data ??
          dashboardResponse
            ?.data ??
          dashboardResponse ??
          {}

        const providersPayload =
          providersResponse
            ?.data?.data ??
          providersResponse
            ?.data ??
          providersResponse ??
          []

        setDashboard(
          dashboardPayload,
        )

        setProviders(
          Array.isArray(
            providersPayload,
          )
            ? providersPayload
            : [],
        )
      } catch (err) {
        setError(
          err?.data?.message ||
            err?.message ||
            'Không tải được dữ liệu.',
        )
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  const data =
    dashboard || {}

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Social Services
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Tăng tương tác
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Quản lý nhà cung cấp,
              dịch vụ, đơn hàng,
              giá vốn và lợi nhuận.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Làm mới
          </button>
        </div>

        <SocialAdminNav />

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Nhà cung cấp"
            value={
              data.providers
                ?.total ?? 0
            }
            note={`${data.providers?.active ?? 0} đang hoạt động`}
          />

          <StatCard
            title="Dịch vụ"
            value={
              data.services
                ?.total ?? 0
            }
            note={`${data.services?.active ?? 0} đang bán`}
          />

          <StatCard
            title="Đơn hàng"
            value={
              data.orders
                ?.total ?? 0
            }
            note={`${data.orders?.today ?? 0} đơn hôm nay`}
          />

          <StatCard
            title="Lợi nhuận"
            value={`${money(
              data.money?.profit,
            )}đ`}
            note={`Doanh thu ${money(data.money?.revenue)}đ`}
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Nhà cung cấp API
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Quản lý kết nối, tỷ giá,
              hệ số quy đổi và catalog
              của từng nhà cung cấp.
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
            Giá vốn VND = Giá API × Tỷ giá × Hệ số
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center font-semibold text-slate-500">
              Đang tải...
            </div>
          ) : providers.length ? (
            providers.map(
              (provider) => (
                <ProviderCard
                  key={
                    provider.id
                  }
                  provider={
                    provider
                  }
                  onRefresh={
                    load
                  }
                />
              ),
            )
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center font-semibold text-slate-500">
              Chưa có nhà cung cấp.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
