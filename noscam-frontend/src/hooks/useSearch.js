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
  const [meta, setMeta] = useState(null)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(
    REQUEST_STATUS.IDLE,
  )
  const [error, setError] = useState(null)

  const controllerRef = useRef(null)

  const search = useCallback(async (query) => {
    controllerRef.current?.abort()

    const controller =
      new AbortController()

    controllerRef.current =
      controller

    setStatus(
      REQUEST_STATUS.LOADING,
    )
    setError(null)
    setData(null)
    setMeta(null)
    setMessage('')

    try {
      const response =
        await searchInformation(
          query,
          {
            signal:
              controller.signal,
          },
        )

      if (
        controller.signal.aborted
      ) {
        return null
      }

      setMeta(
        response?.meta || null,
      )

      setMessage(
        response?.message || '',
      )

      if (!response?.result) {
        setStatus(
          REQUEST_STATUS.EMPTY,
        )

        return response
      }

      setData(
        response.result,
      )

      setStatus(
        REQUEST_STATUS.SUCCESS,
      )

      return response
    } catch (err) {
      if (
        err.name === 'AbortError'
      ) {
        return null
      }

      setError(
        err.message ||
          'Không thể kiểm tra thông tin.',
      )

      setStatus(
        REQUEST_STATUS.ERROR,
      )

      return null
    }
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null

    setData(null)
    setMeta(null)
    setMessage('')
    setError(null)

    setStatus(
      REQUEST_STATUS.IDLE,
    )
  }, [])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  return {
    data,
    meta,
    message,
    status,
    error,
    search,
    reset,
  }
}

export default useSearch
