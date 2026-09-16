import { Link } from 'react-router-dom'
import Container from './Container'

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              to="/"
              className="text-lg font-bold tracking-tight text-slate-950"
            >
              NoScam<span className="text-blue-600">.vn</span>
            </Link>

            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
              Nền tảng hỗ trợ kiểm tra thông tin và đánh giá rủi ro
              trước khi giao dịch hoặc chuyển tiền.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link
              to="/alerts"
              className="text-slate-500 hover:text-slate-950"
            >
              Cảnh báo
            </Link>

            <Link
              to="/guide"
              className="text-slate-500 hover:text-slate-950"
            >
              Hướng dẫn
            </Link>

            <Link
              to="/about"
              className="text-slate-500 hover:text-slate-950"
            >
              Giới thiệu
            </Link>

            <Link
              to="/report"
              className="text-slate-500 hover:text-slate-950"
            >
              Báo cáo scam
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-xs leading-5 text-slate-500">
            Risk Score chỉ mang tính cảnh báo dựa trên dữ liệu hệ thống,
            không phải kết luận một cá nhân hoặc tổ chức là lừa đảo.
          </p>

          <p className="mt-2 text-xs text-slate-400">
            © {new Date().getFullYear()} NoScam.vn
          </p>
        </div>
      </Container>
    </footer>
  )
}

export default Footer