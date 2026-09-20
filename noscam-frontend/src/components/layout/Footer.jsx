import { Link } from 'react-router-dom'

import Container from './Container'

const footerLinks = [
  { name: 'Cảnh báo', path: '/alerts' },
  { name: 'Hướng dẫn', path: '/guide' },
  { name: 'Giới thiệu', path: '/about' },
  { name: 'Báo cáo scam', path: '/report' },
]

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container>
        <div className="py-8 sm:py-10">
          <div className="flex flex-col gap-7 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <Link
                to="/"
                className="inline-flex text-lg font-bold tracking-tight text-slate-950"
              >
                NoScam<span className="text-blue-600">.vn</span>
              </Link>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Nền tảng hỗ trợ kiểm tra thông tin và đánh giá rủi ro
                trước khi giao dịch hoặc chuyển tiền.
              </p>
            </div>

            <nav className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
              {footerLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-7 border-t border-slate-200 pt-6 sm:mt-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <p className="max-w-3xl text-xs leading-5 text-slate-500">
                Risk Score chỉ mang tính cảnh báo dựa trên dữ liệu hệ thống,
                không phải kết luận một cá nhân hoặc tổ chức là lừa đảo.
              </p>

              <p className="shrink-0 text-xs text-slate-400">
                © {new Date().getFullYear()} NoScam.vn
              </p>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  )
}

export default Footer