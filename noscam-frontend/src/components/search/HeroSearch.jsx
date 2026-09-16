import SearchBar from './SearchBar'

const searchableTypes = [
  'Số điện thoại',
  'Tài khoản ngân hàng',
  'Website',
  'Facebook',
  'TikTok',
  'Telegram',
  'Zalo',
  'Shop / người bán',
]

function HeroSearch() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 pb-14 pt-14 text-center sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-28">
        <div className="mx-auto mb-5 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 sm:mb-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 sm:text-xs sm:tracking-[0.16em]">
            Kiểm tra • Đánh giá rủi ro
          </span>
        </div>

        <h1 className="mx-auto max-w-3xl text-[38px] font-bold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
          Kiểm tra trước khi
          <span className="mt-1 block text-blue-600 sm:mt-0">
            chuyển tiền
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-6 text-slate-600 sm:mt-6 sm:text-lg sm:leading-7">
          Tra cứu thông tin trước khi giao dịch. NoScam tổng hợp dữ liệu
          cảnh báo và báo cáo từ cộng đồng để hỗ trợ bạn đánh giá rủi ro.
        </p>

        <div className="mx-auto mt-8 max-w-3xl sm:mt-10">
          <SearchBar />
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-x-4 gap-y-2 sm:mt-7 sm:gap-x-5">
          {searchableTypes.map((type) => (
            <span
              key={type}
              className="text-xs font-medium text-slate-500 sm:text-sm"
            >
              {type}
            </span>
          ))}
        </div>

        <p className="mx-auto mt-7 max-w-2xl text-[11px] leading-5 text-slate-400 sm:mt-8 sm:text-xs">
          Kết quả tra cứu chỉ mang tính chất tham khảo và hỗ trợ đánh giá
          rủi ro trước khi giao dịch.
        </p>
      </div>
    </section>
  )
}

export default HeroSearch