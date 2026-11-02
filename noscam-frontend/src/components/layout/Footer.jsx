import { Link } from 'react-router-dom'
import Container from './Container'

const footerGroups = [
  {
    title: 'Tăng tương tác',
    links: [
      { name: 'Tạo đơn mới', path: '/' },
      { name: 'Đơn hàng của tôi', path: '/my-orders' },
      { name: 'Ví của tôi', path: '/wallet' },
      { name: 'Tương tác chéo', path: '/exchange' },
    ],
  },
  {
    title: 'CheckScam',
    links: [
      { name: 'Kiểm tra lừa đảo', path: '/search' },
      { name: 'Cảnh báo', path: '/alerts' },
      { name: 'Gửi báo cáo', path: '/report' },
      { name: 'Cộng đồng', path: '/community' },
    ],
  },
  {
    title: 'Thông tin & hỗ trợ',
    links: [
      { name: 'Hướng dẫn', path: '/guide' },
      { name: 'Giới thiệu', path: '/about' },
      { name: 'Trung gian', path: '/mediators' },
    ],
  },
]

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-gradient-to-b from-white to-blue-50">
      <Container>
        <div className="py-12 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_2fr]">
            <div>
              <Link
                to="/"
                className="text-2xl font-black tracking-tight text-slate-950"
              >
                NoScam<span className="text-blue-600">.vn</span>
              </Link>

              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">
                Dịch vụ tăng tương tác mạng xã hội và hỗ trợ
                kiểm tra rủi ro giao dịch trên một nền tảng.
              </p>

              <Link
                to="/"
                className="mt-6 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                Tạo đơn ngay →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {footerGroups.map((group) => (
                <nav key={group.title} aria-label={group.title}>
                  <h2 className="mb-5 text-sm font-black text-slate-950">
                    {group.title}
                  </h2>

                  <div className="flex flex-col gap-3">
                    {group.links.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="text-sm leading-6 text-slate-500 transition hover:text-blue-600"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </nav>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-xs leading-6 text-slate-500">
              Kết quả kiểm tra rủi ro chỉ mang tính cảnh báo,
              không phải kết luận một cá nhân hoặc tổ chức là lừa đảo.
            </p>

            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} NoScam.vn
            </p>
          </div>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
