import AlertEvidenceGallery from './AlertEvidenceGallery'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'


function AlertCard({ alert }) {
  // NOSCAM_CLICKABLE_ALERT_CARD_V1
  const navigate = useNavigate()

  const searchUrl = `/search?q=${encodeURIComponent(alert.value)}`

  const handleCardClick = (event) => {
    // Không chuyển trang khi bấm ảnh, nút hoặc liên kết.
    if (event.target.closest('button, a, [role="dialog"]')) {
      return
    }

    navigate(searchUrl)
  }

  const handleCardKeyDown = (event) => {
    if (event.target !== event.currentTarget) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      navigate(searchUrl)
    }
  }

return (
    <motion.article
      role="link"
      tabIndex={0}
      aria-label={`Tra cứu ${alert.value}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      whileHover={{
        y: -5,
        scale: 1.005,
      }}
      transition={{
        duration: 0.25,
      }}
      className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl hover:shadow-slate-200/60 sm:p-6"
    >
      <motion.div
        aria-hidden="true"
        className="absolute left-0 top-0 h-1 bg-blue-500"
        initial={{
          width: 0,
        }}
        whileHover={{
          width: '100%',
        }}
        transition={{
          duration: 0.35,
        }}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-xs">
              {alert.type}
            </span>

            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              SCAM · Có báo cáo đã duyệt
            </span>
          </div>

          <p className="mt-3 break-all text-base font-bold text-slate-950 transition-colors group-hover:text-blue-700 sm:text-lg">
            {alert.value}
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {
              alert.description
            }
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span>
              <strong className="font-semibold text-slate-700">
                {alert.reports}
              </strong>{' '}
              báo cáo đã duyệt
            </span>

            {alert.time && (
              <span>
                Cập nhật{' '}
                {alert.time}
              </span>
            )}
          </div>
        </div>

        {/* NOSCAM_PUBLIC_ALERT_IMAGES_V1 */}
        <AlertEvidenceGallery images={alert.publicImages || []} />
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:min-w-[210px] lg:border-0 lg:pt-0">

          <motion.div
            whileHover={{
              x: 3,
            }}
            whileTap={{
              scale: 0.96,
            }}
          >
            <Link
              to={`/search?q=${encodeURIComponent(
                alert.value,
              )}`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition-colors hover:bg-blue-600"
            >
              Tra cứu →
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.article>
  )
}

export default AlertCard
