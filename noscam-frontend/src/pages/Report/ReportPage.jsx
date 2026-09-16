import Container from '../../components/layout/Container'
import ReportForm from '../../components/report/ReportForm'

function ReportPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50/60 py-10 sm:py-16">
        <Container>
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold text-blue-600">
              Báo cáo cộng đồng
            </p>

            <h1 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Báo cáo trường hợp đáng ngờ
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:mt-4 sm:text-base sm:leading-7">
              Chia sẻ thông tin về giao dịch hoặc trường hợp đáng ngờ
              để hệ thống có thêm dữ liệu đối chiếu và hỗ trợ cộng đồng.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-white py-8 sm:py-16">
        <Container>
          <div className="mx-auto grid min-w-0 max-w-4xl gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <ReportForm />

            <aside className="space-y-4 sm:space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold text-slate-950">
                  Nên cung cấp gì?
                </h2>

                <ul className="mt-4 space-y-3 pl-4 text-sm leading-6 text-slate-500">
                  <li className="list-disc">
                    Thông tin dùng để liên hệ hoặc nhận tiền.
                  </li>
                  <li className="list-disc">
                    Nội dung trao đổi và diễn biến sự việc.
                  </li>
                  <li className="list-disc">
                    Thời gian và số tiền giao dịch.
                  </li>
                  <li className="list-disc">
                    Ảnh chụp hoặc bằng chứng liên quan.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                <h2 className="text-sm font-semibold text-slate-950">
                  Lưu ý
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Việc một thông tin được gửi báo cáo không đồng nghĩa
                  cá nhân hoặc tổ chức liên quan đã được xác định là
                  lừa đảo.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-950">
                  Bảo vệ thông tin
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Không gửi mật khẩu, mã OTP, mã PIN hoặc thông tin
                  đăng nhập tài khoản trong nội dung báo cáo.
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </>
  )
}

export default ReportPage