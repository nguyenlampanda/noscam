function tlv(id, value) {
  const length = new TextEncoder().encode(value).length

  if (length > 99) {
    throw new Error('Thông tin QR vượt quá giới hạn cho phép.')
  }

  return id + String(length).padStart(2, '0') + value
}

function crc16(value) {
  const bytes = new TextEncoder().encode(value)
  let crc = 0xffff

  for (const byte of bytes) {
    crc ^= byte << 8

    for (let i = 0; i < 8; i += 1) {
      crc = (crc & 0x8000)
        ? ((crc << 1) ^ 0x1021) & 0xffff
        : (crc << 1) & 0xffff
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function createVietQRPayload({
  bankBin,
  accountNumber,
  amount,
  content,
}) {
  const amountNumber = Number(amount)

  if (
    !/^\d{6}$/.test(String(bankBin)) ||
    !/^\d{1,19}$/.test(String(accountNumber)) ||
    !Number.isSafeInteger(amountNumber) ||
    amountNumber <= 0 ||
    !/^[A-Za-z0-9 ]{1,50}$/.test(String(content))
  ) {
    throw new Error('Thông tin chuyển khoản không hợp lệ.')
  }

  const accountInfo = tlv('00', String(bankBin)) +
    tlv('01', String(accountNumber))

  const merchantInfo =
    tlv('00', 'A000000727') +
    tlv('01', accountInfo) +
    tlv('02', 'QRIBFTTA')

  const additionalData = tlv('08', String(content))

  const raw =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('38', merchantInfo) +
    tlv('53', '704') +
    tlv('54', String(amountNumber)) +
    tlv('58', 'VN') +
    tlv('62', additionalData) +
    '6304'

  return raw + crc16(raw)
}

