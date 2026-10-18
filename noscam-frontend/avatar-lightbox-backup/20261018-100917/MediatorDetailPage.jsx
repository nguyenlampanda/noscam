import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useParams,
} from 'react-router-dom'

import Container from '../../components/layout/Container'
import mediatorService from '../../services/mediatorService'

const labels = {
  phone: 'Số điện thoại',
  bank_account:
    'Tài khoản ngân hàng',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  zalo: 'Zalo',
  telegram: 'Telegram',
  other: 'Thông tin khác',
}

function money(value) {
  return `${Number(
    value || 0,
  ).toLocaleString('vi-VN')}đ`
}


const platformInfo = {
  facebook: { name: 'Facebook', icon: 'f', color: 'bg-blue-600' },
  instagram: { name: 'Instagram', icon: '◎', color: 'bg-pink-600' },
  tiktok: { name: 'TikTok', icon: '♪', color: 'bg-slate-950' },
  telegram: { name: 'Telegram', icon: '➤', color: 'bg-sky-500' },
  zalo: { name: 'Zalo', icon: 'Z', color: 'bg-blue-500' },
  phone: { name: 'Số điện thoại', icon: '☎', color: 'bg-emerald-600' },
  bank_account: { name: 'Tài khoản ngân hàng', icon: '▣', color: 'bg-slate-600' },
  other: { name: 'Thông tin khác', icon: '↗', color: 'bg-slate-500' },
}

function safeExternalUrl(value, type) {
  const raw = String(value || '').trim()
  if (!raw) return null

  if (type === 'phone') {
    const number = raw.replace(/[^\d+]/g, '')
    return /^\+?\d{9,15}$/.test(number) ? `tel:${number}` : null
  }

  if (type === 'zalo' && /^\+?[\d\s().-]{9,20}$/.test(raw)) {
    const number = raw.replace(/\D/g, '')
    return number.length >= 9 && number.length <= 15
      ? `https://zalo.me/${number}`
      : null
  }

  let candidate = raw

  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    if (/^(www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(candidate)) {
      candidate = `https://${candidate}`
    } else {
      return null
    }
  }

  try {
    const url = new URL(candidate)
    return ['https:', 'http:'].includes(url.protocol)
      ? url.href
      : null
  } catch {
    return null
  }
}

function isImageUrl(url) {
  if (!url || url.startsWith('tel:')) return false
  try {
    return /\.(png|jpe?g|webp|gif|avif)$/i.test(
      new URL(url).pathname
    )
  } catch {
    return false
  }
}

function MediatorIdentifier({ item }) {
  const type = String(item.type || 'other').toLowerCase()
  const platform = platformInfo[type] || platformInfo.other
  const value = String(item.value || '').trim()
  const href = safeExternalUrl(value, type)
  const image = isImageUrl(href)
  const isPhone = type === 'phone'
  const isZalo = type === 'zalo'

  return (
    <div className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-blue-200 hover:shadow-md sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white ${platform.color}`}
          aria-hidden="true"
        >
          {platform.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {labels[type] || platform.name}
          </p>

          {href ? (
            <a
              href={href}
              target={isPhone ? undefined : '_blank'}
              rel={isPhone ? undefined : 'noopener noreferrer'}
              className="mt-2 block break-all text-sm font-bold leading-6 text-blue-600 underline decoration-blue-200 underline-offset-4 transition hover:text-blue-800 hover:decoration-blue-600"
              title={value}
            >
              {value}
            </a>
          ) : (
            <p className="mt-2 break-all text-sm font-bold leading-6 text-slate-900">
              {value || 'Chưa cập nhật'}
            </p>
          )}

          {(item.bank_name || item.label) && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {item.bank_name || item.label}
            </p>
          )}
        </div>
      </div>

      {image && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
        >
          <img
            src={href}
            alt={`Hình ảnh ${platform.name}`}
            loading="lazy"
            className="max-h-64 w-full object-contain transition duration-200 group-hover:scale-[1.01]"
          />
        </a>
      )}

      {href && (
        <div className="mt-4 flex justify-end">
          <a
            href={href}
            target={isPhone ? undefined : '_blank'}
            rel={isPhone ? undefined : 'noopener noreferrer'}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white"
          >
            {isPhone
              ? 'Gọi điện'
              : isZalo
                ? 'Mở Zalo'
                : image
                  ? 'Xem hình ảnh'
                  : 'Truy cập liên kết'}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
    </div>
  )
}

function MediatorDetailPage() {
  const { code } = useParams()

  const [data, setData] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const response =
          await mediatorService
            .show(code)

        if (active) {
          setData(
            response?.data ||
            null,
          )
        }
      } catch (err) {
        if (active) {
          setError(
            err?.message ||
            'Không tìm thấy hồ sơ.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [code])

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        Đang tải hồ sơ...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-24 text-center text-red-600">
        {error}
      </div>
    )
  }

  return (
    <section className="bg-slate-50 py-10 sm:py-16">
      <Container>
        <div className="mx-auto max-w-5xl">
          <Link
            to="/mediators"
            className="text-sm font-bold text-blue-600"
          >
            ← Danh sách trung gian
          </Link>

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="h-1.5 bg-emerald-500" />

            <div className="p-6 sm:p-9">
              <div className="flex flex-col gap-6 md:flex-row md:justify-between">
                <div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    Hồ sơ trung gian được ghi nhận
                  </span>

                  {data.avatar_url && (
                    <img src={data.avatar_url} alt={`Ảnh đại diện ${data.name}`}
                      className="mt-5 h-24 w-24 rounded-full border-4 border-white object-cover shadow-md" />
                  )}
                  <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
                    {data.name}
                  </h1>

                  <p className="mt-2 font-black text-blue-600">
                    {data.code}
                  </p>

                  {data.description && (
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
                      {
                        data.description
                      }
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 md:min-w-60">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Tiền cọc hiện ghi nhận
                  </p>

                  <p className="mt-2 text-3xl font-black text-emerald-600">
                    {money(
                      data
                        .deposit_balance,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-9 border-t border-slate-100 pt-7">
                <h2 className="text-lg font-black text-slate-950">
                  Thông tin chính thức để đối chiếu
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {data.identifiers?.map(item => (
                    <MediatorIdentifier
                      key={item.id}
                      item={item}
                    />
                  ))}
                </div>
              </div>

              {data.deposit_history
                ?.length > 0 && (
                <div className="mt-9 border-t border-slate-100 pt-7">
                  <h2 className="text-lg font-black text-slate-950">
                    Lịch sử tiền cọc
                  </h2>

                  <div className="mt-4 space-y-2">
                    {data
                      .deposit_history
                      .map((log) => (
                        <div
                          key={log.id}
                          className="flex flex-col gap-2 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              {log.note ||
                                'Điều chỉnh tiền cọc'}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {
                                log.recorded_at
                              }
                            </p>
                          </div>

                          <strong
                            className={
                              Number(
                                log.amount,
                              ) >= 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }
                          >
                            {Number(
                              log.amount,
                            ) > 0
                              ? '+'
                              : ''}
                            {money(
                              log.amount,
                            )}
                          </strong>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-9 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                Số tiền cọc và hồ sơ trên là dữ liệu NoScam đang ghi nhận tại thời điểm hiển thị. Đây không phải bảo đảm tuyệt đối rằng mọi giao dịch đều không có rủi ro. Hãy đối chiếu chính xác SĐT, STK và tài khoản trước khi chuyển tiền.
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  )
}

export default MediatorDetailPage
