import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import apiClient from '../services/apiClient'
import customerService, { getCustomerToken } from '../services/customerService'
import BankTransferQR from '../components/digital/BankTransferQR'

const categoryNames = {
  press_pr: 'Báo chí / PR',
  account_support: 'Hỗ trợ tài khoản',
  digital_other: 'Dịch vụ khác',
}

const platformNames = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  website: 'Website',
  other: 'Khác / Tổng hợp',
}

function money(value) {
  const number = Number(value)
  return Number.isFinite(number)
    ? number.toLocaleString('vi-VN') + ' ₫'
    : 'Liên hệ báo giá'
}

export default function DigitalServiceDetailPage({ serviceId, onClose }) {
  const params = useParams()
  const id = serviceId ?? params.id
  const isModal = Boolean(onClose)
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft] = useState(() => {
    const storageKey = `noscam_digital_draft_${id}`

    try {
      const raw = sessionStorage.getItem(storageKey)
      if (!raw) return null

      const value = JSON.parse(raw)

      if (
        !value?.formValues ||
        typeof value.formValues !== 'object' ||
        Array.isArray(value.formValues)
      ) {
        return null
      }

      return value
    } catch {
      return null
    }
  })

  const [formValues, setFormValues] = useState(
    () => draft?.formValues ?? {}
  )
  const [preview, setPreview] = useState(
    () => Boolean(draft)
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [uncertainGuestOrder, setUncertainGuestOrder] = useState(false)
  const [createdOrder, setCreatedOrder] = useState(null)
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false)
  const [guestMode, setGuestMode] = useState(false)
  const [guestInfo, setGuestInfo] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
  })
  const [guestResult, setGuestResult] = useState(null)
  const [requestKey, setRequestKey] = useState(() =>
    typeof draft?.requestKey === 'string' &&
    /^[A-Za-z0-9_-]{1,100}$/.test(draft.requestKey)
      ? draft.requestKey
      : crypto.randomUUID()
  )
  const navigate = useNavigate()

  function updateField(key, value) {
    setFormValues(previous => ({ ...previous, [key]: value }))
    setPreview(false)
    setSubmitError('')
    setRequestKey(crypto.randomUUID())
  }

  async function submitDigitalOrder() {
    if (submitting || createdOrder || uncertainGuestOrder) return

    if (!getCustomerToken() && !guestMode) {
      sessionStorage.setItem(
        `noscam_digital_draft_${id}`,
        JSON.stringify({
          formValues,
          requestKey,
        })
      )

      navigate('/login', {
        state: { from: `/digital-services/${id}` },
      })
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const payload = {
        idempotency_key: requestKey,
        service_id: Number(id),
        request_data: Object.fromEntries(
          Object.entries(formValues).map(([key, value]) => [
            key,
            value.trim(),
          ])
        ),
      }

      const isGuest = !getCustomerToken() && guestMode

      const response = isGuest
        ? await customerService.createGuestDigitalOrder({
            ...payload,
            guest_name: guestInfo.guest_name.trim(),
            guest_phone: guestInfo.guest_phone.trim(),
            ...(guestInfo.guest_email.trim()
              ? { guest_email: guestInfo.guest_email.trim() }
              : {}),
          })
        : await customerService.createDigitalOrder(payload)

      if (!response?.data?.id) {
        throw new Error('Máy chủ chưa trả về mã đơn hàng.')
      }

      setShowOrderConfirmation(false)
      setCreatedOrder(response.data)
      if (isGuest) {
        setGuestResult(response.data)
      }

      // Chỉ xóa bản nháp sau khi máy chủ xác nhận tạo đơn.
      try {
        sessionStorage.removeItem(`noscam_digital_draft_${id}`)
      } catch {
        // Không làm mất kết quả đặt hàng nếu bộ nhớ trình duyệt bị chặn.
      }

      setPreview(false)
    } catch (error) {
      const uncertain = (
        !getCustomerToken() &&
        guestMode &&
        (!error?.status || error.status >= 500)
      )

      if (uncertain) {
        setUncertainGuestOrder(true)
        setSubmitError(
          'Chưa xác định được đơn hàng đã tạo hay chưa. ' +
          'Vui lòng không gửi lại yêu cầu này hoặc chuyển khoản ' +
          'khi chưa nhận được mã đơn và mã tra cứu. ' +
          'Hãy liên hệ hỗ trợ để kiểm tra.'
        )
      } else {
        setSubmitError(
          error?.status === 401
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            : error?.message || 'Không thể gửi yêu cầu.'
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')
      setService(null)

      try {
        const response = await apiClient.get(
          `/digital/services/${encodeURIComponent(id)}`,
          { signal: controller.signal }
        )

        if (!controller.signal.aborted) {
          if (!response?.data?.id) {
            throw new Error('Dữ liệu dịch vụ không hợp lệ.')
          }
          setService(response.data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.status === 404
              ? 'Dịch vụ không tồn tại hoặc đã ngừng hoạt động.'
              : err.message
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [id])

  return (
    <div className={isModal ? "bg-white" : "min-h-screen bg-slate-50"}>

      <main className={isModal ? "mx-auto max-w-5xl px-4 py-5 sm:px-6" : "mx-auto max-w-5xl px-4 py-10 sm:px-6"}>
        {!isModal && (<Link
          to="/digital-services"
          className="inline-flex rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
        >
          ← Quay lại danh sách
        </Link>)}

        {loading ? (
          <p className="mt-8 rounded-2xl bg-white p-8 text-center text-slate-500">
            Đang tải chi tiết dịch vụ...
          </p>
        ) : error ? (
          <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        ) : service ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-2">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  {categoryNames[service.category] ?? service.category}
                </span>
                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {platformNames[service.platform] ?? service.platform}
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900">
                {service.name}
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Mã dịch vụ: {service.code}
              </p>

              <h2 className="mt-8 text-lg font-extrabold text-slate-900">
                Thông tin dịch vụ
              </h2>

              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                {service.description || 'Thông tin chi tiết đang được cập nhật.'}
              </p>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <h2 className="text-lg font-extrabold text-slate-900">
                  Nhập thông tin yêu cầu
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Vui lòng cung cấp thông tin chính xác.
                  Kiểm tra thông tin và xác nhận gửi yêu cầu.
                </p>

                <form onSubmit={event => {
                  event.preventDefault()
                  if (!submitting && !createdOrder && !uncertainGuestOrder) {
                    setShowOrderConfirmation(true)
                  }
                }} className="mt-6 space-y-5">
                  {(Array.isArray(service.requirements)
                    ? service.requirements
                    : []
                  ).map(field => {
                    const value = formValues[field.key] ?? ''
                    const inputClass =
                      'mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

                    return (
                      <div key={field.key}>
                        <label
                          htmlFor={`request-${field.key}`}
                          className="block text-sm font-bold text-slate-700"
                        >
                          {field.label}
                          {field.required && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </label>

                        {field.type === 'textarea' ? (
                          <textarea
                            id={`request-${field.key}`}
                            value={value}
                            required={Boolean(field.required)}
                            onChange={event =>
                              updateField(field.key, event.target.value)
                            }
                            rows={4}
                            maxLength={5000}
                            className={inputClass}
                          />
                        ) : (
                          <input
                            id={`request-${field.key}`}
                            type={
                              ['email', 'url'].includes(field.type)
                                ? field.type
                                : 'text'
                            }
                            value={value}
                            required={Boolean(field.required)}
                            onChange={event =>
                              updateField(field.key, event.target.value)
                            }
                            maxLength={2000}
                            className={inputClass}
                          />
                        )}
                      </div>
                    )
                  })}

                  <div>
                    <label
                      htmlFor="request-zalo-phone"
                      className="block text-sm font-bold text-slate-700"
                    >
                      Số Zalo <span className="ml-1 text-red-500">*</span>
                    </label>
                    <input
                      id="request-zalo-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Ví dụ: 0912345678"
                      value={formValues.zalo_phone ?? ''}
                      onChange={event =>
                        updateField('zalo_phone', event.target.value)
                      }
                      required
                      pattern="0[0-9]{9}"
                      title="Nhập số điện thoại Việt Nam gồm 10 chữ số, bắt đầu bằng 0."
                      maxLength={10}
                      className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Xác nhận gửi yêu cầu
                  </button>
                </form>

                {showOrderConfirmation && !createdOrder && (
                  <div
                    role="presentation"
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={event => {
                      if (event.target === event.currentTarget && !submitting) {
                        setShowOrderConfirmation(false)
                      }
                    }}
                  >
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="digital-order-confirm-title"
                      className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                        <h2 id="digital-order-confirm-title" className="text-xl font-extrabold text-slate-950">
                          Xác nhận thông tin đơn hàng
                        </h2>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setShowOrderConfirmation(false)}
                          className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
                        <div className="rounded-xl bg-blue-50 p-4">
                          <p className="text-xs font-semibold text-blue-600">Dịch vụ</p>
                          <p className="mt-1 font-bold text-slate-950">{service.name}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            Nền tảng: {platformNames[service.platform] ?? service.platform}
                          </p>
                          <p className="mt-2 text-lg font-extrabold text-blue-700">
                            {service.pricing_type === 'quote'
                              ? 'Yêu cầu báo giá'
                              : money(service.price_vnd)}
                          </p>
                        </div>

                        <h3 className="font-bold text-slate-900">Thông tin yêu cầu</h3>

                        {(Array.isArray(service.requirements)
                          ? service.requirements
                          : []
                        ).filter(field => field.key !== 'zalo_phone' && field.key !== 'zalo').map(field => (
                          <div key={field.key} className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-500">{field.label}</p>
                            {(() => {
                              const value = String(formValues[field.key] ?? '').trim()
                              const isUrl = /^https?:\/\//i.test(value)
                              let safeUrl = null

                              if (isUrl) {
                                try {
                                  const parsed = new URL(value)
                                  if (['http:', 'https:'].includes(parsed.protocol)) {
                                    safeUrl = parsed.href
                                  }
                                } catch {
                                  safeUrl = null
                                }
                              }

                              return safeUrl ? (
                                <a
                                  href={safeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 block break-all text-sm font-bold text-blue-600 underline underline-offset-2 hover:text-blue-800"
                                >
                                  {value}
                                </a>
                              ) : (
                                <p className="mt-1 break-words whitespace-pre-wrap text-sm font-semibold text-slate-900">
                                  {value || 'Chưa nhập'}
                                </p>
                              )
                            })()}
                          </div>
                        ))}

                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <p className="text-xs font-bold text-blue-700">Số Zalo</p>
                          <p className="mt-1 text-lg font-extrabold text-slate-950">
                            {formValues.zalo_phone}
                          </p>
                        </div>

                        {guestMode && (
                          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                            <p>Khách hàng: {guestInfo.guest_name}</p>
                            <p>Điện thoại: {guestInfo.guest_phone}</p>
                            {guestInfo.guest_email && <p>Email: {guestInfo.guest_email}</p>}
                          </div>
                        )}

                        {submitError && (
                          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                            {submitError}
                          </p>
                        )}

                        <p className="text-xs leading-5 text-slate-500">
                          Vui lòng kiểm tra kỹ thông tin. Đơn hàng chỉ được tạo khi bạn bấm xác nhận bên dưới.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-5">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setShowOrderConfirmation(false)}
                          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Quay lại chỉnh sửa
                        </button>
                        <button
                          type="button"
                          disabled={submitting || uncertainGuestOrder}
                          onClick={() => { void submitDigitalOrder() }}
                          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {submitting ? 'Đang tạo đơn...' : 'Xác nhận tạo đơn'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {createdOrder && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Gửi yêu cầu thành công"
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        setCreatedOrder(null)
                      }
                    }}
                  >
                    <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
                      <button
                        type="button"
                        onClick={() => setCreatedOrder(null)}
                        aria-label="Đóng thông báo"
                        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                      >
                        ✕
                      </button>
                      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                    <h3 className="text-lg font-extrabold text-green-800">
                      Gửi yêu cầu thành công
                    </h3>
                    <p className="mt-3 text-sm text-green-900">
                      Mã đơn hàng: <strong>NSD-{String(createdOrder.id).padStart(6, "0")}</strong>
                    </p>
                    <p className="mt-2 text-sm text-green-800">
                      Trạng thái: Chờ xử lý
                    </p>
                    <p className="mt-2 text-sm text-green-800">
                      Yêu cầu chưa được thanh toán.
                    </p>

                    {guestResult?.lookup_token && (
                      <Link
                        to="/digital/guest/lookup"
                        className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        Tra cứu trạng thái đơn hàng
                      </Link>
                    )}

                    {guestResult?.lookup_token && (
                      <div className="mt-5 rounded-xl border border-amber-300 bg-white p-4">
                        <p className="font-bold text-slate-900">
                          Mã tra cứu bí mật — chỉ hiển thị khi tạo đơn
                        </p>
                        <p className="mt-2 break-all font-mono text-xs text-slate-800">
                          {guestResult.lookup_token}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              guestResult.lookup_token
                            )
                          }
                          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                        >
                          Sao chép mã tra cứu
                        </button>
                        <p className="mt-2 text-sm text-amber-800">
                          Hãy lưu mã này cùng mã đơn hàng. Nếu mất mã,
                          bạn sẽ không thể tra cứu đơn bằng chức năng
                          dành cho khách vãng lai.
                        </p>
                      </div>
                    )}

                    {guestResult?.bank &&
                      guestResult?.bank_transfer_content &&
                      Number(guestResult.amount_vnd) > 0 && (
                        <div className="mt-5">
                          <BankTransferQR
                            bank={guestResult.bank}
                            amount={Number(guestResult.amount_vnd)}
                            content={guestResult.bank_transfer_content}
                          />
                        </div>
                      )}

                    {!guestResult && (
                      <Link
                        to="/my-digital-orders"
                        className="mt-4 inline-block text-sm font-bold text-blue-700 underline"
                      >
                        Xem đơn hàng và phương thức thanh toán
                      </Link>
                    )}
                  </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <h2 className="text-lg font-extrabold text-slate-900">
                  Thông tin cần chuẩn bị
                </h2>

                {Array.isArray(service.requirements) &&
                service.requirements.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {service.requirements.map((field, index) => (
                      <li
                        key={field.key ?? index}
                        className="flex items-start gap-3 rounded-xl bg-blue-50/50 px-4 py-3 text-sm text-slate-700"
                      >
                        <span className="font-extrabold text-blue-600">
                          {index + 1}.
                        </span>
                        <span>
                          {field.label ?? field.key}
                          {field.required ? (
                            <span className="ml-1 text-red-500">*</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Dịch vụ này chưa yêu cầu thông tin bổ sung.
                  </p>
                )}
              </div>
            </section>

            <aside className="h-fit rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {service.pricing_type === 'quote'
                  ? 'Hình thức dịch vụ'
                  : 'Giá dịch vụ'}
              </p>

              <p className="mt-3 text-2xl font-extrabold text-blue-700">
                {service.pricing_type === 'quote'
                  ? 'Yêu cầu báo giá'
                  : money(service.price_vnd)}
              </p>

              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                Điền thông tin và xác nhận gửi yêu cầu. Chưa thực hiện thanh toán.
              </div>

              
            </aside>
          </div>
        ) : null}
      </main>
    </div>
  )
}
