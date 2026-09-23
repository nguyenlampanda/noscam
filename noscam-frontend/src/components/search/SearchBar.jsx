import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function SearchBar({
  initialValue = '',
  placeholder =
    'Nhập SĐT, STK, website, Facebook, TikTok...',
  buttonText = 'Kiểm tra',
}) {
  const [query, setQuery] =
    useState(initialValue)

  const [error, setError] =
    useState('')

  const navigate =
    useNavigate()

  const handleChange = (
    event,
  ) => {
    setQuery(
      event.target.value,
    )

    if (error) {
      setError('')
    }
  }

  const handleSubmit = (
    event,
  ) => {
    event.preventDefault()

    const trimmedQuery =
      query.trim()

    if (!trimmedQuery) {
      setError(
        'Vui lòng nhập thông tin cần kiểm tra.',
      )

      return
    }

    if (
      trimmedQuery.length < 3
    ) {
      setError(
        'Thông tin cần kiểm tra phải có ít nhất 3 ký tự.',
      )

      return
    }

    setError('')

    navigate(
      `/search?q=${encodeURIComponent(
        trimmedQuery,
      )}`,
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full"
    >
      <div
        className={`rounded-2xl border bg-white p-2 shadow-lg shadow-slate-200/50 ${
          error
            ? 'border-red-300'
            : 'border-slate-300'
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <input
            type="text"
            value={query}
            onChange={
              handleChange
            }
            placeholder={
              placeholder
            }
            aria-label="Thông tin cần kiểm tra"
            autoComplete="off"
            maxLength={500}
            className="h-13 min-w-0 w-full rounded-xl px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 sm:h-14 sm:flex-1 sm:px-4 sm:text-base"
          />

          <button
            type="submit"
            className="h-12 w-full shrink-0 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-600 sm:h-14 sm:w-auto sm:px-7"
          >
            {buttonText}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 text-left text-xs font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </form>
  )
}

export default SearchBar