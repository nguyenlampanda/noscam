import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import { motion } from 'motion/react'

import AdminNav from '../../components/admin/AdminNav'
import adminService from '../../services/adminService'

function StatCard({
  label,
  value,
  to,
  tone,
}) {
  const tones = {
    slate:
      'bg-slate-100 text-slate-700',
    amber:
      'bg-amber-50 text-amber-700',
    green:
      'bg-emerald-50 text-emerald-700',
    red:
      'bg-red-50 text-red-700',
  }

  return (
    <Link to={to}>
      <motion.div
        whileHover={{
          y: -4,
        }}
        className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${tones[tone]}`}
        >
          {label}
        </span>

        <div className="mt-5 text-4xl font-black text-slate-950">
          {value}
        </div>

        <div className="mt-4 text-sm font-bold text-blue-600">
          Xem chi tiết →
        </div>
      </motion.div>
    </Link>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()

  const [data, setData] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const response =
          await adminService.getDashboard()

        if (active) {
          setData(
            response?.data ??
              response ??
              null,
          )
        }
      } catch (err) {
        if (
          err?.status === 401 ||
          err?.status === 403
        ) {
          await adminService.logout()

          navigate(
            '/admin/login',
            {
              replace: true,
            },
          )

          return
        }

        if (active) {
          setError(
            err?.message ||
              'Không tải được tổng quan.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [navigate])

  const reports =
    data?.reports ?? data ?? {}

  const total =
    reports.total ?? 0

  const pending =
    reports.pending ?? 0

  const approved =
    reports.approved ?? 0

  const rejected =
    reports.rejected ?? 0

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            Hệ thống quản trị
          </div>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Tổng quan
          </h1>

          <p className="mt-2 text-slate-500">
            Quản lý hoạt động của NoScam.vn.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Tổng báo cáo"
            value={
              loading ? '—' : total
            }
            to="/admin/reports?status=all"
            tone="slate"
          />

          <StatCard
            label="Chờ duyệt"
            value={
              loading
                ? '—'
                : pending
            }
            to="/admin/reports?status=pending"
            tone="amber"
          />

          <StatCard
            label="Đã duyệt"
            value={
              loading
                ? '—'
                : approved
            }
            to="/admin/reports?status=approved"
            tone="green"
          />

          <StatCard
            label="Đã từ chối"
            value={
              loading
                ? '—'
                : rejected
            }
            to="/admin/reports?status=rejected"
            tone="red"
          />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Link
            to="/admin/reports"
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="text-xs font-black uppercase tracking-wider text-blue-600">
              Kiểm duyệt
            </div>

            <h2 className="mt-3 text-2xl font-black text-slate-950">
              Quản lý báo cáo
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Xem bằng chứng, duyệt hoặc từ chối báo cáo của người dùng.
            </p>

            <div className="mt-5 font-bold text-blue-600">
              Vào quản lý báo cáo →
            </div>
          </Link>

          <Link
            to="/admin/mediators"
            className="rounded-3xl border border-emerald-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="text-xs font-black uppercase tracking-wider text-emerald-600">
              Hồ sơ & tiền cọc
            </div>

            <h2 className="mt-3 text-2xl font-black text-slate-950">
              Quản lý trung gian
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Quản lý người trung gian, SĐT, tài khoản ngân hàng, mạng xã hội và lịch sử tiền cọc.
            </p>

            <div className="mt-5 font-bold text-emerald-600">
              Vào quản lý trung gian →
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
