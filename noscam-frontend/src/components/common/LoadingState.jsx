function LoadingState({
  title = 'Đang kiểm tra thông tin',
  description = 'NoScam đang đối chiếu dữ liệu và tổng hợp các tín hiệu liên quan.',
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center sm:px-8 sm:py-16">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      </div>

      <h2 className="mt-5 text-base font-semibold text-slate-950 sm:text-lg">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mx-auto mt-7 max-w-md space-y-3">
        <div className="h-3 animate-pulse rounded-full bg-slate-100" />

        <div className="mx-auto h-3 w-4/5 animate-pulse rounded-full bg-slate-100" />

        <div className="mx-auto h-3 w-3/5 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  )
}

export default LoadingState