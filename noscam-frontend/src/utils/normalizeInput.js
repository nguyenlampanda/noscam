export function normalizeSearchInput(value = '') {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizePhone(value = '') {
  return value.replace(/[^\d+]/g, '')
}

export function normalizeBankAccount(value = '') {
  return value.replace(/\D/g, '')
}

export function normalizeUrl(value = '') {
  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed
  }

  return `https://${trimmed}`
}