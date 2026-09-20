export function isValidSearchQuery(value = '') {
  return value.trim().length >= 3
}

export function isValidPhone(value = '') {
  const phone = value.replace(/\D/g, '')

  return phone.length >= 9 && phone.length <= 15
}

export function isValidBankAccount(value = '') {
  const account = value.replace(/\D/g, '')

  return account.length >= 6 && account.length <= 20
}

export function isValidUrl(value = '') {
  try {
    const url = value.startsWith('http')
      ? value
      : `https://${value}`

    new URL(url)

    return true
  } catch {
    return false
  }
}

export function hasReportInformation(formData) {
  return Boolean(
    formData.phone?.trim() ||
      formData.bankAccount?.trim() ||
      formData.social?.trim() ||
      formData.website?.trim() ||
      formData.description?.trim(),
  )
}