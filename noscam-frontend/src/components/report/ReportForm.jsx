import { useState } from 'react'

import EvidenceUpload from './EvidenceUpload'
import { banks, scamTypes } from '../../data/reportOptions'

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

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    console.log('Mock report:', formData)
  }

  const inputClass =
    'mt-2 h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:px-4'

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
            <option value="">Chọn loại sự việc</option>

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
            <option value="">Chọn ngân hàng</option>

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
            className="mt-2 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:px-4"
          />
        </div>

        <div className="sm:col-span-2">
          <EvidenceUpload />
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
          className="mt-6 h-12 w-full rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-600 sm:w-auto"
        >
          Gửi báo cáo
        </button>
      </div>
    </form>
  )
}

export default ReportForm