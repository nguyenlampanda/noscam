import { Link } from 'react-router-dom'

import Container from '../../components/layout/Container'

const principles = [
  {
    number: '01',
    title: 'Dữ liệu hỗ trợ quyết định',
    description:
      'NoScam tổng hợp các tín hiệu để người dùng có thêm thông tin trước khi giao dịch.',
  },
  {
    number: '02',
    title: 'Không kết luận thay người dùng',
    description:
      'Risk Score và báo cáo cộng đồng là dữ liệu cảnh báo, không phải kết luận pháp lý về một cá nhân hoặc tổ chức.',
  },
  {
    number: '03',
    title: 'Kết nối thông tin liên quan',
    description:
      'Hệ thống hướng đến việc liên kết số điện thoại, tài khoản ngân hàng, website, mạng xã hội và các dữ liệu liên quan.',
  },
]

function AboutPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50/60 py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-semibold text-blue-600">
              Về NoScam.vn
            </p>

            <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-[-0.03em] text-slate-950 sm:text-5xl">
              Kiểm tra trước khi chuyển tiền
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              NoScam.vn được xây dựng với mục tiêu tạo một nơi tập trung
              để người dùng kiểm tra các thông tin liên quan đến giao dịch
              trước khi đưa ra quyết định.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <Container>
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Vấn đề
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                  Thông tin thường bị phân tán
                </h2>

                <p className="mt-5 text-base leading-7 text-slate-500">
                  Khi muốn kiểm tra một giao dịch, người dùng có thể phải
                  tìm số điện thoại ở một nơi, số tài khoản ở nơi khác,
                  rồi tiếp tục tìm website hoặc tài khoản mạng xã hội.
                </p>

                <p className="mt-4 text-base leading-7 text-slate-500">
                  NoScam hướng đến việc tập trung quá trình đó vào một
                  hệ thống tra cứu duy nhất.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Cách tiếp cận
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                  Một ô tìm kiếm, nhiều nguồn dữ liệu
                </h2>

                <p className="mt-5 text-base leading-7 text-slate-500">
                  Người dùng chỉ cần nhập thông tin cần kiểm tra. Hệ thống
                  hướng đến việc xác định loại dữ liệu, đối chiếu các nguồn
                  liên quan và trình bày những tín hiệu cần chú ý.
                </p>

                <p className="mt-4 text-base leading-7 text-slate-500">
                  Kết quả được trình bày dưới dạng Risk Score, báo cáo,
                  dữ liệu liên quan và các yếu tố ảnh hưởng đến mức cảnh báo.
                </p>
              </div>
            </div>

            <div className="mt-16 border-t border-slate-200 pt-14">
              <p className="text-sm font-semibold text-blue-600">
                Nguyên tắc
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                NoScam được xây dựng theo hướng nào?
              </h2>

              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {principles.map((item) => (
                  <div
                    key={item.number}
                    className="rounded-2xl border border-slate-200 p-6"
                  >
                    <span className="text-xs font-bold tracking-wider text-blue-600">
                      {item.number}
                    </span>

                    <h3 className="mt-6 text-lg font-semibold text-slate-950">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-16 rounded-3xl bg-slate-950 px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Kiểm tra trước khi giao dịch
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  Bắt đầu bằng cách kiểm tra thông tin bạn đang có hoặc
                  đóng góp dữ liệu khi gặp một trường hợp đáng ngờ.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
                <Link
                  to="/"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-blue-50"
                >
                  Kiểm tra ngay
                </Link>

                <Link
                  to="/report"
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Gửi báo cáo
                </Link>
              </div>
            </div>

            <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-slate-400">
              Risk Score chỉ mang tính cảnh báo dựa trên dữ liệu hệ thống,
              không phải kết luận một cá nhân hoặc tổ chức là lừa đảo.
            </p>
          </div>
        </Container>
      </section>
    </>
  )
}

export default AboutPage