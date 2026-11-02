import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const EVENT = 'noscam-auth-success'

const messages = {
  login: {
    title: 'Đăng nhập thành công',
    description: 'Chào mừng bạn quay trở lại NoScam.vn!',
  },
  register: {
    title: 'Tạo tài khoản thành công',
    description: 'Chào mừng bạn đến với NoScam.vn!',
  },
  logout: {
    title: 'Đăng xuất thành công',
    description: 'Bạn đã đăng xuất khỏi tài khoản.',
  },
}

export function showAuthSuccess(type) {
  if (!Object.prototype.hasOwnProperty.call(messages, type)) return

  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: type })
  )
}

export default function AuthSuccessPopup() {
  const [type, setType] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(3)
  const closeRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    const handleSuccess = event => {
      if (!Object.prototype.hasOwnProperty.call(messages, event.detail)) return
      previousFocus.current = document.activeElement
      setSecondsLeft(3)
      setType(event.detail)
    }

    window.addEventListener(EVENT, handleSuccess)
    return () => window.removeEventListener(EVENT, handleSuccess)
  }, [])

  useEffect(() => {
    if (!type) return

    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    closeRef.current?.focus()

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setType(null)
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        const buttons = Array.from(
          document.querySelectorAll('[data-ns-auth-dialog] button')
        )
        if (!buttons.length) return
        const index = buttons.indexOf(document.activeElement)
        const next = event.shiftKey
          ? (index <= 0 ? buttons.length - 1 : index - 1)
          : (index + 1) % buttons.length
        buttons[next].focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = oldOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus.current?.isConnected) {
        previousFocus.current.focus()
      }
    }
  }, [type])


  useEffect(() => {
    if (!type) return

    const timer = window.setInterval(() => {
      setSecondsLeft(current => {
        if (current <= 1) {
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [type])

  useEffect(() => {
    if (type && secondsLeft === 0) {
      setType(null)
    }
  }, [type, secondsLeft])

  if (!type) return null

  const message = messages[type]

  return createPortal(
    <div
      className="ns-auth-overlay"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) setType(null)
      }}
    >
      <style>{`
        .ns-auth-overlay {
          position: fixed;
          inset: 0;
          background: rgba(9,17,34,.62);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          z-index: 100000;
          box-sizing: border-box;
        }
        .ns-auth-modal {
          box-sizing: border-box;
          width: 100%;
          max-width: 480px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 30px 90px #0004;
          overflow: hidden;
          animation: ns-auth-pop .16s ease;
          color: #152033;
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }
        @keyframes ns-auth-pop {
          from {
            opacity: 0;
            transform: translateY(9px) scale(.98);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .ns-auth-head {
          padding: 22px 24px 15px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
        .ns-auth-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 16px;
          font-size: 17px;
          font-weight: 850;
          color: #175cff;
        }
        .ns-auth-brand-icon {
          display: grid;
          place-items: center;
          width: 35px;
          height: 35px;
          border-radius: 11px;
          background: linear-gradient(135deg,#175cff,#06b6d4);
          color: white;
          font-size: 21px;
          box-shadow: 0 5px 14px #175cff25;
        }
        .ns-auth-brand-domain {
          color: #152033;
        }
        .ns-auth-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
        }
        .ns-auth-close {
          background: #f0f3f8;
          border: 0;
          border-radius: 9px;
          width: 33px;
          height: 33px;
          font-size: 20px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .ns-auth-body {
          padding: 0 24px 22px;
          color: #526078;
          font-size: 14px;
          line-height: 1.65;
          max-height: 65vh;
          overflow: auto;
        }
        .ns-auth-icon {
          width: 46px;
          height: 46px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          font-size: 24px;
          margin-bottom: 14px;
          background: #dcfce7;
          color: #047857;
        }
        .ns-auth-body p {
          margin: 0;
        }
        .ns-auth-foot {
          border-top: 1px solid #e8edf4;
          padding: 16px 24px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .ns-auth-button {
          border: 1px solid #dce4ee;
          border-radius: 11px;
          padding: 11px 17px;
          background: white;
          color: #34445b;
          font-size: 14px;
          font-weight: 650;
          cursor: pointer;
        }
        .ns-auth-button:hover {
          background: #f8fafc;
        }
        @media (max-width: 550px) {
          .ns-auth-head,
          .ns-auth-body,
          .ns-auth-foot {
            padding-left: 18px;
            padding-right: 18px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ns-auth-modal {
            animation: none;
          }
        }
      `}</style>

      <section
        data-ns-auth-dialog
        className="ns-auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ns-auth-title"
        aria-describedby="ns-auth-description"
      >
        <div className="ns-auth-head">
          <div>
            <div className="ns-auth-brand">
              <span className="ns-auth-brand-icon" aria-hidden="true">
                N
              </span>
              <span>
                NoScam<span className="ns-auth-brand-domain">.vn</span>
              </span>
            </div>
            <h3 className="ns-auth-title" id="ns-auth-title">
              {message.title}
            </h3>
          </div>

          <button
            ref={closeRef}
            type="button"
            className="ns-auth-close"
            aria-label="Đóng"
            onClick={() => setType(null)}
          >
            ×
          </button>
        </div>

        <div className="ns-auth-body">
          <div className="ns-auth-icon" aria-hidden="true">✓</div>
          <p id="ns-auth-description">{message.description}</p>
        </div>

        <div className="ns-auth-foot">
          <button
            type="button"
            className="ns-auth-button"
            onClick={() => setType(null)}
          >
            Đóng ({secondsLeft}s)
          </button>
        </div>
      </section>
    </div>,
    document.body
  )
}
