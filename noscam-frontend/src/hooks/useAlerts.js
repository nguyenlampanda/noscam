import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { REQUEST_STATUS } from '../constants/api'
import { getAlerts } from '../services/alertsService'

function useAlerts() {
  const [alerts, setAlerts] = useState([])
  const [pagination, setPagination] = useState(null)

  const [status, setStatus] = useState(
    REQUEST_STATUS.IDLE,
  )

  const [error, setError] = useState(null)

  const controllerRef = useRef(null)

  const loadAlerts = useCallback(async (filters = {}) => {
    controllerRef.current?.abort()

    const controller = new AbortController()
    controllerRef.current = controller

    setStatus(REQUEST_STATUS.LOADING)
    setError(null)

    try {
      const result = await getAlerts(filters, {
        signal: controller.signal,
      })

      if (controller.signal.aborted) {
        return null
      }

      const items = result.alerts || []

      setAlerts(items)
      setPagination(result.pagination)

      setStatus(
        items.length > 0
          ? REQUEST_STATUS.SUCCESS
          : REQUEST_STATUS.EMPTY,
      )

      return result
    } catch (err) {
      if (err.name === 'AbortError') {
        return null
      }

      setAlerts([])
      setPagination(null)

      setError(
        err.message ||
          'Không thể tải dữ liệu cảnh báo.',
      )

      setStatus(REQUEST_STATUS.ERROR)

      return null
    }
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null

    setAlerts([])
    setPagination(null)
    setError(null)
    setStatus(REQUEST_STATUS.IDLE)
  }, [])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  return {
    alerts,
    pagination,
    status,
    error,
    loadAlerts,
    reset,
  }
}

export default useAlerts