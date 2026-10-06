import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import mediatorService from '../../services/mediatorService'

function money(value) {
  return `${Number(
    value || 0,
  ).toLocaleString('vi-VN')}đ`
}

function MediatorLookup({
  query,
}) {
  const [mediator, setMediator] =
    useState(null)

  useEffect(() => {
    let active = true

    async function load() {
      if (!query?.trim()) {
        setMediator(null)
        return
      }

      try {
        const response =
          await mediatorService
            .lookup(query)

        if (active) {
          setMediator(
            response?.data ||
            null,
          )
        }
      } catch {
        if (active) {
          setMediator(null)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [query])

  if (!mediator) {
    return null
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 16,
        scale: 0.985,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      className="mb-6 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 shadow-sm"
    >
      <div className="h-1 bg-emerald-500" />

      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
              Hồ sơ trung gian được ghi nhận
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
              {mediator.name}
            </h2>

            <p className="mt-1 text-sm font-bold text-blue-600">
              {mediator.code}
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Thông tin bạn vừa tra cứu khớp với một hồ sơ trung gian đang được NoScam ghi nhận.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm sm:min-w-48 sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Tiền cọc đang ghi nhận
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-600">
              {money(
                mediator
                  .deposit_balance,
              )}
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-500">
              {mediator.status ===
              'active'
                ? 'Đang hoạt động'
                : mediator.status ===
                    'suspended'
                  ? 'Tạm ngưng'
                  : 'Đã gỡ'}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {mediator.identifiers
            ?.slice(0, 5)
            .map((item) => (
              <span
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
              >
                {item.label ||
                  item.bank_name ||
                  item.type}
                : {item.value}
              </span>
            ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-slate-500">
            Hồ sơ và tiền cọc chỉ là thông tin NoScam đang ghi nhận, không phải bảo đảm tuyệt đối cho mọi giao dịch.
          </p>

          <Link
            to={`/mediators/${mediator.code}`}
            className="shrink-0 text-sm font-black text-blue-600 hover:text-blue-700"
          >
            Xem hồ sơ →
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export default MediatorLookup
