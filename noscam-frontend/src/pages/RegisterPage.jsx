import { useState } from 'react'
import {
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import { motion } from 'motion/react'
import customerService from '../services/customerService'

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.from
  const safeReturnTo =
    typeof returnTo === 'string' &&
    /^\/digital-services\/\d+$/.test(returnTo)
      ? returnTo
      : '/social-services'

  const [form, setForm] = useState({
    username: '',
    password: '',
    password_confirmation: '',
  })

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await customerService.register(
        form,
      )

      navigate(safeReturnTo, { replace: true })
    } catch (err) {
      setError(
        err?.message ||
          'Đăng ký thất bại.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-50 px-5 py-16">
      <motion.div
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-950/5"
      >
        <div className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
          NoScam.vn
        </div>

        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Tạo tài khoản
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Chỉ cần username và mật khẩu.
          Thông tin cá nhân có thể cập nhật sau.
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
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Username
            </label>

            <input
              required
              minLength="3"
              maxLength="30"
              autoComplete="username"
              value={form.username}
              onChange={(e) =>
                update(
                  'username',
                  e.target.value,
                )
              }
              placeholder="Ví dụ: nguyenlam"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-slate-400">
              Dùng chữ, số, dấu chấm hoặc dấu gạch dưới.
            </p>
          </div>

          <input
            type="password"
            required
            minLength="8"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) =>
              update(
                'password',
                e.target.value,
              )
            }
            placeholder="Mật khẩu"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
          />

          <input
            type="password"
            required
            minLength="8"
            autoComplete="new-password"
            value={
              form.password_confirmation
            }
            onChange={(e) =>
              update(
                'password_confirmation',
                e.target.value,
              )
            }
            placeholder="Nhập lại mật khẩu"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
          />

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? 'Đang tạo tài khoản...'
              : 'Đăng ký'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Đã có tài khoản?{' '}
          <Link
            to="/login"
            state={location.state}
            className="font-black text-blue-600"
          >
            Đăng nhập
          </Link>
        </p>
      </motion.div>
    </main>
  )
}
