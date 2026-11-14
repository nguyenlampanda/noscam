import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import customerService, { getCustomerToken } from '../../services/customerService'

const DAY = 24 * 60 * 60 * 1000
const EVENT = 'noscam-wallet-deposit-check'

function tokenKey(token) {
  // Chỉ dùng dấu vân tay để phân tách dữ liệu giữa các phiên đăng nhập.
  // Không lưu token vào khóa localStorage.
  let hash = 2166136261
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `noscam-deposit-seen-v1-${(hash >>> 0).toString(16)}`
}

function accountKey(userId) {
  return `noscam-deposit-seen-v2-user-${userId}`
}

function readSeen(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

export default function WalletDepositSuccessPopup() {
  const [deposit, setDeposit] = useState(null)
  const [storageKey, setStorageKey] = useState('')
  const busy = useRef(false)
  const showing = useRef(false)

  const checkDeposits = useCallback(async () => {
    if (busy.current || showing.current) return

    const token = getCustomerToken()
    if (!token) {
      setDeposit(null)
      return
    }

    busy.current = true
    try {
      const response = await customerService.transactions()
      const body = response?.data ?? response
      const transactions = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? body.data
          : []

      const profileResponse = await customerService.me()
      const profileBody = profileResponse?.data ?? profileResponse
      const userId = profileBody?.data?.user?.id ?? profileBody?.user?.id

      if (!userId || getCustomerToken() !== token) return

      const key = accountKey(userId)
      const legacyKey = tokenKey(token)
      const seen = new Set([
        ...readSeen(key).map(String),
        ...readSeen(legacyKey).map(String),
      ])

      // Lan dau chuyen sang lich su theo tai khoan:
      // danh dau cac giao dich hien co de khong thong bao lai.
      const initializedKey = `${key}-initialized`
      if (localStorage.getItem(initializedKey) !== '1') {
        const existingIds = transactions
          .filter(item => item?.type === 'deposit' && item?.direction === 'credit')
          .map(item => String(item.id))
          .filter(Boolean)

        localStorage.setItem(
          key,
          JSON.stringify([...new Set([...seen, ...existingIds])])
        )
        localStorage.setItem(initializedKey, '1')
        return
      }

      const now = Date.now()

      const latest = transactions
        .filter(item => {
          if (item?.type !== 'deposit' || item?.direction !== 'credit') {
            return false
          }

          if (!item.id || !Number.isFinite(Number(item.amount))) {
            return false
          }

          const created = Date.parse(item.created_at || '')
          if (!Number.isFinite(created)) return false

          const age = now - created
          return age >= 0 && age <= DAY && !seen.has(String(item.id))
        })
        .sort((a, b) => Number(b.id) - Number(a.id))[0]

      if (latest && getCustomerToken() === token) {
        try {
          const previous = readSeen(key).map(String)
          localStorage.setItem(
            key,
            JSON.stringify([...new Set([...previous, String(latest.id)])])
          )
        } catch {
          // Không làm gián đoạn website nếu trình duyệt chặn lưu trữ.
        }

        showing.current = true
        setStorageKey(key)
        setDeposit(latest)
      }
    } catch (error) {
      // Không làm gián đoạn website khi mạng hoặc API tạm thời lỗi.
      console.warn('Không kiểm tra được thông báo nạp tiền:', error)
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    const handleFocus = () => {
      if (!document.hidden) checkDeposits()
    }
    const handleVisibility = () => {
      if (!document.hidden) checkDeposits()
    }

    checkDeposits()
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener(EVENT, checkDeposits)

    // Phát hiện nạp tiền khi khách vẫn đang mở website.
    const interval = window.setInterval(checkDeposits, 30000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener(EVENT, checkDeposits)
      window.clearInterval(interval)
    }
  }, [checkDeposits])

  const acknowledge = () => {
    if (!deposit) return

    try {
      const previous = readSeen(storageKey)
      const next = [...new Set([...previous, String(deposit.id)])]
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // Vẫn cho phép đóng popup khi trình duyệt chặn localStorage.
    }

    showing.current = false
    setDeposit(null)
    window.setTimeout(checkDeposits, 100)
  }

  if (!deposit) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="noscam-deposit-success-title"
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-emerald-100 bg-white p-7 text-center shadow-2xl sm:p-9"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m7 12 3.5 3.5L17 9" />
          </svg>
        </div>

        <h2
          id="noscam-deposit-success-title"
          className="mt-5 text-2xl font-extrabold text-slate-950"
        >
          Nạp tiền thành công!
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Tài khoản của bạn đã được cộng tiền vào ví NoScam.vn.
        </p>

        <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Số tiền đã cộng
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-700">
            +{formatMoney(deposit.amount)}đ
          </p>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Mã giao dịch: {deposit.code || deposit.id}
        </p>

        <button
          type="button"
          onClick={acknowledge}
          className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-3.5 font-bold text-white transition hover:bg-blue-700"
        >
          Đã hiểu
        </button>
      </section>
    </div>,
    document.body
  )
}

export function requestWalletDepositCheck() {
  window.dispatchEvent(new Event(EVENT))
}
