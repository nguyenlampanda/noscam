import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import customerService from '../services/customerService'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.from
  const safeReturnTo =
    typeof returnTo === 'string' &&
    /^\/digital-services\/\d+$/.test(returnTo)
      ? returnTo
      : '/social-services'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await customerService.login(
        username,
        password,
      )

      navigate(safeReturnTo, { replace: true })
    } catch (err) {
      setError(
        err?.message ||
          'Đăng nhập thất bại.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-50 px-5 py-16">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-950/5"
      >
        <div className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
          NoScam.vn
        </div>

        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Đăng nhập
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Đăng nhập để sử dụng ví và quản lý đơn hàng.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          className="mt-7 space-y-4"
        >
          <input
            required
            autoComplete="username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="Username"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
          />

          <input
            type="password"
            required
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Mật khẩu"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
          />

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 font-black text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {loading
              ? 'Đang đăng nhập...'
              : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            state={location.state}
            className="font-black text-blue-600"
          >
            Đăng ký
          </Link>
        </p>
      </motion.div>
    </main>
  )
}
