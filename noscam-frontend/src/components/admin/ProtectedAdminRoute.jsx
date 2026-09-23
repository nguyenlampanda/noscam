import {
  useEffect,
  useState,
} from 'react'

import {
  Navigate,
} from 'react-router-dom'

import {
  adminService,
  getAdminToken,
} from '../../services/adminService'

function ProtectedAdminRoute({
  children,
}) {
  const [status, setStatus] =
    useState(
      getAdminToken()
        ? 'checking'
        : 'guest',
    )

  useEffect(() => {
    let active = true

    if (!getAdminToken()) {
      setStatus('guest')

      return () => {
        active = false
      }
    }

    async function verify() {
      try {
        await adminService.me()

        if (active) {
          setStatus(
            'authenticated',
          )
        }
      } catch {
        if (active) {
          setStatus('guest')
        }
      }
    }

    verify()

    return () => {
      active = false
    }
  }, [])

  if (
    status === 'checking'
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-500 shadow-sm">
          Đang kiểm tra phiên
          đăng nhập...
        </div>
      </div>
    )
  }

  if (status === 'guest') {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    )
  }

  return children
}

export default ProtectedAdminRoute