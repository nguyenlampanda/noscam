import RiskBadge from './RiskBadge'

function RiskScore({
  score,
  label,
  level = 'medium',
}) {
  const normalizedScore = Math.min(
    100,
    Math.max(0, Number(score) || 0),
  )

  return (
    <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
        Mức độ rủi ro
      </p>

      <div className="mt-5 flex items-end gap-2 sm:mt-7">
        <span className="text-5xl font-bold tracking-tight sm:text-6xl">
          {normalizedScore}
        </span>

        <span className="mb-1.5 text-base text-slate-400 sm:mb-2 sm:text-lg">
          /100
        </span>
      </div>

      <div className="mt-4 sm:mt-5">
        <RiskBadge level={level}>
          {label}
        </RiskBadge>
      </div>

      <div className="mt-6 sm:mt-7">
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{
              width: `${normalizedScore}%`,
            }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[11px] text-slate-500 sm:text-xs">
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-300 sm:mt-6">
        Điểm số được tổng hợp từ các tín hiệu và dữ liệu mà hệ thống
        hiện ghi nhận.
      </p>

      <div className="mt-6 border-t border-slate-800 pt-5 sm:mt-7">
        <p className="text-xs leading-5 text-slate-400">
          Risk Score chỉ mang tính cảnh báo dựa trên dữ liệu hệ thống,
          không phải kết luận một cá nhân hoặc tổ chức là lừa đảo.
        </p>
      </div>
    </div>
  )
}

export default RiskScore