import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function SearchBar({
  initialValue = '',
  placeholder = 'Nhập SĐT, STK, website, Facebook, TikTok...',
  buttonText = 'Kiểm tra',
}) {
  const [query, setQuery] = useState(initialValue)
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()

    const trimmedQuery = query.trim()

    if (!trimmedQuery) return

    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="rounded-2xl border border-slate-300 bg-white p-2 shadow-lg shadow-slate-200/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label="Thông tin cần kiểm tra"
            autoComplete="off"
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
    </form>
  )
}

export default SearchBar