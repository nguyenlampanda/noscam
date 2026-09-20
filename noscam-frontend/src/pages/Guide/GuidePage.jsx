import { Link } from 'react-router-dom'

import Container from '../../components/layout/Container'

const warningSigns = [
  {
    number: '01',
    title: 'Thúc giục chuyển tiền',
    description:
      'Liên tục tạo cảm giác khẩn cấp, yêu cầu chuyển tiền ngay hoặc cho rằng bạn sẽ mất cơ hội nếu chậm trễ.',
  },
  {
    number: '02',
    title: 'Yêu cầu OTP hoặc thông tin đăng nhập',
    description:
      'Yêu cầu cung cấp mã OTP, mật khẩu, mã PIN hoặc thông tin đăng nhập tài khoản ngân hàng.',
  },
  {
    number: '03',
    title: 'Thông tin không nhất quán',
    description:
      'Tên người nhận, số tài khoản, số điện thoại hoặc thông tin người bán không khớp với nội dung được giới thiệu.',
  },
  {
    number: '04',
    title: 'Ưu đãi bất thường',
    description:
      'Giá bán, lợi nhuận, phần thưởng hoặc quyền lợi hấp dẫn bất thường so với thông tin phổ biến trên thị trường.',
  },
  {
    number: '05',
    title: 'Yêu cầu đóng phí trước',
    description:
      'Yêu cầu nộp phí, đặt cọc, phí xác minh, phí mở khóa hoặc chuyển thêm tiền trước khi nhận được quyền lợi.',
  },
  {
    number: '06',
    title: 'Đường link đáng ngờ',
    description:
      'Đường dẫn có tên miền lạ, gần giống website chính thức hoặc yêu cầu đăng nhập và nhập thông tin nhạy cảm.',
  },
]

const safetySteps = [
  {
    number: '01',
    title: 'Kiểm tra thông tin',
    description:
      'Tra cứu số điện thoại, số tài khoản, website hoặc tài khoản mạng xã hội trước khi giao dịch.',
  },
  {
    number: '02',
    title: 'Đối chiếu nhiều nguồn',
    description:
      'Không chỉ dựa vào một bài đăng, ảnh chụp hoặc lời giới thiệu từ người đang giao dịch với bạn.',
  },
  {
    number: '03',
    title: 'Xác minh người nhận',
    description:
      'Kiểm tra tên chủ tài khoản, thông tin người bán và mục đích chuyển tiền trước khi xác nhận.',
  },
  {
    number: '04',
    title: 'Không chia sẻ thông tin bảo mật',
    description:
      'Không cung cấp OTP, mật khẩu, mã PIN hoặc quyền truy cập tài khoản cho người khác.',
  },
  {
    number: '05',
    title: 'Dừng lại khi có dấu hiệu bất thường',
    description:
      'Nếu thông tin chưa rõ ràng hoặc bị thúc giục, hãy tạm dừng giao dịch và kiểm tra thêm.',
  },
]

function GuidePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50/60 py-10 sm:py-16">
        <Container>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-blue-600">
              Kiến thức an toàn
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Nhận biết dấu hiệu đáng ngờ trước khi chuyển tiền
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:mt-5 sm:text-base sm:leading-7">
              Một vài bước kiểm tra đơn giản có thể giúp bạn phát hiện
              những tín hiệu cần chú ý trước khi thực hiện giao dịch.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-24">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-600">
              Dấu hiệu cần chú ý
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              6 dấu hiệu thường gặp
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500 sm:mt-4 sm:text-base sm:leading-7">
              Một dấu hiệu riêng lẻ chưa đủ để kết luận có lừa đảo,
              nhưng nhiều dấu hiệu xuất hiện cùng lúc là lý do để bạn
              kiểm tra kỹ hơn.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {warningSigns.map((item) => (
              <div
                key={item.number}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <span className="text-xs font-bold text-blue-600">
                  {item.number}
                </span>

                <h3 className="mt-4 text-base font-semibold text-slate-950 sm:text-lg">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-slate-50/60 py-14 sm:py-24">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Trước khi giao dịch
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                5 bước nên thực hiện
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
                Đừng chỉ kiểm tra xem thông tin có báo cáo hay không.
                Hãy kết hợp nhiều bước xác minh trước khi quyết định
                chuyển tiền.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {safetySteps.map((step, index) => (
                <div
                  key={step.number}
                  className={`flex gap-4 p-5 sm:gap-5 sm:p-6 ${
                    index !== safetySteps.length - 1
                      ? 'border-b border-slate-200'
                      : ''
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[11px] font-bold text-white sm:h-10 sm:w-10 sm:text-xs">
                    {step.number}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-6 text-slate-950 sm:text-base">
                      {step.title}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-24">
        <Container>
          <div className="rounded-2xl bg-slate-950 px-5 py-9 sm:rounded-3xl sm:px-10 sm:py-12 lg:px-14">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-blue-400">
                  Kiểm tra trước khi chuyển tiền
                </p>

                <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Có thông tin khiến bạn chưa yên tâm?
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                  Tra cứu thông tin trên NoScam để xem các dữ liệu cảnh báo,
                  báo cáo và tín hiệu liên quan mà hệ thống đang ghi nhận.
                </p>
              </div>

              <Link
                to="/"
                className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-50 sm:w-auto"
              >
                Kiểm tra ngay
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:mt-8 sm:p-6">
            <p className="text-sm font-semibold text-slate-950">
              Không có cảnh báo không đồng nghĩa với an toàn tuyệt đối.
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
              Dữ liệu có thể chưa đầy đủ hoặc chưa được hệ thống ghi nhận.
              Kết quả tra cứu và Risk Score chỉ hỗ trợ đánh giá rủi ro,
              không phải kết luận một cá nhân hoặc tổ chức là lừa đảo.
            </p>
          </div>
        </Container>
      </section>
    </>
  )
}

export default GuidePage