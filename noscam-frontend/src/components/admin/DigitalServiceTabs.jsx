import { NavLink } from 'react-router-dom'

export default function DigitalServiceTabs({ activeTab, onChange }) {
  const tabs = [
    { id: 'orders', label: 'Đơn dịch vụ số' },
    { id: 'services', label: 'Tạo dịch vụ' },
  ]

  return (
    <div className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
