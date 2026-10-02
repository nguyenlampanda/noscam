import { motion } from 'motion/react'

function SearchSummary({
  query,
  result,
}) {
  const displayValue =
    result.value || query

  const type =
    result.typeLabel ||
    formatEntityType(result.type)

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
            {type}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            Dữ liệu hệ thống
          </span>
        </div>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
          Thông tin được tìm thấy
        </p>

        <p className="mt-2 break-all text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
          {displayValue}
        </p>

        {result.normalizedValue &&
          result.normalizedValue !==
            displayValue && (
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] text-slate-400">
                Dữ liệu chuẩn hóa
              </p>

              <p className="mt-1 break-all text-xs font-semibold text-slate-600">
                {
                  result.normalizedValue
                }
              </p>
            </div>
          )}

        {displayValue !== query && (
          <p className="mt-3 break-all text-xs text-slate-400">
            Từ khóa đã nhập: {query}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 border-t border-slate-100">
        <SummaryItem
          label="Số báo cáo"
          value={`${result.reports ?? 0} báo cáo`}
        />

        <SummaryItem
          label="Mức cảnh báo"
          value={
            result.riskLabel ||
            result.status ||
            '—'
          }
          right
        />

        <SummaryItem
          label="Phát hiện đầu tiên"
          value={
            result.firstDetected ||
            'Chưa có'
          }
          bottom
        />

        <SummaryItem
          label="Báo cáo gần nhất"
          value={
            result.lastReport ||
            'Chưa có'
          }
          right
          bottom
        />
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
        <p className="text-xs leading-5 text-slate-500">
          Số báo cáo thể hiện dữ liệu mà
          NoScam hiện ghi nhận, không phải
          số người độc lập đã xác nhận.
        </p>
      </div>
    </motion.section>
  )
}

function SummaryItem({
  label,
  value,
  right = false,
  bottom = false,
}) {
  return (
    <div
      className={[
        'p-4 sm:p-5',
        !right
          ? 'border-r border-slate-100'
          : '',
        !bottom
          ? 'border-b border-slate-100'
          : '',
      ].join(' ')}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  )
}

function formatEntityType(type) {
  const labels = {
    phone: 'Số điện thoại',
    bank_account:
      'Tài khoản ngân hàng',
    website: 'Website',
    social: 'Mạng xã hội',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    telegram: 'Telegram',
    zalo: 'Zalo',
  }

  return (
    labels[type] ||
    type ||
    'Không xác định'
  )
}

export default SearchSummary