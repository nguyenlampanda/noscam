import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import customerService from '../services/customerService'

const BANK = {
  name: 'Techcombank',
  bankId: 'TCB',
  accountNumber: '999321',
  accountName: 'NGUYEN LAM',
}

function money(value) {
  return `${Math.round(
    Number(value || 0),
  ).toLocaleString('vi-VN')}đ`
}

function CopyButton({
  value,
  children = 'Copy',
}) {
  const [copied, setCopied] =
    useState(false)

  async function copy() {
    await navigator.clipboard.writeText(
      String(value),
    )

    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 1500)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black transition hover:bg-blue-50 hover:text-blue-600"
    >
      {copied
        ? 'Đã copy'
        : children}
    </button>
  )
}

export default function WalletPage() {
  const [wallet, setWallet] =
    useState(null)

  const [user, setUser] =
    useState(null)

  const [
    transactions,
    setTransactions,
  ] = useState([])

  // NOSCAM_WALLET_HISTORY_PAGINATION_V2
  const [historyPage, setHistoryPage] = useState(1)
  const historyPageSize = 10

  const sortedHistory = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aTime = Date.parse(a.created_at || '') || 0
      const bTime = Date.parse(b.created_at || '') || 0

      if (aTime !== bTime) return bTime - aTime

      return Number(b.id || 0) - Number(a.id || 0)
    })
  }, [transactions])

  const historyTotalPages = Math.max(
    1,
    Math.ceil(sortedHistory.length / historyPageSize)
  )

  const safeHistoryPage = Math.min(
    historyPage,
    historyTotalPages
  )

  const visibleHistory = useMemo(() => {
    const start = (safeHistoryPage - 1) * historyPageSize

    return sortedHistory.slice(
      start,
      start + historyPageSize
    )
  }, [sortedHistory, safeHistoryPage])


  // NOSCAM_TOPUP_QR_V1
  const [amount, setAmount] =
    useState('')

  const [selectedBank, setSelectedBank] = useState('techcombank')

  const vietinUsername = String(user?.username || '').trim()
  const vietinContent = /^[a-zA-Z0-9_.-]{1,50}$/.test(vietinUsername)
    ? `NOSCAM ${vietinUsername}`
    : ''

  // Chỉ bật khi backend SePay đã kiểm thử và triển khai.
  const vietinReady = true

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const load =
    useCallback(async () => {
      setLoading(true)
      setError('')

      try {
        const [
          walletResponse,
          transactionResponse,
          meResponse,
        ] = await Promise.all([
          customerService.wallet(),
          customerService.transactions(),
          customerService.me(),
        ])

        setWallet(
          walletResponse?.data ||
            null,
        )

        setTransactions(
          transactionResponse?.data ||
            [],
        )

        setUser(
          meResponse?.data?.user ||
            null,
        )
      } catch (err) {
        setError(
          err?.message ||
            'Không tải được ví.',
        )
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    load()
  }, [load])

  const transferContent = vietinContent

  const numericAmount =
    Number(amount) || 0

  const qrUrl = useMemo(() => {
    if (
      !transferContent ||
      !Number.isInteger(numericAmount) ||
      numericAmount < 10000 ||
      numericAmount > 100000000
    ) return ''

    const bank = selectedBank === 'vietinbank'
      ? {
          bankId: 'ICB',
          accountNumber: '888838906789',
          accountName: 'NGUYEN LAM'
        }
      : BANK

    const params = new URLSearchParams({
      amount: String(numericAmount),
      addInfo: transferContent,
      accountName: bank.accountName
    })

    return `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNumber}-compact2.png?${params.toString()}`
  }, [numericAmount, transferContent, selectedBank])

  if (loading) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-5 py-16 text-center font-semibold text-slate-400">
        Đang tải ví...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/40 via-slate-50 to-white px-3 py-6 sm:px-5 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              NoScam Wallet
            </div>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Ví của tôi
            </h1>
          </div>

          <Link
            to="/my-orders"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black"
          >
            Đơn của tôi
          </Link>
        </div>


        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            [
              'Số dư',
              wallet?.balance,
            ],
            [
              'Đã nạp',
              wallet?.total_deposited,
            ],
            [
              'Đã chi',
              wallet?.total_spent,
            ],
            [
              'Hoàn tiền',
              wallet?.total_refunded,
            ],
          ].map(
            ([label, value]) => (
              <motion.div
                key={label}
                whileHover={{
                  y: -3,
                }}
                className="rounded-3xl border border-slate-200 bg-white p-5"
              >
                <div className="text-sm font-semibold text-slate-400">
                  {label}
                </div>

                <div className="mt-2 text-2xl font-black">
                  {money(value)}
                </div>
              </motion.div>
            ),
          )}
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedBank('techcombank')}
            className={`rounded-2xl border p-5 text-left transition ${
              selectedBank === 'techcombank'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-blue-200'
            }`}
          >
            <div className="text-base font-black text-slate-900">
              Techcombank
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Nạp tiền thủ công
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedBank('vietinbank')}
            className={`rounded-2xl border p-5 text-left transition ${
              selectedBank === 'vietinbank'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-black text-slate-900">
                VietinBank
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                TỰ ĐỘNG
              </span>
            </div>
            <div className="mt-1 text-sm font-semibold text-emerald-700">
              Nạp tiền tự động
            </div>
          </button>
        </div>

        {selectedBank === 'techcombank' ? (
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-black uppercase tracking-[0.15em] text-blue-600">
              Nạp tiền
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Nhập số tiền
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              QR chuyển khoản sẽ được tạo tự động.
            </p>

            <label className="mt-6 block text-sm font-bold">
              Số tiền muốn nạp
            </label>

            <div className="relative mt-2">
              <input
                type="number"
                min="10000"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                                    
                }}
                placeholder="100000"
                className="w-full rounded-2xl border border-slate-200 px-4 py-4 pr-12 text-xl font-black outline-none focus:border-blue-500"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                đ
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                50000,
                100000,
                200000,
              ].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAmount(String(value))
                                        
                  }}
                  className="rounded-xl bg-slate-50 px-2 py-3 text-xs font-black transition hover:bg-blue-50 hover:text-blue-600"
                >
                  {money(value)}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <div className="text-xs font-bold text-slate-400">
                    NGÂN HÀNG
                  </div>
                  <div className="mt-3 flex min-w-0 items-center gap-3 sm:gap-4">
                    {/* NOSCAM_PRIORITY_INLINE_V7 */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#211A18] shadow-lg shadow-slate-900/15 sm:h-16 sm:w-16">
                      <svg
                        viewBox="0 0 64 64"
                        className="h-11 w-11 sm:h-12 sm:w-12"
                        role="img"
                        aria-label="Biểu tượng Priority"
                      >
                        <defs>
                          <linearGradient
                            id="wallet-priority-gold-v7"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#F0D4AA" />
                            <stop offset="55%" stopColor="#D5B18A" />
                            <stop offset="100%" stopColor="#AE835F" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M5 32 23 14 41 32 23 50Z"
                          fill="url(#wallet-priority-gold-v7)"
                        />
                        <path
                          d="M23 32 41 14 59 32 41 50Z"
                          fill="url(#wallet-priority-gold-v7)"
                        />
                        <path
                          d="M23 32 32 23 41 32 32 41Z"
                          fill="#211A18"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <div className="text-base font-black text-slate-950 sm:text-lg">
                        Techcombank
                      </div>
                      <div className="mt-1 text-[10px] font-black tracking-[0.18em] text-[#A47B50] sm:text-xs">
                        PRIORITY MEMBER
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                <div>
                  <div className="text-xs font-bold text-slate-400">
                    SỐ TÀI KHOẢN
                  </div>

                  <div className="mt-1 text-xl font-black">
                    999321
                  </div>
                </div>

                <CopyButton
                  value="999321"
                >
                  Copy STK
                </CopyButton>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <div className="text-xs font-bold text-slate-400">
                    CHỦ TÀI KHOẢN
                  </div>

                  <div className="mt-1 font-black">
                    NGUYEN LAM
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div>
                  <div className="text-xs font-bold text-blue-500">
                    NỘI DUNG
                  </div>

                  <div className="mt-1 font-black text-blue-700">
                    {transferContent}
                  </div>
                </div>

                {transferContent && (
                  <CopyButton value={transferContent} />
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6">
            {qrUrl ? (
              <motion.div
                key={qrUrl}
                initial={{
                  opacity: 0,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                className="w-full text-center"
              >
                <div className="text-sm font-black uppercase tracking-[0.15em] text-blue-600">
                  Quét mã để chuyển khoản
                </div>

                <div className="mx-auto mt-5 max-w-[360px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-3 shadow-lg shadow-slate-950/5">
                  <img
                    src={qrUrl}
                    alt="QR chuyển khoản Techcombank"
                    className="w-full"
                  />
                </div>

                <div className="mt-5 text-3xl font-black text-blue-600">
                  {money(
                    numericAmount,
                  )}
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Techcombank • 999321
                </p>

                <p className="mt-1 text-sm font-bold text-slate-700">
                  {transferContent}
                </p>

                <div className="mx-auto mt-5 max-w-sm rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Kiểm tra đúng tên người nhận
                  <strong>
                    {' '}
                    NGUYEN LAM
                  </strong>{' '}
                  trước khi chuyển tiền.
                </div>
              </motion.div>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-4xl">
                  ▦
                </div>

                <h3 className="mt-5 text-xl font-black">
                  QR chuyển khoản
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Nhập số tiền từ 10.000đ để tạo QR.
                </p>
              </div>
            )}
          </div>
        </div>
        ) : (
          <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-black uppercase tracking-[0.15em] text-blue-600">
              Nạp tiền
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Nhập số tiền
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              QR chuyển khoản sẽ được tạo tự động.
            </p>

            <label className="mt-6 block text-sm font-bold">
              Số tiền muốn nạp
            </label>

            <div className="relative mt-2">
              <input
                type="number"
                min="10000"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                                    
                }}
                placeholder="100000"
                className="w-full rounded-2xl border border-slate-200 px-4 py-4 pr-12 text-xl font-black outline-none focus:border-blue-500"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                đ
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                50000,
                100000,
                200000,
              ].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAmount(String(value))
                                        
                  }}
                  className="rounded-xl bg-slate-50 px-2 py-3 text-xs font-black transition hover:bg-blue-50 hover:text-blue-600"
                >
                  {money(value)}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <div className="text-xs font-bold text-slate-400">
                    NGÂN HÀNG
                  </div>
                  <div className="mt-3 flex min-w-0 items-center gap-3 sm:gap-4">
                    {/* NOSCAM_VIETIN_ICON_V1 */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-100 sm:h-16 sm:w-16">
                      <svg
                        viewBox="0 0 64 64"
                        className="h-11 w-11 sm:h-12 sm:w-12"
                        role="img"
                        aria-label="Biểu tượng VietinBank"
                      >
                        <circle
                          cx="32"
                          cy="32"
                          r="27"
                          fill="#0066A6"
                        />
                        <path
                          d="M14 24 L25 43 L33 43 L44 24 L36 24 L29 36 L22 24 Z"
                          fill="white"
                        />
                        <circle
                          cx="45"
                          cy="18"
                          r="9"
                          fill="#E32736"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <div className="text-base font-black text-slate-950 sm:text-lg">
                        VietinBank
                      </div>
                      <div className="mt-1 text-[10px] font-black tracking-[0.18em] text-[#0066A6] sm:text-xs">
                        NẠP TIỀN TỰ ĐỘNG
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                <div>
                  <div className="text-xs font-bold text-slate-400">
                    SỐ TÀI KHOẢN
                  </div>

                  <div className="mt-1 text-xl font-black">
                    888838906789
                  </div>
                </div>

                <CopyButton
                  value="888838906789"
                >
                  Copy STK
                </CopyButton>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <div className="text-xs font-bold text-slate-400">
                    CHỦ TÀI KHOẢN
                  </div>

                  <div className="mt-1 font-black">
                    NGUYEN LAM
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div>
                  <div className="text-xs font-bold text-blue-500">
                    NỘI DUNG
                  </div>

                  <div className="mt-1 font-black text-blue-700">
                    {transferContent}
                  </div>
                </div>

                {transferContent && (
                  <CopyButton value={transferContent} />
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6">
            {qrUrl ? (
              <motion.div
                key={qrUrl}
                initial={{
                  opacity: 0,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                className="w-full text-center"
              >
                <div className="text-sm font-black uppercase tracking-[0.15em] text-blue-600">
                  Quét mã để chuyển khoản
                </div>

                <div className="mx-auto mt-5 max-w-[360px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-3 shadow-lg shadow-slate-950/5">
                  <img
                    src={qrUrl}
                    alt="QR chuyển khoản VietinBank"
                    className="w-full"
                  />
                </div>

                <div className="mt-5 text-3xl font-black text-blue-600">
                  {money(
                    numericAmount,
                  )}
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  VietinBank • 888838906789
                </p>

                <p className="mt-1 text-sm font-bold text-slate-700">
                  {transferContent}
                </p>

                
                {!vietinReady && (
                  <p className="mx-auto mt-3 max-w-sm rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                    Nạp tự động chưa được kích hoạt.
                    Vui lòng chưa chuyển tiền thật.
                  </p>
                )}
<div className="mx-auto mt-5 max-w-sm rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Kiểm tra đúng tên người nhận
                  <strong>
                    {' '}
                    NGUYEN LAM
                  </strong>{' '}
                  trước khi chuyển tiền.
                </div>
              </motion.div>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-4xl">
                  ▦
                </div>

                <h3 className="mt-5 text-xl font-black">
                  QR chuyển khoản
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Nhập số tiền từ 10.000đ để tạo QR.
                </p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* NOSCAM_WALLET_HISTORY_CSS_V4 */}
        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                NOSCAM WALLET
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                Lịch sử giao dịch
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Các khoản cộng và trừ tiền trong ví.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
              {sortedHistory.length} giao dịch
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {sortedHistory.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
                Chưa có giao dịch.
              </div>
            ) : (
              visibleHistory.map((item, index) => {
                const incoming = item.direction === 'credit'

                return (
                  <motion.div
                    key={`${safeHistoryPage}-${item.id}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.28,
                      delay: Math.min(index * 0.04, 0.28),
                    }}
                    whileHover={{ y: -2 }}
                    className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition-colors duration-200 hover:border-blue-200 hover:bg-blue-50/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black ${
                        incoming
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}>
                        {incoming ? '+' : '−'}
                      </div>

                      <div className="min-w-0">
                        <div className="break-words text-sm font-bold leading-6 text-slate-900 sm:text-base">
                          {item.description || item.code}
                        </div>

                        <div className="mt-1 break-all text-xs text-slate-400">
                          {item.code}
                        </div>

                        {item.created_at && (
                          <div className="mt-1 text-xs text-slate-400">
                            {new Date(item.created_at).toLocaleString('vi-VN')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`shrink-0 self-end whitespace-nowrap text-base font-black sm:self-auto sm:text-lg ${
                      incoming
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}>
                      {incoming ? '+' : '−'}
                      {money(item.amount)}
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>

          {sortedHistory.length > 0 && (
            <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs font-semibold text-slate-500 sm:text-left">
                Hiển thị{' '}
                {(safeHistoryPage - 1) * historyPageSize + 1}
                {' – '}
                {Math.min(
                  safeHistoryPage * historyPageSize,
                  sortedHistory.length
                )}
                {' / '}
                {sortedHistory.length} giao dịch
              </p>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={safeHistoryPage <= 1}
                  onClick={() =>
                    setHistoryPage((page) => Math.max(1, page - 1))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  Trước
                </button>

                <span className="min-w-[85px] rounded-xl bg-slate-100 px-3 py-2.5 text-center text-sm font-black text-slate-800">
                  {safeHistoryPage} / {historyTotalPages}
                </span>

                <button
                  type="button"
                  disabled={safeHistoryPage >= historyTotalPages}
                  onClick={() =>
                    setHistoryPage((page) =>
                      Math.min(historyTotalPages, page + 1)
                    )
                  }
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
