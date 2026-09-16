import Container from '../layout/Container'

const steps = [
  {
    number: '01',
    title: 'Nhập thông tin',
    description:
      'Nhập số điện thoại, số tài khoản, website, mạng xã hội hoặc thông tin bạn muốn kiểm tra.',
  },
  {
    number: '02',
    title: 'Đối chiếu dữ liệu',
    description:
      'NoScam đối chiếu thông tin với dữ liệu cảnh báo, báo cáo cộng đồng và các dữ liệu liên quan.',
  },
  {
    number: '03',
    title: 'Đánh giá rủi ro',
    description:
      'Xem Risk Score, số báo cáo, dữ liệu liên quan và các yếu tố cần lưu ý trước khi giao dịch.',
  },
]

function HowItWorks() {
  return (
    <section className="bg-white py-14 sm:py-24">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-blue-600">
            Đơn giản và nhanh chóng
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Cách NoScam hoạt động
          </h2>

          <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
            Một lần tìm kiếm giúp bạn tổng hợp các tín hiệu cần chú ý
            trước khi quyết định giao dịch.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white sm:h-10 sm:w-10">
                {step.number}
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-950 sm:mt-7 sm:text-xl">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 sm:mt-3">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 rounded-2xl bg-slate-50 p-5 sm:mt-10 sm:p-6">
          <p className="text-sm font-semibold leading-6 text-slate-950">
            Không tìm thấy báo cáo không đồng nghĩa với an toàn tuyệt đối.
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            NoScam cung cấp thêm dữ liệu để hỗ trợ quyết định của bạn.
            Hãy tiếp tục kiểm tra thông tin người nhận, nội dung giao dịch
            và các dấu hiệu bất thường trước khi chuyển tiền.
          </p>
        </div>
      </Container>
    </section>
  )
}

export default HowItWorks