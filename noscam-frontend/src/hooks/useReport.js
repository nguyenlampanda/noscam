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

        const errorCode =
          err?.data?.code || null

        let errorMessage =
          err?.message ||
          'Không thể gửi báo cáo. Vui lòng thử lại.'

        let errorType = 'server'

        if (
          err?.status === 409 &&
          errorCode === 'DUPLICATE_REPORT'
        ) {
          errorType = 'duplicate'

          errorMessage =
            err?.data?.message ||
            'Báo cáo có nội dung tương tự vừa được gửi. Vui lòng không gửi lặp lại liên tục.'
        } else if (err?.status === 422) {
          errorType = 'validation'

          errorMessage =
            err?.message ||
            'Một số thông tin chưa hợp lệ. Vui lòng kiểm tra lại.'
        } else if (err?.status === 429) {
          errorType = 'rate_limit'

          errorMessage =
            'Bạn đang gửi quá nhiều báo cáo. Vui lòng chờ một lúc rồi thử lại.'
        } else if (
          !err?.status ||
          err?.status >= 500
        ) {
          errorType = 'server'
        }

        setError({
          type: errorType,
          code: errorCode,
          status: err?.status || null,
          message: errorMessage,
        })

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