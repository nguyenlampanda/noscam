import NoScamSelect from '../../components/ui/NoScamSelect'
import { useNoScamUI } from '../../components/ui/NoScamUI'
import { useState } from 'react'
import exchangeService from '../../services/exchangeService'

const platforms = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
]

const platformLabels = Object.fromEntries(
  platforms.map((item) => [item.value, item.label]),
)

function errorMessage(error) {
  const data = error?.response?.data || error?.data
  const validation = data?.errors

  if (validation && typeof validation === 'object') {
    const first = Object.values(validation).flat()[0]
    if (typeof first === 'string') return first
  }

  return data?.message || error?.message || 'Thao tác thất bại.'
}

export default function ExchangeAccounts({ accounts, onRefresh }) {
  const { confirm } = useNoScamUI()
  const [platform, setPlatform] = useState('instagram')
  const [account, setAccount] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const activeAccounts = accounts.filter((item) => item.is_active)
  const inactiveAccounts = accounts.filter((item) => !item.is_active)

  async function addAccount(event) {
    event.preventDefault()
    if (busy || !account.trim()) return

    setBusy(true)
    setError('')
    setSuccess('')

    try {
      await exchangeService.createAccount({
        platform,
        account: account.trim(),
      })

      await onRefresh()
      setAccount('')
      setSuccess('Đã thêm tài khoản thành công.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function setDefault(item) {
    if (busyId !== null) return

    setBusyId(item.id)
    setError('')
    setSuccess('')

    try {
      await exchangeService.setDefaultAccount(item.id)
      await onRefresh()
      setSuccess('Đã cập nhật tài khoản mặc định.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function disable(item) {
    if (busyId !== null) return

    if (!await confirm(
      `Ngừng sử dụng tài khoản ${item.username}?`
    )) return

    setBusyId(item.id)
    setError('')
    setSuccess('')

    try {
      await exchangeService.disableAccount(item.id)
      await onRefresh()
      setSuccess('Đã ngừng sử dụng tài khoản.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-950">
          Tài khoản mạng xã hội
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Lưu tài khoản để thực hiện nhiệm vụ. Không cần cung cấp mật khẩu.
          Mỗi tài khoản chỉ được đăng ký cho một người dùng NoScam.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <form
        onSubmit={addAccount}
        className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[180px_1fr_auto]"
      >
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Nền tảng
          <NoScamSelect
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3"
          >
            {platforms.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </NoScamSelect>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          {platform === 'facebook' ? 'Liên kết hồ sơ' : 'Username hoặc liên kết hồ sơ'}
          <input
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            maxLength={2048}
            required
            placeholder={
              platform === 'facebook'
                ? 'https://www.facebook.com/username'
                : platform === 'instagram'
                  ? '@username hoặc https://www.instagram.com/username/'
                  : '@username hoặc https://www.tiktok.com/@username'
            }
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3"
          />
        </label>

        <button
          type="submit"
          disabled={busy || !account.trim()}
          className="self-end rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Đang lưu...' : 'Thêm tài khoản'}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {activeAccounts.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            Bạn chưa có tài khoản mạng xã hội đang hoạt động.
          </p>
        )}

        {activeAccounts.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                {platformLabels[item.platform] || item.platform}
              </p>
              <p className="mt-1 break-all font-bold text-slate-900">
                {item.username}
              </p>
              <a
                href={item.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all text-xs text-slate-500 underline"
              >
                Xem hồ sơ
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {item.is_default ? (
                <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                  Mặc định
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => setDefault(item)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50"
                >
                  Đặt mặc định
                </button>
              )}

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => disable(item)}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
              >
                Ngừng sử dụng
              </button>
            </div>
          </div>
        ))}
      </div>

      {inactiveAccounts.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-semibold text-slate-500">
            Tài khoản đã ngừng sử dụng ({inactiveAccounts.length})
          </p>

          {inactiveAccounts.map((item) => (
            <div key={item.id} className="py-2 text-sm text-slate-400">
              {platformLabels[item.platform] || item.platform}
              {' · '}
              {item.username}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
