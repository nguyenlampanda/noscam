function SearchSummary({
  query,
  result,
}) {
  const displayValue =
    result.value || query

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="p-5 sm:border-b sm:border-slate-200 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
          Thông tin được tìm thấy
        </p>

        <p className="mt-2 break-all text-lg font-semibold text-slate-950 sm:text-xl">
          {displayValue}
        </p>

        {displayValue !== query && (
          <p className="mt-2 break-all text-xs text-slate-400">
            Từ khóa tìm kiếm: {query}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {formatEntityType(
              result.type,
            )}
          </span>

          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {result.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-slate-200 sm:border-t-0">
        <SummaryItem
          label="Loại dữ liệu"
          value={formatEntityType(
            result.type,
          )}
          className="hidden border-b border-r border-slate-200 sm:block"
        />

        <SummaryItem
          label="Số báo cáo"
          value={`${result.reports} báo cáo`}
          className="border-b border-r border-slate-200 sm:border-r-0"
        />

        <SummaryItem
          label="Trạng thái"
          value={result.status}
          className="border-b border-slate-200 sm:hidden"
        />

        <SummaryItem
          label="Phát hiện đầu tiên"
          value={
            result.firstDetected
          }
          className="border-r border-slate-200"
        />

        <SummaryItem
          label="Báo cáo gần nhất"
          value={
            result.lastReport
          }
        />
      </div>
    </div>
  )
}

function SummaryItem({
  label,
  value,
  className = '',
}) {
  return (
    <div
      className={`p-4 sm:p-6 ${className}`}
    >
      <p className="text-[11px] font-medium text-slate-400 sm:text-xs">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  )
}

function formatEntityType(type) {
  const labels = {
    phone:
      'Số điện thoại',

    bank_account:
      'Tài khoản ngân hàng',

    website:
      'Website',

    social:
      'Mạng xã hội',
  }

  return (
    labels[type] ||
    type ||
    'Không xác định'
  )
}

export default SearchSummary