import { useState } from 'react'
import {
  motion,
  AnimatePresence,
} from 'motion/react'
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

  const [isFocused, setIsFocused] =
    useState(false)

  const [isScanning, setIsScanning] =
    useState(false)

  const navigate = useNavigate()

  const handleChange = (event) => {
    setQuery(event.target.value)

    if (error) {
      setError('')
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setError(
        'Vui lòng nhập thông tin cần kiểm tra.',
      )

      return
    }

    if (trimmedQuery.length < 3) {
      setError(
        'Thông tin cần kiểm tra phải có ít nhất 3 ký tự.',
      )

      return
    }

    setError('')
    setIsScanning(true)

    window.setTimeout(() => {
      navigate(
        `/search?q=${encodeURIComponent(
          trimmedQuery,
        )}`,
      )

      setIsScanning(false)
    }, 380)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full"
    >
      <motion.div
        animate={{
          scale: isFocused ? 1.008 : 1,
        }}
        transition={{
          duration: 0.2,
        }}
        className={`relative overflow-hidden rounded-2xl border bg-white/90 p-2 shadow-xl backdrop-blur-xl transition-[border-color,box-shadow] duration-300 ${
          error
            ? 'border-red-300 shadow-red-100/60'
            : isFocused
              ? 'border-blue-400 shadow-blue-200/50'
              : 'border-slate-300 shadow-slate-200/60'
        }`}
      >
        <AnimatePresence>
          {isScanning && (
            <motion.div
              aria-hidden="true"
              initial={{
                x: '-120%',
              }}
              animate={{
                x: '220%',
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.75,
                ease: 'easeInOut',
              }}
              className="pointer-events-none absolute inset-y-0 z-20 w-1/3 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent blur-md"
            />
          )}
        </AnimatePresence>

        <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center sm:left-4">
              <motion.svg
                animate={{
                  rotate: isScanning
                    ? [0, 8, -8, 0]
                    : 0,
                }}
                transition={{
                  duration: 0.5,
                  repeat: isScanning
                    ? Infinity
                    : 0,
                }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className={`h-5 w-5 ${
                  isFocused
                    ? 'text-blue-600'
                    : 'text-slate-400'
                }`}
                aria-hidden="true"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />
                <path
                  strokeLinecap="round"
                  d="m20 20-3.8-3.8"
                />
              </motion.svg>
            </div>

            <input
              type="text"
              value={query}
              onChange={handleChange}
              onFocus={() =>
                setIsFocused(true)
              }
              onBlur={() =>
                setIsFocused(false)
              }
              placeholder={placeholder}
              aria-label="Thông tin cần kiểm tra"
              autoComplete="off"
              maxLength={500}
              className="h-13 min-w-0 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 sm:h-14 sm:pl-12 sm:pr-4 sm:text-base"
            />
          </div>

          <motion.button
            type="submit"
            disabled={isScanning}
            whileHover={
              isScanning
                ? {}
                : {
                    scale: 1.025,
                  }
            }
            whileTap={
              isScanning
                ? {}
                : {
                    scale: 0.97,
                  }
            }
            className="relative h-12 w-full shrink-0 overflow-hidden rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition-colors hover:bg-blue-600 disabled:cursor-wait sm:h-14 sm:w-auto sm:px-7"
          >
            <AnimatePresence mode="wait">
              {isScanning ? (
                <motion.span
                  key="scanning"
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -8,
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <motion.span
                    className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />

                  Đang quét...
                </motion.span>
              ) : (
                <motion.span
                  key="ready"
                  initial={{
                    opacity: 0,
                    y: -8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: 8,
                  }}
                >
                  {buttonText}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{
              opacity: 0,
              y: -5,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -5,
            }}
            className="mt-2 text-left text-xs font-medium text-red-600"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  )
}

export default SearchBar