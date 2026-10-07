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

  const [amount, setAmount] =
    useState('')

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

  const transferContent =
    useMemo(() => {
      if (!user?.username) {
        return 'NOSCAM'
      }

      return `NOSCAM ${user.username}`
        .replace(
          /[^a-zA-Z0-9 ]/g,
          '',
        )
        .slice(0, 25)
    }, [user])

  const numericAmount =
    Number(amount) || 0

  const qrUrl = useMemo(() => {
    if (numericAmount < 10000) {
      return ''
    }

    const params =
      new URLSearchParams({
        amount:
          String(
            Math.round(
              numericAmount,
            ),
          ),

        addInfo:
          transferContent,

        accountName:
          BANK.accountName,
      })

    return (
      `https://img.vietqr.io/image/` +
      `${BANK.bankId}-` +
      `${BANK.accountNumber}-` +
      `compact2.png?` +
      params.toString()
    )
  }, [
    numericAmount,
    transferContent,
  ])

  if (loading) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-5 py-16 text-center font-semibold text-slate-400">
        Đang tải ví...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
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

        <div className="mt-7 grid gap-4 md:grid-cols-4">
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
                onChange={(e) =>
                  setAmount(
                    e.target.value,
                  )
                }
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
                  onClick={() =>
                    setAmount(
                      String(value),
                    )
                  }
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

                  <div className="mt-1 font-black">
                    Techcombank
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

                <CopyButton
                  value={
                    transferContent
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6">
            {numericAmount >=
            10000 ? (
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

        <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">
            Lịch sử giao dịch
          </h2>

          <div className="mt-4 divide-y divide-slate-100">
            {transactions.length ===
            0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Chưa có giao dịch.
              </div>
            ) : (
              transactions.map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div>
                      <div className="font-bold">
                        {item.description ||
                          item.code}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {item.code}
                      </div>
                    </div>

                    <div
                      className={`font-black ${
                        item.direction ===
                        'credit'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {item.direction ===
                      'credit'
                        ? '+'
                        : '-'}
                      {money(
                        item.amount,
                      )}
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
