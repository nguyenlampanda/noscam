function ErrorState({
  title = 'Không thể tải dữ liệu',
  description = 'Đã xảy ra lỗi trong quá trình kết nối. Vui lòng thử lại sau.',
  onRetry,
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/40 px-5 py-10 text-center sm:px-8 sm:py-14">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5 text-red-600"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"
          />
        </svg>
      </div>

      <h2 className="mt-5 text-base font-semibold text-slate-950 sm:text-lg">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
        >
          Thử lại
        </button>
      )}
    </div>
  )
}

export default ErrorState