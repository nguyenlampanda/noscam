import { useState } from 'react'
import AdminNav from '../../components/admin/AdminNav'
import AdminDigitalOrdersPage from './AdminDigitalOrdersPage'
import AdminDigitalServicesPage from './AdminDigitalServicesPage'

export default function AdminDigitalTabsPage() {
  const [activeTab, setActiveTab] = useState('orders')

  const tabItems = [
    { id: 'orders', label: 'Danh sách đơn hàng' },
    { id: 'list', label: 'Danh sách dịch vụ' },
    { id: 'create', label: 'Tạo dịch vụ' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
            DIGITAL SERVICES
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Dịch vụ số
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Quản lý đơn hàng và các dịch vụ số trên NoScam.vn.
          </p>
        </div>

        <div className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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

        {activeTab === 'orders' ? (
          <AdminDigitalOrdersPage />
        ) : (
          <AdminDigitalServicesPage
            activeTab={activeTab}
            onNavigateTab={setActiveTab}
          />
        )}
      </main>
    </div>
  )
}
