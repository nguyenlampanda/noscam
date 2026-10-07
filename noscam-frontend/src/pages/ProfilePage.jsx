import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'
import customerService from '../services/customerService'

export default function ProfilePage() {
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
  })

  const [passwordForm, setPasswordForm] =
    useState({
      current_password: '',
      password: '',
      password_confirmation: '',
    })

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [changing, setChanging] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  useEffect(() => {
    let active = true

    customerService
      .profile()
      .then((response) => {
        if (!active) return

        const user =
          response?.data || {}

        setForm({
          username:
            user.username || '',
          name:
            user.name || '',
          email:
            user.email || '',
        })
      })
      .catch((err) => {
        if (active) {
          setError(err.message)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  function update(
    key,
    value,
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function updatePassword(
    key,
    value,
  ) {
    setPasswordForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    )
  }

  async function saveProfile(
    event,
  ) {
    event.preventDefault()

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response =
        await customerService.updateProfile({
          name:
            form.name.trim() ||
            null,
          email:
            form.email.trim() ||
            null,
        })

      const user =
        response?.data || {}

      setForm((current) => ({
        ...current,
        name:
          user.name || '',
        email:
          user.email || '',
      }))

      setSuccess(
        'Đã cập nhật thông tin tài khoản.',
      )

      window.dispatchEvent(
        new Event(
          'noscam-customer-updated',
        ),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(
    event,
  ) {
    event.preventDefault()

    setChanging(true)
    setError('')
    setSuccess('')

    try {
      await customerService.changePassword(
        passwordForm,
      )

      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      })

      setSuccess(
        'Đổi mật khẩu thành công.',
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setChanging(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-5 py-16 text-center text-slate-400">
        Đang tải thông tin...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Tài khoản
          </div>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Thông tin tài khoản
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Username dùng để đăng nhập.
            Email có thể bổ sung sau.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-700">
            {success}
          </div>
        )}

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <motion.form
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            onSubmit={saveProfile}
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-xl font-black">
              Thông tin cá nhân
            </h2>

            <label className="mt-6 block text-sm font-bold">
              Username
            </label>

            <input
              disabled
              value={form.username}
              className="mt-2 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
            />

            <p className="mt-2 text-xs text-slate-400">
              Username hiện không thể thay đổi.
            </p>

            <label className="mt-5 block text-sm font-bold">
              Tên hiển thị
            </label>

            <input
              value={form.name}
              onChange={(e) =>
                update(
                  'name',
                  e.target.value,
                )
              }
              placeholder="Tên của bạn"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
            />

            <label className="mt-5 block text-sm font-bold">
              Email
            </label>

            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                update(
                  'email',
                  e.target.value,
                )
              }
              placeholder="Email (không bắt buộc)"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
            />

            <button
              disabled={saving}
              className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3.5 font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? 'Đang lưu...'
                : 'Lưu thông tin'}
            </button>
          </motion.form>

          <motion.form
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.08,
            }}
            onSubmit={
              changePassword
            }
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-xl font-black">
              Đổi mật khẩu
            </h2>

            <input
              type="password"
              required
              value={
                passwordForm.current_password
              }
              onChange={(e) =>
                updatePassword(
                  'current_password',
                  e.target.value,
                )
              }
              placeholder="Mật khẩu hiện tại"
              className="mt-6 w-full rounded-2xl border border-slate-200 px-4 py-3"
            />

            <input
              type="password"
              required
              minLength="8"
              value={
                passwordForm.password
              }
              onChange={(e) =>
                updatePassword(
                  'password',
                  e.target.value,
                )
              }
              placeholder="Mật khẩu mới"
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
            />

            <input
              type="password"
              required
              minLength="8"
              value={
                passwordForm.password_confirmation
              }
              onChange={(e) =>
                updatePassword(
                  'password_confirmation',
                  e.target.value,
                )
              }
              placeholder="Nhập lại mật khẩu mới"
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
            />

            <button
              disabled={changing}
              className="mt-6 w-full rounded-2xl bg-slate-950 px-4 py-3.5 font-black text-white transition hover:bg-blue-600 disabled:opacity-50"
            >
              {changing
                ? 'Đang đổi...'
                : 'Đổi mật khẩu'}
            </button>
          </motion.form>
        </div>
      </div>
    </main>
  )
}
