import { useState } from 'react'

import EvidenceUpload from './EvidenceUpload'
import { banks, scamTypes } from '../../data/reportOptions'
import useReport from '../../hooks/useReport'

const initialForm = {
  scamType: '',
  phone: '',
  bankAccount: '',
  bank: '',
  social: '',
  website: '',
  description: '',
  lossAmount: '',
  occurredAt: '',
}

function ReportForm() {
  const [formData, setFormData] = useState(initialForm)
  const [evidences, setEvidences] = useState([])

  const {
    status,
    error,
    message,
    submitReport,
    reset,
  } = useReport()

  const isSubmitting = status === 'loading'
  const isSuccess = status === 'success'
  const isError = status === 'error'

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    if (isError) {
      reset()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const result = await submitReport({
      ...formData,
      evidences,
    })

    if (result) {
      setFormData(initialForm)
      setEvidences([])
    }
  }

  const handleCreateAnother = () => {
    reset()
    setFormData(initialForm)
    setEvidences([])
  }

  const inputClass =
    'mt-2 h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:px-4'

  if (isSuccess) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center sm:px-8 sm:py-16">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5 text-emerald-600"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m5 12 4 4L19 6"
            />
          </svg>
        </div>

        <h2 className="mt-5 text-lg font-semibold text-slate-950">
          Đã nhận báo cáo
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {message ||
            'NoScam đã ghi nhận báo cáo của bạn. Thông tin sẽ được sử dụng làm dữ liệu để đối chiếu và hỗ trợ quá trình đánh giá rủi ro.'}
        </p>

        <div className="mx-auto mt-6 max-w-md rounded-xl bg-slate-50 p-4 text-left">
          <p className="text-xs leading-5 text-slate-500">
            Việc tiếp nhận báo cáo không đồng nghĩa NoScam đã xác nhận
            cá nhân hoặc tổ chức được báo cáo có hành vi lừa đảo.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateAnother}
          className="mt-6 h-11 w-full rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 sm:w-auto"
        >
          Gửi báo cáo khác
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">
          Thông tin báo cáo
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Cung cấp những thông tin bạn biết. Bạn không bắt buộc phải có
          đầy đủ tất cả các trường bên dưới.
        </p>
      </div>

      {isError && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-red-700">
            Không thể gửi báo cáo
          </p>

          <p className="mt-1 text-xs leading-5 text-red-600">
            {error ||
              'Đã xảy ra lỗi trong quá trình gửi dữ liệu. Vui lòng kiểm tra lại và thử lần nữa.'}
          </p>
        </div>
      )}

      <fieldset
        disabled={isSubmitting}
        className="min-w-0"
      >
        <div className="mt-7 grid gap-5 sm:mt-8 sm:grid-cols-2 sm:gap-6">
          <div className="sm:col-span-2">
            <label
              htmlFor="scamType"
              className="text-sm font-semibold text-slate-900"
            >
              Loại sự việc
            </label>

            <select
              id="scamType"
              name="scamType"
              value={formData.scamType}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">
                Chọn loại sự việc
              </option>

              {scamTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="text-sm font-semibold text-slate-900"
            >
              Số điện thoại
            </label>

            <input
              id="phone"
              name="phone"
              type="text"
              inputMode="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Ví dụ: 0909123456"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="bankAccount"
              className="text-sm font-semibold text-slate-900"
            >
              Số tài khoản
            </label>

            <input
              id="bankAccount"
              name="bankAccount"
              type="text"
              inputMode="numeric"
              value={formData.bankAccount}
              onChange={handleChange}
              placeholder="Nhập số tài khoản"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="bank"
              className="text-sm font-semibold text-slate-900"
            >
              Ngân hàng
            </label>

            <select
              id="bank"
              name="bank"
              value={formData.bank}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">
                Chọn ngân hàng
              </option>

              {banks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="social"
              className="text-sm font-semibold text-slate-900"
            >
              Mạng xã hội
            </label>

            <input
              id="social"
              name="social"
              type="text"
              value={formData.social}
              onChange={handleChange}
              placeholder="Facebook, TikTok, Telegram, Zalo..."
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="website"
              className="text-sm font-semibold text-slate-900"
            >
              Website
            </label>

            <input
              id="website"
              name="website"
              type="text"
              inputMode="url"
              value={formData.website}
              onChange={handleChange}
              placeholder="Ví dụ: example.vn"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="lossAmount"
              className="text-sm font-semibold text-slate-900"
            >
              Số tiền thiệt hại
            </label>

            <input
              id="lossAmount"
              name="lossAmount"
              type="number"
              min="0"
              inputMode="numeric"
              value={formData.lossAmount}
              onChange={handleChange}
              placeholder="Nhập số tiền"
              className={inputClass}
            />

            <p className="mt-2 text-xs text-slate-400">
              Đơn vị: VNĐ
            </p>
          </div>

          <div>
            <label
              htmlFor="occurredAt"
              className="text-sm font-semibold text-slate-900"
            >
              Ngày xảy ra
            </label>

            <input
              id="occurredAt"
              name="occurredAt"
              type="date"
              value={formData.occurredAt}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="description"
              className="text-sm font-semibold text-slate-900"
            >
              Nội dung sự việc
            </label>

            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="7"
              placeholder="Mô tả quá trình liên hệ, giao dịch và những dấu hiệu khiến bạn nghi ngờ..."
              className="mt-2 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 sm:px-4"
            />
          </div>

          <div className="sm:col-span-2">
            <EvidenceUpload
              files={evidences}
              onChange={setEvidences}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="mt-7 border-t border-slate-200 pt-6 sm:mt-8">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              required
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
            />

            <span className="text-xs leading-5 text-slate-500">
              Tôi xác nhận thông tin cung cấp là đúng theo hiểu biết của
              mình và đồng ý rằng báo cáo này chỉ là một nguồn dữ liệu để
              NoScam xem xét, đối chiếu và đánh giá.
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-600 sm:w-auto"
          >
            {isSubmitting && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white"
                aria-hidden="true"
              />
            )}

            {isSubmitting
              ? 'Đang gửi báo cáo...'
              : 'Gửi báo cáo'}
          </button>
        </div>
      </fieldset>
    </form>
  )
}

export default ReportForm