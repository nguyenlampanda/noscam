// NOSCAM_AUTH_48H
const DURATION = 48 * 60 * 60 * 1000

export function readAuthToken(key) {
  const token = localStorage.getItem(key)
  if (!token) return null

  const expiry = Number(localStorage.getItem(`${key}_expires_at`))
  if (!Number.isFinite(expiry) || expiry <= 0 || Date.now() >= expiry) {
    localStorage.removeItem(key)
    localStorage.removeItem(`${key}_expires_at`)
    window.dispatchEvent(new CustomEvent('noscam-auth-expired', {
      detail: { key },
    }))
    return null
  }
  return token
}

export function saveAuthToken(key, token) {
  localStorage.setItem(key, token)
  localStorage.setItem(
    `${key}_expires_at`,
    String(Date.now() + DURATION),
  )
}

export function clearAuthToken(key) {
  localStorage.removeItem(key)
  localStorage.removeItem(`${key}_expires_at`)
}

if (typeof window !== 'undefined') {
  window.setInterval(() => {
    readAuthToken('noscam_customer_token')
    readAuthToken('noscam_admin_token')
  }, 1000)

  window.addEventListener('focus', () => {
    readAuthToken('noscam_customer_token')
    readAuthToken('noscam_admin_token')
  })
}
