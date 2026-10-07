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

function MapModal({
  item,
  services,
  onClose,
  onDone,
}) {
  const [mode, setMode] =
    useState('new')

  const [busy, setBusy] =
    useState(false)

  const [error, setError] =
    useState('')

  const [form, setForm] =
    useState({
      social_service_id: '',
      platform: 'facebook',
      category: 'like',
      name:
        item.provider_service_name ||
        '',
      code: '',
      sell_price_per_1000:
        Number(
          item.cost_price_per_1000 ||
            0,
        ),
      min_quantity:
        item.min_quantity || 1,
      max_quantity:
        item.max_quantity ||
        1000000,
      priority: item.priority || 100,
    })

  async function submit() {
    setBusy(true)
    setError('')

    try {
      let payload

      if (mode === 'existing') {
        if (!form.social_service_id) {
          throw new Error(
            'Hãy chọn dịch vụ NoScam.',
          )
        }

        payload = {
          social_service_id:
            Number(
              form.social_service_id,
            ),
          priority:
            Number(form.priority),
          is_active: true,
        }
      } else {
        payload = {
          platform:
            form.platform,
          category:
            form.category,
          name:
            form.name.trim(),
          code:
            form.code.trim() ||
            undefined,
          sell_price_per_1000:
            Number(
              form.sell_price_per_1000,
            ),
          min_quantity:
            Number(
              form.min_quantity,
            ),
          max_quantity:
            Number(
              form.max_quantity,
            ),
          priority:
            Number(form.priority),
          is_active: true,
        }
      }

      await adminService
        .mapSocialProviderService(
          item.id,
          payload,
        )

      await onDone()
      onClose()
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          'Không thể map dịch vụ.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
          scale: 0.98,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 20,
          scale: 0.98,
        }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Đưa lên bán
            </div>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              {item.provider_service_name}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ProviderBadge
                provider={item.provider}
              />

              <span className="text-xs font-semibold text-slate-400">
                ID {item.provider_service_id}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 font-black text-slate-500"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() =>
              setMode('new')
            }
            className={`rounded-xl px-3 py-2.5 text-sm font-bold ${
              mode === 'new'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Tạo dịch vụ mới
          </button>

          <button
            type="button"
            onClick={() =>
              setMode('existing')
            }
            className={`rounded-xl px-3 py-2.5 text-sm font-bold ${
              mode === 'existing'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Map vào dịch vụ có sẵn
          </button>
        </div>

        {mode === 'existing' ? (
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">
                Dịch vụ NoScam
              </span>

              <select
                value={
                  form.social_service_id
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    social_service_id:
                      e.target.value,
                  })
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <option value="">
                  Chọn dịch vụ
                </option>

                {services.map(
                  (service) => (
                    <option
                      key={service.id}
                      value={service.id}
                    >
                      {service.name}
                      {' · '}
                      {service.platform}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">
                Priority nguồn
              </span>

              <input
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority:
                      e.target.value,
                  })
                }
                className="rounded-xl border border-slate-200 px-4 py-3"
              />
            </label>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Nền tảng
                </span>

                <select
                  value={form.platform}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      platform:
                        e.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <option value="facebook">
                    Facebook
                  </option>
                  <option value="instagram">
                    Instagram
                  </option>
                  <option value="tiktok">
                    TikTok
                  </option>
                  <option value="other">
                    Khác
                  </option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Loại
                </span>

                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category:
                        e.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <option value="follow">
                    Follow
                  </option>
                  <option value="like">
                    Like
                  </option>
                  <option value="view">
                    View
                  </option>
                  <option value="comment">
                    Comment
                  </option>
                  <option value="share">
                    Share
                  </option>
                  <option value="reaction">
                    Reaction
                  </option>
                  <option value="other">
                    Khác
                  </option>
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">
                Tên khách hàng nhìn thấy
              </span>

              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name:
                      e.target.value,
                  })
                }
                className="rounded-xl border border-slate-200 px-4 py-3"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">
                Mã dịch vụ
              </span>

              <input
                value={form.code}
                onChange={(e) =>
                  setForm({
                    ...form,
                    code:
                      e.target.value,
                  })
                }
                placeholder="Để trống sẽ tự tạo"
                className="rounded-xl border border-slate-200 px-4 py-3"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Giá bán / 1.000
                </span>

                <input
                  type="number"
                  step="0.0001"
                  value={
                    form.sell_price_per_1000
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sell_price_per_1000:
                        e.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Priority nguồn
                </span>

                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priority:
                        e.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Min
                </span>

                <input
                  type="number"
                  value={
                    form.min_quantity
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      min_quantity:
                        e.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Max
                </span>

                <input
                  type="number"
                  value={
                    form.max_quantity
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_quantity:
                        e.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Giá API / 1.000
            </div>

            <div className="mt-1 text-lg font-black text-slate-950">
              {money(
                item.cost_price_per_1000,
              )}{' '}
              <span className="text-xs text-slate-400">
                {item.cost_currency ||
                  item.provider?.currency ||
                  ''}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-500">
              Giá vốn VND / 1.000
            </div>

            <div className="mt-1 text-lg font-black text-blue-700">
              {vnd(
                item.cost_price_vnd ??
                item.cost_price_per_1000,
              )}
            </div>

            {Number(
              item.exchange_rate_to_vnd || 1,
            ) !== 1 && (
              <div className="mt-1 text-xs font-semibold text-blue-400">
                Tỷ giá{' '}
                {money(
                  item.exchange_rate_to_vnd,
                )}
              </div>
            )}
          </div>

          <div
            className={`rounded-2xl p-4 ${
              profitAmount(
                form.sell_price_per_1000,
                item.cost_price_vnd ??
                  item.cost_price_per_1000,
              ) >= 0
                ? 'bg-emerald-50'
                : 'bg-red-50'
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lãi / 1.000
            </div>

            <div
              className={`mt-1 text-lg font-black ${
                profitAmount(
                  form.sell_price_per_1000,
                  item.cost_price_vnd ??
                    item.cost_price_per_1000,
                ) >= 0
                  ? 'text-emerald-700'
                  : 'text-red-600'
              }`}
            >
              {vnd(
                profitAmount(
                  form.sell_price_per_1000,
                  item.cost_price_vnd ??
                    item.cost_price_per_1000,
                ),
              )}
            </div>

            <div className="mt-1 text-xs font-bold text-slate-500">
              {profitPercent(
                form.sell_price_per_1000,
                item.cost_price_vnd ??
                  item.cost_price_per_1000,
              ).toFixed(1)}
              % trên giá vốn
            </div>
          </div>
        </div>

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
          {busy
            ? 'Đang lưu...'
            : mode === 'existing'
              ? 'Map vào dịch vụ'
              : 'Tạo và đưa lên bán'}
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
                            <button
                              type="button"
                              onClick={() =>
                                unmap(item)
                              }
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                            >
                              Bỏ map
                            </button>
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
      </AnimatePresence>
    </div>
  )
}
