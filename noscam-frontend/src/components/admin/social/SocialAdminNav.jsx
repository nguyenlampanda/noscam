import {
  NavLink,
} from 'react-router-dom'

const items = [
  {
    to: '/admin/social',
    label: 'Tổng quan',
    end: true,
  },
  {
    to: '/admin/social/services',
    label: 'Dịch vụ',
  },
  {
    to: '/admin/social/orders',
    label: 'Đơn hàng',
  },
  {
    to: '/admin/social/providers',
    label: 'Nhà cung cấp',
  },
  {
    to: '/admin/social/topups',
    label: 'Nạp tiền',
  },
]

export default function SocialAdminNav() {
  return (
    <div className="mt-6 overflow-x-auto">
      <div className="flex min-w-max gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
