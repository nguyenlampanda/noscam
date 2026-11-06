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

function createPayload(payment) {
  const bin = BANK_BIN[payment.bank]
  const account = String(payment.account || '')
  const memo = String(payment.content || '')

  if (!bin || !/^[0-9]{1,19}$/.test(account) ||
      !/^[A-Za-z0-9 ]{1,50}$/.test(memo)) {
    throw new Error('Thong tin VietQR khong hop le')
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
  const [generated, setGenerated] = useState(null)

  const hacklike = payment.account === 'QRPP2S1ZZZZ59102184'
  const key = JSON.stringify([
    payment.bank, payment.account, payment.content,
  ])

  useEffect(() => {
    if (hacklike) return undefined

    let active = true

    async function generate() {
      try {
        const payload = createPayload(payment)
        const image = await QRCode.toDataURL(payload, {
          width: 600,
          margin: 3,
          errorCorrectionLevel: 'M',
        })
        if (active) setGenerated({ key, image, error: '' })
      } catch (err) {
        if (active) {
          setGenerated({ key, image: '', error: err.message })
        }
      }
    }

    generate()
    return () => { active = false }
  }, [key, hacklike])

  const image = hacklike
    ? '/provider-qr/hacklike17.png'
    : generated?.key === key ? generated.image : ''

  const error = !hacklike && generated?.key === key
    ? generated.error : ''

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">
          Quét QR nạp tiền
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Mở ứng dụng ngân hàng để quét trực tiếp
        </p>
      </div>

      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {image && (
        <div className="flex shrink-0 flex-col items-center gap-2 rounded-xl bg-white p-3 shadow-sm">
        <>
          <img
            src={image}
            alt={'QR chuyen khoan ' + providerName}
            width={240}
            height={240}
            className="h-48 w-48 max-w-full object-contain sm:h-52 sm:w-52"
          />

          <a
            href={image}
            download={'VietQR-' + providerName + '.png'}
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800"
          >
            Luu anh QR
          </a>
        </>
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-2">
      <span className="block break-all text-center text-xs text-slate-600">
        {payment.bank} - {payment.account}
      </span>
      <span className="block text-sm font-semibold text-slate-800">
        {payment.content}
      </span>
      <span className="block text-xs text-amber-700">
        Kiem tra nguoi nhan truoc khi chuyen tien
      </span>
      </div>
      </div>
    </div>
  )
}
