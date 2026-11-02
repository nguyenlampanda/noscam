import { useNoScamUI } from '../../components/ui/NoScamUI'
import { useEffect, useRef, useState } from 'react'
import exchangeService from '../../services/exchangeService'

const platforms = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
]

const platformLabels = Object.fromEntries(
  platforms.map(item => [item.value, item.label])
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


function PlatformDropdown({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const handlePointer = event => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKey = event => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const selected = platforms.find(item => item.value === value)

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={
          "flex min-h-11 w-full items-center justify-between gap-3 " +
          "rounded-xl border bg-white px-3.5 text-left text-sm " +
          "font-semibold text-slate-800 shadow-sm transition-all " +
          "hover:border-blue-300 focus:outline-none " +
          "disabled:cursor-not-allowed disabled:opacity-50 " +
          (open
            ? "border-blue-500 ring-4 ring-blue-100"
            : "border-slate-200")
        }
      >
        <span>{selected?.label || 'Chọn nền tảng'}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={
            "h-4 w-4 shrink-0 text-blue-600 transition-transform " +
            (open ? "rotate-180" : "")
          }
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Chọn nền tảng mạng xã hội"
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_35px_rgba(15,23,42,0.15)]"
        >
          {platforms.map(item => {
            const active = item.value === value

            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(item.value)
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
                className={
                  "flex w-full items-center justify-between " +
                  "rounded-lg px-3 py-2.5 text-left text-sm " +
                  "font-medium transition-colors " +
                  (active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50 hover:text-blue-600")
                }
              >
                <span>{item.label}</span>
                {active && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="h-4 w-4 text-blue-600"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ExchangeAccounts({ accounts, onRefresh }) {
  const { confirm, alert, notify } = useNoScamUI()

  const [platform, setPlatform] = useState('instagram')
  const [accountTab, setAccountTab] = useState('tiktok')
  const [account, setAccount] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')

  const activeAccounts = accounts
    .filter(item => item.is_active && item.platform === accountTab)
    .sort((a, b) =>
      a.platform.localeCompare(b.platform) ||
      (Number(a.priority) || 100) - (Number(b.priority) || 100) ||
      Number(a.id) - Number(b.id)
    )

  async function addAccount(event) {
    event.preventDefault()
    if (busy || busyId !== null || !account.trim()) return

    setBusy(true)
    setError('')

    try {
      await exchangeService.createAccount({
        platform,
        account: account.trim(),
      })

      setAccount('')

      try {
        await onRefresh()
      } catch {
        // Tài khoản đã được lưu; thông báo vẫn phải chính xác.
      }

      await alert(
        'Tài khoản mạng xã hội đã được thêm vào NoScam.vn.',
        'success'
      )
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      notify(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function changeRole(item, field, checked) {
    if (busy || busyId !== null) return
    setBusyId(item.id)
    setError('')
    try {
      await exchangeService.updateAccountRoles(item.id, {
        can_receive: field === 'can_receive' ? checked : Boolean(item.can_receive),
        can_perform: field === 'can_perform' ? checked : Boolean(item.can_perform),
      })
      await onRefresh()
      notify('Đã cập nhật quyền sử dụng tài khoản.', 'success')
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      notify(message, 'error')
    } finally {
      setBusyId(null)
    }
  }


  async function moveAccount(item, direction) {
    if (busy || busyId !== null) return

    setBusyId(item.id)
    setError('')

    try {
      await exchangeService.updateAccountRoles(item.id, {
        can_receive: Boolean(item.can_receive),
        can_perform: Boolean(item.can_perform),
        move_direction: direction,
      })
      await onRefresh()
      notify('Đã lưu thứ tự ưu tiên.', 'success')
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      notify(message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  function openEdit(item) {
    if (busy || busyId !== null) return

    setEditing(item)
    setEditValue(
      item.platform === 'facebook'
        ? item.profile_url || ''
        : item.username || ''
    )
    setError('')
  }

  async function saveEdit(event) {
    event.preventDefault()

    if (!editing || busyId !== null || !editValue.trim()) return

    setBusyId(editing.id)
    setError('')

    try {
      await exchangeService.updateAccount(editing.id, {
        account: editValue.trim(),
      })

      setEditing(null)
      setEditValue('')

      try {
        await onRefresh()
      } catch {
        // Thao tác cập nhật backend đã hoàn tất.
      }

      await alert(
        'Thông tin tài khoản đã được cập nhật thành công.',
        'success'
      )
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      notify(message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function removeAccount(item) {
    if (busy || busyId !== null) return

    const accepted = await confirm(
      `Xóa tài khoản ${item.username} khỏi danh sách sử dụng?\nLịch sử tương tác trước đó vẫn được giữ lại.`,
      'Xác nhận xóa tài khoản'
    )

    if (!accepted) return

    setBusyId(item.id)
    setError('')

    try {
      await exchangeService.disableAccount(item.id)

      try {
        await onRefresh()
      } catch {
        // Backend đã lưu thành công.
      }

      await alert(
        'Đã xóa tài khoản khỏi danh sách sử dụng.',
        'success'
      )
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      notify(message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-950">
          Tài khoản mạng xã hội
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Thêm và quản lý tài khoản Instagram, TikTok, Facebook.
          Không cần cung cấp mật khẩu.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        onSubmit={addAccount}
        className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[180px_1fr_auto]"
      >
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Nền tảng
          <PlatformDropdown
            value={platform}
            onChange={setPlatform}
            disabled={busy || busyId !== null}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          {platform === 'facebook'
            ? 'Liên kết hồ sơ'
            : 'Username hoặc liên kết hồ sơ'}
          <input
            value={account}
            onChange={event => setAccount(event.target.value)}
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
          disabled={busy || busyId !== null || !account.trim()}
          className="self-end rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Đang thêm...' : 'Thêm tài khoản'}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ['tiktok', 'TikTok'],
          ['threads', 'Threads'],
          ['facebook', 'Facebook'],
          ['instagram', 'Instagram'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setAccountTab(key)}
            className={
              'rounded-xl border px-4 py-2 text-sm font-semibold transition ' +
              (accountTab === key
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-blue-100 bg-white text-slate-700 hover:bg-blue-50')
            }
          >
            {label}
            <span className="ml-2 opacity-70">
              {accounts.filter(a => a.is_active && a.platform === key).length}
            </span>
          </button>
        ))}
      </div>

      {accountTab === 'threads' && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Threads chưa được hỗ trợ đầy đủ trong nhiệm vụ Exchange.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {activeAccounts.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            Bạn chưa có tài khoản mạng xã hội nào.
          </p>
        )}

        {activeAccounts.map(item => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm"
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
                className="mt-1 block break-all text-xs text-slate-500 underline hover:text-blue-600"
              >
                Xem hồ sơ ↗
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                {activeAccounts.findIndex(a => a.id === item.id) + 1}
              </span>
              <button
                type="button"
                disabled={busy || busyId !== null ||
                  activeAccounts.findIndex(a => a.id === item.id) === 0}
                onClick={() => moveAccount(item, 'up')}
                className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-40"
              >
                ↑ Đưa lên
              </button>
              <button
                type="button"
                disabled={busy || busyId !== null ||
                  activeAccounts.findIndex(a => a.id === item.id) === activeAccounts.length - 1}
                onClick={() => moveAccount(item, 'down')}
                className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-40"
              >
                ↓ Đưa xuống
              </button>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={Boolean(item.can_receive)}
                  disabled={busy || busyId !== null}
                  onChange={event => changeRole(item, 'can_receive', event.target.checked)} />
                Nhận tương tác
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={Boolean(item.can_perform)}
                  disabled={busy || busyId !== null}
                  onChange={event => changeRole(item, 'can_perform', event.target.checked)} />
                Đi tương tác
              </label>
              <button
                type="button"
                disabled={busy || busyId !== null}
                onClick={() => openEdit(item)}
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                Chỉnh sửa
              </button>

              <button
                type="button"
                disabled={busy || busyId !== null}
                onClick={() => removeAccount(item)}
                className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Chỉnh sửa tài khoản"
        >
          <form
            onSubmit={saveEdit}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-lg font-black text-slate-950">
                Chỉnh sửa tài khoản
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {platformLabels[editing.platform] || editing.platform}
              </p>
            </div>

            <div className="p-5">
              <label className="block text-sm font-semibold text-slate-700">
                Username hoặc liên kết hồ sơ
                <input
                  autoFocus
                  value={editValue}
                  onChange={event => setEditValue(event.target.value)}
                  maxLength={2048}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </label>
              <p className="mt-3 text-xs text-slate-500">
                Chỉ thay đổi tài khoản cùng nền tảng.
                Lịch sử tương tác đã ghi nhận được giữ nguyên.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => setEditing(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={busyId !== null || !editValue.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busyId !== null ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
