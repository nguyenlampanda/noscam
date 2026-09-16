import Container from '../layout/Container'
import { checkTypes } from '../../data/checkTypes'

function CheckTypes() {
  return (
    <section className="border-y border-slate-200 bg-slate-50/60 py-14 sm:py-24">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-blue-600">
            Một nơi để kiểm tra
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            NoScam kiểm tra được những gì?
          </h2>

          <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
            Bạn không cần chọn công cụ riêng cho từng loại thông tin.
            Chỉ cần nhập dữ liệu vào ô tìm kiếm, hệ thống sẽ xác định
            loại thông tin và tìm các dữ liệu liên quan.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white lg:grid-cols-4">
          {checkTypes.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:bg-slate-50 sm:min-h-52 sm:rounded-none sm:border-0 sm:border-b sm:border-r sm:p-6"
            >
              <span className="text-xs font-semibold tracking-wider text-blue-600">
                {item.id}
              </span>

              <h3 className="mt-5 text-base font-semibold text-slate-950 sm:mt-8 sm:text-lg">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 sm:mt-3">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 border-l-2 border-blue-600 pl-4 sm:mt-8 sm:pl-5">
          <p className="text-sm font-semibold text-slate-900">
            Một ô tìm kiếm cho tất cả
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Ví dụ: bạn có thể nhập trực tiếp số điện thoại, số tài khoản,
            tên miền hoặc đường dẫn Facebook. NoScam sẽ xử lý loại dữ liệu
            ở phía hệ thống thay vì bắt bạn chọn trước.
          </p>
        </div>
      </Container>
    </section>
  )
}

export default CheckTypes