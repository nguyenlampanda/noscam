function SearchSummary({ query, result }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="p-5 sm:border-b sm:border-slate-200 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
          Nội dung đã tìm kiếm
        </p>

        <p className="mt-2 break-all text-lg font-semibold text-slate-950 sm:text-xl">
          {query}
        </p>

        <div className="mt-3 inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:hidden">
          {result.type}
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-slate-200 sm:border-t-0">
        <div className="hidden border-b border-r border-slate-200 p-6 sm:block">
          <p className="text-xs font-medium text-slate-400">
            Loại dữ liệu
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {result.type}
          </p>
        </div>

        <div className="border-b border-r border-slate-200 p-4 sm:border-r-0 sm:p-6">
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">
            Số báo cáo
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {result.reports} báo cáo
          </p>
        </div>

        <div className="border-b border-slate-200 p-4 sm:hidden">
          <p className="text-[11px] font-medium text-slate-400">
            Trạng thái
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {result.status}
          </p>
        </div>

        <div className="border-r border-slate-200 p-4 sm:p-6">
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">
            Phát hiện đầu tiên
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {result.firstDetected}
          </p>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">
            Báo cáo gần nhất
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {result.lastReport}
          </p>
        </div>
      </div>
    </div>
  )
}

export default SearchSummary