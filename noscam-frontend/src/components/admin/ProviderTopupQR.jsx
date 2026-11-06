import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

const BANK_BIN = {
  Vietcombank: '970436',
  'MB Bank': '970422',
}

function tlv(id, value) {
  const length = new TextEncoder().encode(value).length
  if (length > 99) throw new Error('Du lieu QR qua dai')
  return id + String(length).padStart(2, '0') + value
}

function crc16(value) {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000
        ? ((crc << 1) ^ 0x1021) & 0xffff
        : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function createProviderPayload(payment) {
  const bin = BANK_BIN[payment.bank]
  const account = String(payment.account || '')
  const memo = String(payment.content || '')

  if (!bin || !/^\d{1,19}$/.test(account) ||
      !/^[A-Za-z0-9 ]{1,50}$/.test(memo)) {
    throw new Error('Thong tin ngan hang chua ho tro VietQR')
  }

  const accountInfo = tlv('00', bin) + tlv('01', account)
  const merchantInfo =
    tlv('00', 'A000000727') +
    tlv('01', accountInfo) +
    tlv('02', 'QRIBFTTA')

  const raw =
    tlv('00', '01') +
    tlv('01', '11') +
    tlv('38', merchantInfo) +
    tlv('53', '704') +
    tlv('58', 'VN') +
    tlv('62', tlv('08', memo)) +
    '6304'

  return raw + crc16(raw)
}

export default function ProviderTopupQR({ payment, providerName }) {
  const [image, setImage] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const supported = Boolean(
    BANK_BIN[payment.bank] &&
    /^\d{1,19}$/.test(String(payment.account || ''))
  )

  useEffect(() => {
    let active = true
    if (!supported) return undefined

    async function generate() {
      try {
        const payload = createProviderPayload(payment)
        const url = await QRCode.toDataURL(payload, {
          width: 600,
          margin: 3,
          errorCorrectionLevel: 'M',
        })
        if (active) {
          setImage(url)
          setError('')
        }
      } catch (err) {
        if (active) setError(err.message)
      }
    }

    generate()
    return () => { active = false }
  }, [payment, supported])

  if (!supported) {
    return (
      <span className="text-xs text-amber-700">
        QR chua ho tro tai khoan nay
      </span>
    )
  }

  return (
    <>
      {error && <span className="text-xs text-red-600">{error}</span>}
      {image && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={'Xem QR nap tien ' + providerName}
          className="rounded-lg border border-slate-200 bg-white p-1.5"
        >
          <img src={image} alt={'VietQR ' + providerName}
            className="h-12 w-12" />
        </button>
      )}
      {open && image && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={'QR nap tien ' + providerName}
            className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 text-center shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">
              {providerName}
            </h3>
            <img src={image} alt={'QR chuyen khoan ' + providerName}
              className="mx-auto mt-3 w-full max-w-[320px]" />
            <p className="mt-2 text-sm text-slate-700">
              {payment.bank} - {payment.account}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {payment.content}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Kiem tra ten nguoi nhan trong app ngan hang.
              QR khong co so tien co dinh.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <a href={image}
                download={'VietQR-' + providerName + '.png'}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
              >
                Luu anh QR
              </a>
              <button type="button" onClick={() => setOpen(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold">
                Dong
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Tren iPhone co the nhan giu anh de luu vao Anh.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
