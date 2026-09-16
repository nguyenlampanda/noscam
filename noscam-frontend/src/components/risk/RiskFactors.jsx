const severityStyles = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
}

function RiskFactors({ factors = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-950">
        Yếu tố ảnh hưởng Risk Score
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Các tín hiệu chính được hệ thống sử dụng để hỗ trợ đánh giá
        mức độ rủi ro của kết quả này.
      </p>

      <div className="mt-5 sm:mt-6">
        {factors.map((factor, index) => (
          <div
            key={factor.id}
            className={`flex gap-3 py-4 sm:gap-4 sm:py-5 ${
              index !== factors.length - 1
                ? 'border-b border-slate-200'
                : ''
            }`}
          >
            <div
              className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                severityStyles[factor.severity] ||
                severityStyles.medium
              }`}
            />

            <div className="min-w-0">
              <p className="text-sm font-semibold leading-6 text-slate-950">
                {factor.title}
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {factor.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RiskFactors