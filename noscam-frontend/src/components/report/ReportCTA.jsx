import { Link } from 'react-router-dom'

import Container from '../layout/Container'

function ReportCTA() {
  return (
    <section className="bg-white pb-14 sm:pb-24">
      <Container>
        <div className="overflow-hidden rounded-2xl bg-slate-950 px-5 py-9 sm:rounded-3xl sm:px-10 sm:py-14 lg:px-14">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-blue-400">
                Cộng đồng cùng cảnh báo
              </p>

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">
                Bạn gặp một trường hợp đáng ngờ?
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                Gửi báo cáo để NoScam ghi nhận thông tin và hỗ trợ cộng đồng
                có thêm dữ liệu tham khảo trước khi giao dịch.
              </p>
            </div>

            <Link
              to="/report"
              className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-50 sm:w-auto"
            >
              Gửi báo cáo
            </Link>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-5 sm:mt-10 sm:pt-6">
            <p className="max-w-3xl text-xs leading-5 text-slate-400">
              Vui lòng cung cấp thông tin chính xác và bằng chứng liên quan.
              Báo cáo của người dùng là một nguồn dữ liệu tham khảo và sẽ
              không tự động được xem là kết luận về hành vi lừa đảo.
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default ReportCTA