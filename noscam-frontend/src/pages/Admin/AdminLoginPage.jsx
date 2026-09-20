import { useState } from 'react'
import {
  Navigate,
  useNavigate,
} from 'react-router-dom'

import {
  adminService,
  getAdminToken,
} from '../../services/adminService'

function AdminLoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (getAdminToken()) {
    return (
      <Navigate
        to="/admin/reports"
        replace
      />
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      await adminService.login(email, password)

      navigate('/admin/reports', {
        replace: true,
      })
    } catch (err) {
      setError(
        err.message ||
          'Không thể đăng nhập. Vui lòng thử lại.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-white p-8 shadow-2xl">
        <div className="mb-8">
          <div className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            NoScam.vn
          </div>

          <h1 className="text-2xl font-bold text-slate-950">
            Đăng nhập quản trị
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Khu vực dành cho quản trị viên và kiểm duyệt viên.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="admin@noscam.vn"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Mật khẩu
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Nhập mật khẩu"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? 'Đang đăng nhập...'
              : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLoginPage