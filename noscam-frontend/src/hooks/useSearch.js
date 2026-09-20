import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { REQUEST_STATUS } from '../constants/api'
import { searchInformation } from '../services/searchService'

export function useSearch() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState(
    REQUEST_STATUS.IDLE,
  )
  const [error, setError] = useState(null)

  const controllerRef = useRef(null)

  const search = useCallback(async (query) => {
    controllerRef.current?.abort()

    const controller = new AbortController()
    controllerRef.current = controller

    setStatus(REQUEST_STATUS.LOADING)
    setError(null)
    setData(null)

    try {
      const result = await searchInformation(
        query,
        {
          signal: controller.signal,
        },
      )

      if (controller.signal.aborted) {
        return null
      }

      if (!result) {
        setStatus(REQUEST_STATUS.EMPTY)
        return null
      }

      setData(result)
      setStatus(REQUEST_STATUS.SUCCESS)

      return result
    } catch (err) {
      if (err.name === 'AbortError') {
        return null
      }

      setError(
        err.message ||
          'Không thể kiểm tra thông tin.',
      )

      setStatus(REQUEST_STATUS.ERROR)

      return null
    }
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null

    setData(null)
    setError(null)
    setStatus(REQUEST_STATUS.IDLE)
  }, [])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  return {
    data,
    status,
    error,
    search,
    reset,
  }
}

export default useSearch