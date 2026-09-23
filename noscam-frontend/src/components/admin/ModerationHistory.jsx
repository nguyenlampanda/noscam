function ModerationHistory({
  logs = [],
}) {
  if (!logs.length) {
    return (
      <div className="mt-8 border-t border-slate-100 pt-7">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Lịch sử kiểm duyệt
        </div>

        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          Chưa có lịch sử kiểm duyệt.
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 border-t border-slate-100 pt-7">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Lịch sử kiểm duyệt
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge
                status={
                  log.from_status
                }
              />

              <span className="text-slate-400">
                →
              </span>

              <StatusBadge
                status={
                  log.to_status
                }
              />
            </div>

            <div className="mt-3 text-sm text-slate-600">
              Người thực hiện:{' '}
              <span className="font-semibold text-slate-800">
                {log.user?.name ||
                  log.user?.email ||
                  'Tài khoản đã bị xóa'}
              </span>
            </div>

            {log.user?.email && (
              <div className="mt-1 text-xs text-slate-500">
                {log.user.email}
              </div>
            )}

            <div className="mt-2 text-xs text-slate-400">
              {formatDateTime(
                log.created_at,
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}) {
  const labels = {
    pending:
      'Chờ duyệt',

    approved:
      'Đã duyệt',

    rejected:
      'Đã từ chối',
  }

  const styles = {
    pending:
      'bg-amber-100 text-amber-700',

    approved:
      'bg-emerald-100 text-emerald-700',

    rejected:
      'bg-red-100 text-red-700',
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] ||
        'bg-slate-200 text-slate-700'
      }`}
    >
      {labels[status] ||
        status}
    </span>
  )
}

function formatDateTime(
  value,
) {
  if (!value) {
    return ''
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString(
    'vi-VN',
  )
}

export default ModerationHistory