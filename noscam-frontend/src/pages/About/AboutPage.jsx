import { Link } from 'react-router-dom'

import Container from '../../components/layout/Container'

const principles = [
  {
    number: '01',
    title: 'Dữ liệu hỗ trợ quyết định',
    description:
      'NoScam tổng hợp các tín hiệu, báo cáo và dữ liệu liên quan để người dùng có thêm thông tin trước khi giao dịch.',
  },
  {
    number: '02',
    title: 'Không kết luận thay người dùng',
    description:
      'Risk Score và dữ liệu cảnh báo chỉ hỗ trợ đánh giá rủi ro, không tự động kết luận một cá nhân hoặc tổ chức là lừa đảo.',
  },
  {
    number: '03',
    title: 'Kết nối thông tin liên quan',
    description:
      'Một kết quả có thể liên quan đến số điện thoại, tài khoản ngân hàng, website, mạng xã hội hoặc người bán khác.',
  },
]

function AboutPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50/60 py-12 sm:py-20">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold text-blue-600">
              Về NoScam.vn
            </p>

            <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-[-0.03em] text-slate-950 sm:text-5xl sm:leading-tight">
              Kiểm tra trước khi
              <span className="block text-blue-600">
                chuyển tiền
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-slate-500 sm:mt-6 sm:text-lg sm:leading-8">
              NoScam.vn được xây dựng với mục tiêu giúp người dùng có thêm
              dữ liệu để kiểm tra thông tin và nhận biết các tín hiệu rủi ro
              trước khi thực hiện giao dịch.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-24">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Vấn đề
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Thông tin thường bị phân tán
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
                Trước một giao dịch, người dùng có thể phải tự tìm số điện
                thoại ở một nơi, số tài khoản ở nơi khác, sau đó tiếp tục
                kiểm tra website hoặc mạng xã hội.
              </p>

              <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
                Việc dữ liệu nằm ở nhiều nguồn khác nhau khiến quá trình
                kiểm tra mất thời gian và dễ bỏ sót những thông tin có liên
                quan.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Ví dụ một lần kiểm tra
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-400">
                    Số điện thoại
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-950">
                    0909123456
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-400">
                    Tài khoản ngân hàng
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-950">
                    1234567821
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-400">
                    Mạng xã hội
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-950">
                    facebook.com/abcshop
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-slate-50/60 py-14 sm:py-24">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Cách tiếp cận
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Một ô tìm kiếm, nhiều nguồn dữ liệu
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
                Thay vì yêu cầu người dùng chọn từng công cụ riêng,
                NoScam hướng tới việc nhận diện loại dữ liệu từ nội dung
                được nhập và tổng hợp các thông tin liên quan vào cùng
                một kết quả.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                NoScam
              </p>

              <div className="mt-5 rounded-xl bg-white px-4 py-4 text-sm text-slate-500">
                Nhập SĐT, STK, website, Facebook...
              </div>

              <div className="my-5 flex justify-center">
                <span className="text-xl text-slate-500">
                  ↓
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-400">
                    Báo cáo
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Cộng đồng
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-400">
                    Tín hiệu
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Rủi ro
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-400">
                    Dữ liệu
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Liên quan
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-24">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-600">
              Nguyên tắc
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Cách NoScam trình bày dữ liệu
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:mt-12 lg:grid-cols-3 lg:gap-6">
            {principles.map((principle) => (
              <div
                key={principle.number}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
              >
                <span className="text-xs font-bold text-blue-600">
                  {principle.number}
                </span>

                <h3 className="mt-5 text-lg font-semibold text-slate-950 sm:mt-6 sm:text-xl">
                  {principle.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white pb-14 sm:pb-24">
        <Container>
          <div className="rounded-2xl bg-slate-950 px-5 py-9 sm:rounded-3xl sm:px-10 sm:py-12 lg:px-14">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-blue-400">
                  NoScam.vn
                </p>

                <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Kiểm tra thông tin trước khi giao dịch
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                  Tra cứu thông tin hoặc đóng góp báo cáo để cộng đồng
                  có thêm dữ liệu tham khảo.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link
                  to="/"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-50 sm:w-auto"
                >
                  Kiểm tra ngay
                </Link>

                <Link
                  to="/report"
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-semibold text-white transition-colors hover:border-slate-500 hover:bg-slate-900 sm:w-auto"
                >
                  Gửi báo cáo
                </Link>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-800 pt-5 sm:mt-10 sm:pt-6">
              <p className="max-w-3xl text-xs leading-5 text-slate-400">
                Risk Score chỉ mang tính cảnh báo dựa trên dữ liệu hệ thống,
                không phải kết luận một cá nhân hoặc tổ chức là lừa đảo.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

export default AboutPage