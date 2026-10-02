export function mapReportPayload(formData) {
  const payload = new FormData()

  const fields = {
    scam_type: formData.scamType,
    phone: formData.phone?.trim(),
    bank_account: formData.bankAccount?.trim(),
    bank: formData.bank,
    social: formData.social?.trim(),
    website: formData.website?.trim(),
    description: formData.description?.trim(),
    loss_amount: formData.lossAmount,
    occurred_at: formData.occurredAt,

    // Honeypot chống bot.
    // Người dùng thật không nhìn thấy và không điền field này.
    website_confirm: formData.websiteConfirm,
  }

  Object.entries(fields).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      payload.append(key, value)
    }
  })

  ;(formData.evidences || []).forEach((file) => {
    payload.append('evidences[]', file)
  })

  return payload
}