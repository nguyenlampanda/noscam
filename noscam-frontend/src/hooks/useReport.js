import { useCallback, useState } from 'react'

import { REQUEST_STATUS } from '../constants/api'
import { createReport } from '../services/reportService'

function useReport() {
  const [data, setData] = useState(null)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(
    REQUEST_STATUS.IDLE,
  )
  const [error, setError] = useState(null)

  const submitReport = useCallback(
    async (reportData) => {
      setStatus(REQUEST_STATUS.LOADING)
      setError(null)
      setMessage('')

      try {
        const result = await createReport(reportData)

        setData(result.data)
        setMessage(result.message)
        setStatus(REQUEST_STATUS.SUCCESS)

        return result
      } catch (err) {
        setData(null)

        setError(
          err?.message ||
            'Không thể gửi báo cáo. Vui lòng thử lại.',
        )

        setStatus(REQUEST_STATUS.ERROR)

        return null
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setData(null)
    setMessage('')
    setError(null)
    setStatus(REQUEST_STATUS.IDLE)
  }, [])

  return {
    data,
    message,
    status,
    error,
    submitReport,
    reset,
  }
}

export default useReport