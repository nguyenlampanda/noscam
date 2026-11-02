export default function DigitalPlatformIcon({ platform, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  }

  if (platform === 'instagram') {
    return (
      <svg {...common}>
        <defs>
          <linearGradient id="exchange-ig-gradient" x1="0" y1="24" x2="24" y2="0">
            <stop stopColor="#FEDA75" />
            <stop offset=".45" stopColor="#D62976" />
            <stop offset="1" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5"
          stroke="url(#exchange-ig-gradient)" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="4.1"
          stroke="url(#exchange-ig-gradient)" strokeWidth="2.5" />
        <circle cx="17.8" cy="6.5" r="1.3" fill="#D62976" />
      </svg>
    )
  }

  if (platform === 'tiktok') {
    return (
      <svg {...common}>
        <path d="M14 3v11.1a4.7 4.7 0 1 1-4.7-4.7"
          stroke="#25F4EE" strokeWidth="3" strokeLinecap="round" />
        <path d="M15 3c.7 3.4 2.4 5.2 5.5 5.6"
          stroke="#FE2C55" strokeWidth="3" strokeLinecap="round" />
        <path d="M14.5 3v11.1a4.7 4.7 0 1 1-4.7-4.7M14.5 3c.7 3.4 2.4 5.2 5.5 5.6"
          stroke="#111827" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (platform === 'facebook') {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#1877F2" />
        <path d="M14.6 22v-8.2h2.5l.4-3.1h-2.9V8.8c0-.9.3-1.5 1.6-1.5h1.5V4.5c-.7-.1-1.5-.2-2.3-.2-2.7 0-4.4 1.6-4.4 4.5v1.9H8.5v3.1H11V22"
          fill="white" />
      </svg>
    )
  }

  if (platform === 'threads') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" fill="#111827" />
        <path d="M16.5 9.5c-.5-2.3-2-3.4-4.5-3.4-3.4 0-5 2.3-5 5.9 0 4 1.8 6.1 5.1 6.1 3.2 0 4.8-1.7 4.8-4.1 0-2.4-1.5-3.5-4.2-3.5-1.7 0-2.7.7-2.7 1.8 0 1.1.9 1.8 2.2 1.8 2 0 3.2-1.8 3.2-4.2 0-1.1-.3-2.2-.9-3"
          stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }

  if (platform === 'website') {
    return <span aria-hidden="true" style={{fontSize:size}}>🌐</span>
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}
