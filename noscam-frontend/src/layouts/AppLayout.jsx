import { Outlet } from 'react-router-dom'

import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import CustomerChat from '../components/chat/CustomerChat'

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <CustomerChat />
    </div>
  )
}

export default AppLayout