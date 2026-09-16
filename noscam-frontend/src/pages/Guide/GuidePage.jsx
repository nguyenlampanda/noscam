import { Link } from 'react-router-dom'

import Container from '../../components/layout/Container'

const warningSigns = [
  {
    number: '01',
    title: 'Thúc giục chuyển tiền',
    description:
      'Liên tục tạo cảm giác khẩn cấp, yêu cầu đặt cọc hoặc chuyển khoản ngay để giữ ưu đãi.',
  },
  {
    number: '02',
    title: 'Yêu cầu cung cấp OTP',
    description:
      'Yêu cầu gửi mã OTP, mật khẩu, mã PIN hoặc thông tin đăng nhập tài khoản.',
  },
  {
    number: '03',
    title: 'Thông tin không nhất quán',
    description:
      'Tên người nhận, số tài khoản, số điện thoại, website hoặc thông tin người bán không khớp nhau.',
  },
  {
    number: '04',
    title: 'Ưu đãi bất thường',
    description:
      'Giá bán, lợi nhuận hoặc quyền lợi hấp dẫn hơn đáng kể so với thông tin thông thường trên thị trường.',
  },
  {
    number: '05',
    title: 'Yêu cầu trả phí trước',
    description:
      'Yêu cầu đóng phí để nhận việc, nhận thưởng, rút tiền, nhận khoản vay hoặc mở khóa tài khoản.',
  },
  {
    number: '06',
    title: 'Đường dẫn đáng ngờ',
    description:
      'Gửi website hoặc đường dẫn có tên miền lạ, gần giống thương hiệu thật hoặc yêu cầu đăng nhập.',
  },
]

const safetySteps = [
  'Kiểm tra số điện thoại, số tài khoản, website hoặc tài khoản mạng xã hội trước khi giao dịch.',
  'Đối chiếu tên người nhận tiền và thông tin người bán từ nhiều nguồn.',
  'Không cung cấp OTP, mật khẩu, mã PIN hoặc mã xác thực cho người khác.',
  'Không vội chuyển tiền khi bị thúc giục hoặc tạo áp lực về thời gian.',
  'Lưu lại tin nhắn, hóa đơn và thông tin giao dịch khi phát hiện dấu hiệu bất thường.',
]

function GuidePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50/60 py-14 sm:py-16">
        <Container>
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-semibold text-blue-600">
              Kiến thức an toàn
            </p>

            <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Nhận biết dấu hiệu đáng ngờ trước khi chuyển tiền
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
              Một vài phút kiểm tra thông tin có thể giúp bạn phát hiện
              những tín hiệu bất thường trước khi thực hiện giao dịch.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-5xl">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Dấu hiệu cần chú ý
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Những tình huống thường cần kiểm tra kỹ
              </h2>
            </div>

            <div className="mt-8 grid overflow-hidden rounded-2xl border border-slate-200 sm:grid-cols-2 lg:grid-cols-3">
              {warningSigns.map((item) => (
                <div
                  key={item.number}
                  className="min-h-56 border-b border-r border-slate-200 p-6"
                >
                  <span className="text-xs font-semibold tracking-wider text-blue-600">
                    {item.number}
                  </span>

                  <h3 className="mt-7 text-lg font-semibold text-slate-950">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_0.75fr]">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Trước khi giao dịch
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  5 bước nên thực hiện
                </h2>

                <div className="mt-7">
                  {safetySteps.map((step, index) => (
                    <div
                      key={step}
                      className="flex gap-4 border-b border-slate-200 py-5 first:pt-0"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                        {index + 1}
                      </span>

                      <p className="pt-1 text-sm leading-6 text-slate-600">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 p-7 text-white">
                <p className="text-sm font-semibold text-blue-400">
                  Trước khi chuyển tiền
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Kiểm tra thông tin trên NoScam
                </h2>

                <p className="mt-4 text-sm leading-6 text-slate-300">
                  Tra cứu số điện thoại, tài khoản ngân hàng, website
                  hoặc tài khoản mạng xã hội để xem những dữ liệu hệ
                  thống đang ghi nhận.
                </p>

                <Link
                  to="/"
                  className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-50"
                >
                  Kiểm tra ngay
                </Link>

                <p className="mt-6 border-t border-slate-800 pt-5 text-xs leading-5 text-slate-400">
                  Không tìm thấy cảnh báo không đồng nghĩa với việc giao
                  dịch chắc chắn an toàn. Hãy tiếp tục đối chiếu thông tin
                  trước khi chuyển tiền.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

export default GuidePage