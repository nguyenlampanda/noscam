import { useState } from 'react'
import Container from '../layout/Container'

const scenarios = [
  {
    title: 'Giả danh công an',
    type: 'Giả mạo',
    description: 'Đe dọa liên quan đến vụ án và yêu cầu chuyển tiền để xác minh.',
    advice: 'Không chuyển tiền theo yêu cầu qua điện thoại. Chủ động xác minh với cơ quan có thẩm quyền.'
  },
  {
    title: 'Việc nhẹ lương cao',
    type: 'Tuyển dụng',
    description: 'Hứa hẹn thu nhập cao nhưng yêu cầu nạp tiền hoặc đặt cọc.',
    advice: 'Không nộp tiền để nhận việc. Kiểm tra thông tin doanh nghiệp và nhà tuyển dụng.'
  },
  {
    title: 'Shop online giả',
    type: 'Mua sắm',
    description: 'Giả mạo cửa hàng uy tín, sử dụng hình ảnh và đánh giá không đáng tin cậy.',
    advice: 'Kiểm tra thông tin người bán và ưu tiên phương thức thanh toán có bảo vệ người mua.'
  },
  {
    title: 'Link ngân hàng giả',
    type: 'Ngân hàng',
    description: 'Gửi đường link giả mạo để lấy thông tin đăng nhập và mã xác thực.',
    advice: 'Chỉ đăng nhập qua ứng dụng hoặc website chính thức. Không cung cấp mã OTP.'
  },
  {
    title: 'Đầu tư lợi nhuận cao',
    type: 'Đầu tư',
    description: 'Cam kết lợi nhuận bất thường và thúc giục người tham gia chuyển tiền.',
    advice: 'Cảnh giác với cam kết lợi nhuận chắc chắn. Xác minh giấy phép và thông tin pháp lý.'
  },
  {
    title: 'Chiếm đoạt mã OTP',
    type: 'Tài khoản',
    description: 'Giả danh nhân viên hỗ trợ hoặc người quen để xin mã xác thực.',
    advice: 'Không chia sẻ OTP, mật khẩu hay mã khôi phục với bất kỳ ai.'
  }
]

export default function ScamAwareness() {
  const [expanded, setExpanded] = useState(null)

  return (
    <section className="bg-slate-50 py-14 sm:py-20">
      <Container>
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-semibold text-blue-600">
            KIẾN THỨC AN TOÀN SỐ
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            6 chiêu trò lừa đảo bạn nên biết
          </h2>

          <p className="mt-4 text-slate-600">
            Tìm hiểu các tình huống thường gặp và cách phòng tránh
            trước khi giao dịch trực tuyến.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((item, index) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg"
            >
              <button
                type="button"
                aria-expanded={expanded === index}
                onClick={() => setExpanded(expanded === index ? null : index)}
                className="w-full p-6 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {item.type}
                  </span>
                  <span className="text-sm font-bold text-slate-300">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>

                <span className="mt-5 inline-block text-sm font-semibold text-blue-600">
                  {expanded === index ? 'Thu gọn −' : 'Cách phòng tránh →'}
                </span>
              </button>

              {expanded === index && (
                <div className="border-t border-blue-100 bg-blue-50 p-5">
                  <p className="text-xs font-bold uppercase text-blue-700">
                    Cách phòng tránh
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {item.advice}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>


      </Container>
    </section>
  )
}
