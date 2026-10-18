import { useNoScamUI } from '../../components/ui/NoScamUI'
import ExchangeCampaignList from './ExchangeCampaignList'
import ExchangeDisputeList from './ExchangeDisputeList'
import { useCallback, useEffect, useRef, useState } from 'react'
import AdminNav from '../../components/admin/AdminNav'
import AdminExchangeLists from './AdminExchangeLists'
import adminExchangeService from '../../services/adminExchangeService'

const platforms = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'facebook', name: 'Facebook' },
]

const taskTypes = [
  { id: 'follow', name: 'Follow' },
  { id: 'like', name: 'Like' },
  { id: 'comment', name: 'Comment' },
]

const formatCoins = (value) =>
  new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

function PriceCard({ platform, task, saved, onSaved, onDirtyChange }) {
  const { confirm, notify } = useNoScamUI()
  const [cost, setCost] = useState(
    String(saved?.cost_per_task ?? 2000),
  )
  const [reward, setReward] = useState(
    String(saved?.reward_per_task ?? 1000),
  )
  const [minQuantity, setMinQuantity] = useState(
    String(saved?.min_quantity ?? 10),
  )
  const [enabled, setEnabled] = useState(
    saved?.is_enabled ?? false,
  )
  const [confirmed, setConfirmed] = useState({
    cost: String(saved?.cost_per_task ?? 2000),
    reward: String(saved?.reward_per_task ?? 1000),
    enabled: saved?.is_enabled ?? false,
    minQuantity: String(saved?.min_quantity ?? 10),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const locked = useRef(false)

  const dirty =
    cost !== confirmed.cost ||
    reward !== confirmed.reward ||
    minQuantity !== confirmed.minQuantity ||
    enabled !== confirmed.enabled

  useEffect(() => {
    onDirtyChange(platform.id, task.id, dirty)
  }, [platform.id, task.id, dirty, onDirtyChange])

  const costNumber = Number(cost)
  const rewardNumber = Number(reward)
  const minQuantityNumber = Number(minQuantity)

  const valid =
    /^\d+$/.test(cost) &&
    /^\d+$/.test(reward) &&
    Number.isSafeInteger(costNumber) &&
    Number.isSafeInteger(rewardNumber) &&
    costNumber >= 1 &&
    costNumber <= 999999999 &&
    rewardNumber >= 1 &&
    rewardNumber <= costNumber &&
    /^\d+$/.test(minQuantity) &&
    Number.isSafeInteger(minQuantityNumber) &&
    minQuantityNumber >= 1 &&
    minQuantityNumber <= 100000

  const fee = valid ? costNumber - rewardNumber : null

  async function save() {
    if (locked.current || busy) return

    setError('')
    setSuccess('')

    if (!valid) {
      setError('Giá và thưởng phải là số nguyên dương; thưởng không vượt quá giá.')
      return
    }

    if (!(await confirm(
      `Lưu giá ${platform.name} - ${task.name}?\\n` +
      `Giá: ${formatCoins(costNumber)} xu\\n` +
      `Thưởng: ${formatCoins(rewardNumber)} xu\\n` +
      `Phí: ${formatCoins(fee)} xu\\n` +
      `Trạng thái: ${enabled ? 'Bật' : 'Tắt'}`
    ))) return

    locked.current = true
    setBusy(true)

    try {
      const response = await adminExchangeService.updatePrice({
        platform: platform.id,
        task_type: task.id,
        cost_per_task: costNumber,
        reward_per_task: rewardNumber,
        min_quantity: minQuantityNumber,
        is_enabled: enabled,
      })

      const serverPrice = response?.data

      if (
        serverPrice?.platform !== platform.id ||
        serverPrice?.task_type !== task.id ||
        Number(serverPrice?.cost_per_task) !== costNumber ||
        Number(serverPrice?.reward_per_task) !== rewardNumber ||
        Number(serverPrice?.min_quantity) !== minQuantityNumber ||
        Boolean(serverPrice?.is_enabled) !== enabled
      ) {
        throw new Error(
          'Máy chủ chưa xác nhận đầy đủ giá vừa lưu. Vui lòng tải lại để kiểm tra.'
        )
      }

      setConfirmed({
        cost: String(serverPrice.cost_per_task),
        reward: String(serverPrice.reward_per_task),
        minQuantity: String(serverPrice.min_quantity),
        enabled: Boolean(serverPrice.is_enabled),
      })

      const updated = await onSaved({
        platform: platform.id,
        task_type: task.id,
        cost_per_task: costNumber,
        reward_per_task: rewardNumber,
        min_quantity: minQuantityNumber,
        is_enabled: enabled,
      })
      if (updated) {
        setSuccess('Đã lưu giá thành công.')
        notify('Đã lưu giá thành công.', 'success')
      }
    } catch (err) {
      setError(err?.message || 'Không thể xác nhận cập nhật.')
      notify(err?.message || 'Không thể xác nhận cập nhật.', 'error')
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">{task.name}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
          enabled ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {enabled ? 'Đang bật' : 'Đang tắt'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Giá người tạo trả (xu)
          <input
            type="number"
            min="1"
            max="999999999"
            step="1"
            value={cost}
            disabled={busy}
            onChange={(event) => setCost(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Thưởng người làm (xu)
          <input
            type="number"
            min="1"
            max="999999999"
            step="1"
            value={reward}
            disabled={busy}
            onChange={(event) => setReward(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Số lượng tối thiểu (lượt)
        <input
          type="number"
          min="1"
          max="100000"
          step="1"
          value={minQuantity}
          disabled={busy}
          onChange={(event) => setMinQuantity(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Phí nền tảng:
          <strong className="ml-2 text-blue-700">
            {fee === null ? 'Không hợp lệ' : `${formatCoins(fee)} xu`}
          </strong>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Cho phép tạo nhiệm vụ
        </label>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-700">{success}</p>}

      <button
        type="button"
        disabled={busy || !valid}
        onClick={save}
        className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Đang lưu...' : 'Lưu giá nhiệm vụ'}
      </button>
    </section>
  )
}

function AdminExchangePricePanel() {
  const { confirm } = useNoScamUI()
  const [prices, setPrices] = useState([])
  const dirtyRef = useRef(new Set())

  const onDirtyChange = useCallback((platform, task, dirty) => {
    const key = `${platform}:${task}`

    if (dirty) {
      dirtyRef.current.add(key)
    } else {
      dirtyRef.current.delete(key)
    }
  }, [])

  const confirmDiscard = useCallback(async () => {
    if (dirtyRef.current.size === 0) return true

    return await confirm(
      'Bạn có thay đổi giá chưa lưu. Bạn có muốn bỏ các thay đổi này?'
    )
  }, [confirm])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await adminExchangeService.prices()
      setPrices(Array.isArray(response?.data) ? response.data : [])
    } catch (err) {
      setError(err?.message || 'Không thể tải giá Exchange.')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSavedPrice = useCallback(async (price) => {
    setPrices((current) => {
      const remaining = current.filter(
        (item) =>
          item.platform !== price.platform ||
          item.task_type !== price.task_type
      )
      return [...remaining, price]
    })
    return true
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (dirtyRef.current.size > 0) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const reloadPrices = async () => {
    if (await confirmDiscard()) {
      await load()
    }
  }


  return (
    <div className="min-h-screen bg-slate-50">


      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-950">
              Quản lý Kiếm xu
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Thiết lập giá, thưởng và phí nền tảng. 1 xu = 1 VND.
            </p>
          </div>

          <button
            type="button"
            onClick={reloadPrices}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            Tải lại
          </button>
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
        ) : !error ? (
          <div className="space-y-10">
            {platforms.map((platform) => (
              <section key={platform.id}>
                <h2 className="mb-4 text-xl font-black text-slate-900">
                  {platform.name}
                </h2>

                <div className="grid gap-5 lg:grid-cols-3">
                  {taskTypes.map((task) => {
                    const saved = prices.find(
                      (item) =>
                        item.platform === platform.id &&
                        item.task_type === task.id
                    )

                    return (
                      <PriceCard
                        key={`${platform.id}-${task.id}`}
                        platform={platform}
                        task={task}
                        saved={saved}
                        onSaved={updateSavedPrice}
                        onDirtyChange={onDirtyChange}
                      />
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  )
}


export default function AdminExchangePage() {
  const [tab, setTab] = useState('campaigns')

  const tabs = [
    { id: 'campaigns', label: 'Chiến dịch' },
    { id: 'disputes', label: 'Khiếu nại' },
    { id: 'prices', label: 'Bảng giá' }
  ]

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-7xl px-5 pt-6 lg:px-8">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={`rounded-xl px-5 py-3 text-sm font-bold ${
                tab === item.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </main>

      <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-6 lg:px-8">
        {tab === 'prices' && <AdminExchangePricePanel />}
        {tab === 'campaigns' && <ExchangeCampaignList />}
        {tab === 'disputes' && <ExchangeDisputeList />}
      </div>
    </>
  )
}
