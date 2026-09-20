import { Link } from 'react-router-dom'

function EmptyState({
  query,
  title = 'Chưa ghi nhận cảnh báo',
  description = 'Hiện tại hệ thống chưa ghi nhận báo cáo hoặc dữ liệu cảnh báo liên quan đến thông tin này.',
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center sm:px-8 sm:py-14">
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
        {title}
      </h2>

      {query && (
        <div className="mx-auto mt-4 max-w-md rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-400">
            Thông tin đã kiểm tra
          </p>

          <p className="mt-1 break-all text-sm font-semibold text-slate-950">
            {query}
          </p>
        </div>
      )}

      <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mx-auto mt-6 max-w-lg rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left">
        <p className="text-sm font-semibold text-slate-900">
          Điều này không có nghĩa là an toàn tuyệt đối.
        </p>

        <p className="mt-1.5 text-xs leading-5 text-slate-600">
          Dữ liệu của hệ thống có thể chưa đầy đủ hoặc trường hợp này
          chưa từng được báo cáo. Hãy tiếp tục xác minh thông tin trước
          khi chuyển tiền.
        </p>
      </div>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/"
          className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 sm:w-auto"
        >
          Kiểm tra thông tin khác
        </Link>

        <Link
          to="/report"
          className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
        >
          Gửi báo cáo
        </Link>
      </div>
    </div>
  )
}

export default EmptyState