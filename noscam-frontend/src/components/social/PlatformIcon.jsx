
// NOSCAM_BRAND_ICONS_V2

function FacebookIcon({ className }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="13" fill="#1877F2" />
      <path
        d="M28.2 41V26.4h4.9l.75-5.7h-5.65v-3.65c0-1.65.46-2.77 2.83-2.77h3.02V9.18c-.52-.07-2.32-.22-4.41-.22-4.37 0-7.36 2.67-7.36 7.58v4.16h-4.94v5.7h4.94V41Z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

function InstagramIcon({ className }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="noscam-instagram-gradient"
          x1="0"
          y1="48"
          x2="48"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFDC80" />
          <stop offset=".27" stopColor="#F77737" />
          <stop offset=".55" stopColor="#E1306C" />
          <stop offset=".78" stopColor="#C13584" />
          <stop offset="1" stopColor="#5851DB" />
        </linearGradient>
      </defs>

      <rect
        width="48"
        height="48"
        rx="13"
        fill="url(#noscam-instagram-gradient)"
      />

      <rect
        x="10.5"
        y="10.5"
        width="27"
        height="27"
        rx="8"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.2"
      />

      <circle
        cx="24"
        cy="24"
        r="6.6"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.2"
      />

      <circle
        cx="32.2"
        cy="15.8"
        r="2"
        fill="#FFFFFF"
      />
    </svg>
  )
}

function TikTokIcon({ className }) {
  const path =
    "M27.5 8h6.2c.55 3.7 2.7 6.4 6.3 7.7v6.4a18 18 0 0 1-6.3-2.2v12.2a12 12 0 1 1-12-12c.8 0 1.6.08 2.3.2v6.4a5.7 5.7 0 1 0 3.5 5.3V8Z"

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="13" fill="#09090B" />

      <path
        d={path}
        fill="#25F4EE"
        transform="translate(-1.1 1)"
      />

      <path
        d={path}
        fill="#FE2C55"
        transform="translate(1.1 -0.8)"
      />

      <path d={path} fill="#FFFFFF" />
    </svg>
  )
}

export default function PlatformIcon({
  platform,
  className = 'h-5 w-5',
}) {
  const value = String(platform || '').toLowerCase()

  if (value.includes('facebook')) {
    return <FacebookIcon className={className} />
  }

  if (value.includes('instagram')) {
    return <InstagramIcon className={className} />
  }

  if (value.includes('tiktok')) {
    return <TikTokIcon className={className} />
  }

  // Icon cho các nền tảng tăng tương tác mở rộng.
  const icons = {
    threads: {
      bg: '#111111',
      path: <path d="M16.5 9.5c-.5-2.3-2-3.4-4.5-3.4-3.4 0-5 2.3-5 5.9 0 4 1.8 6.1 5.1 6.1 3.2 0 4.8-1.7 4.8-4.1 0-2.4-1.5-3.5-4.2-3.5-1.7 0-2.7.7-2.7 1.8 0 1.1.9 1.8 2.2 1.8 2 0 3.2-1.8 3.2-4.2 0-1.1-.3-2.2-.9-3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />,
    },
    youtube: {
      bg: '#FF0033',
      path: <><rect x="4" y="6" width="16" height="12" rx="4" fill="white" /><path d="m10 9 5 3-5 3z" fill="#FF0033" /></>,
    },
    telegram: {
      bg: '#229ED9',
      path: <path d="M3 11.5 21 4l-3.7 16-5.2-4-2.6 2.4.5-4.3L17.4 7 8.7 13l-5.7-1.5z" fill="white" />,
    },
    twitter: {
      bg: '#111111',
      path: <path d="M5 4h3.5L19 20h-3.5L5 4zm13.5 0L5 20" stroke="white" strokeWidth="2" fill="none" />,
    },
    discord: {
      bg: '#5865F2',
      path: <><path d="M7 7.5c3.3-1.8 6.7-1.8 10 0 1.8 2.5 2.7 5.3 3 8.2-1.4 1.1-2.9 1.9-4.5 2.4l-.9-1.4c.6-.2 1.2-.5 1.7-.8-3.4 1.6-7.2 1.6-10.6 0 .5.3 1.1.6 1.7.8l-.9 1.4C5.9 17.6 4.4 16.8 3 15.7c.3-2.9 1.2-5.7 3-8.2z" fill="white"/><circle cx="9" cy="12.5" r="1" fill="#5865F2"/><circle cx="15" cy="12.5" r="1" fill="#5865F2"/></>,
    },
    spotify: {
      bg: '#1DB954',
      path: <><path d="M5 9c4.6-1.4 9.6-.9 14 1.2M6 12.5c4-1.2 8.5-.7 12 1.1M7 16c3.4-.9 7-.5 10 1" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></>,
    },
    soundcloud: {
      bg: '#FF5500',
      path: <><path d="M4 13v4m2-7v7m2-9v9m2-10v10m2-9v9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><path d="M13 17h5a3 3 0 0 0 0-6 5 5 0 0 0-5-4z" fill="white"/></>,
    },
    pinterest: {
      bg: '#E60023',
      path: <><circle cx="12" cy="12" r="8" fill="white"/><path d="M10 19l2-9c.7-2 4-1 3 1.5-.5 1.8-2 3-4 2" stroke="#E60023" strokeWidth="2" fill="none" strokeLinecap="round"/></>,
    },
    linkedin: {
      bg: '#0A66C2',
      path: <><circle cx="7" cy="7" r="1.5" fill="white"/><path d="M6 10v8m5 0v-8m0 3c0-4 7-4 7 0v5" stroke="white" strokeWidth="2.5" fill="none"/></>,
    },
    twitch: {
      bg: '#9146FF',
      path: <><path d="M5 5h15v10l-4 4h-4l-3 2v-2H5z" fill="white"/><path d="M11 9v5m5-5v5" stroke="#9146FF" strokeWidth="2"/></>,
    },
    reddit: {
      bg: '#FF4500',
      path: <><circle cx="12" cy="13" r="6.5" fill="white"/><circle cx="9.5" cy="12.5" r="1" fill="#FF4500"/><circle cx="14.5" cy="12.5" r="1" fill="#FF4500"/><path d="M9 15c2 1.5 4 1.5 6 0" stroke="#FF4500" fill="none" strokeLinecap="round"/><path d="m12 7 1-3 3 1" stroke="white" strokeWidth="1.5" fill="none"/></>,
    },
    snapchat: {
      bg: '#FFFC00',
      path: <path d="M12 4c-3 0-4 2.5-4 5.5v2L6 13l2.5 1.5c-.5 2-2 2.5-3 3 2 .5 3 .5 4 .5l2.5 1 2.5-1c1 0 2 0 4-.5-1-.5-2.5-1-3-3L18 13l-2-1.5v-2C16 6.5 15 4 12 4z" fill="white" stroke="#111" strokeWidth="1.2"/>,
    },
    whatsapp: {
      bg: '#25D366',
      path: <><path d="M6 18 4 21l1-5a8 8 0 1 1 3 3z" fill="none" stroke="white" strokeWidth="2"/><path d="M9 9c1 4 3 6 6 6l1-2-2-1-1 1-2-2 1-1-1-2z" fill="white"/></>,
    },
    zalo: {
      bg: '#0068FF',
      path: <><rect x="4" y="5" width="16" height="14" rx="4" fill="white"/><text x="12" y="14.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#0068FF">Zalo</text></>,
    },
  }

  const icon = icons[value]

  if (icon) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={value}
      >
        <rect width="24" height="24" rx="6" fill={icon.bg} />
        {icon.path}
      </svg>
    )
  }

  return (
    <div
      className={`${className} flex items-center justify-center rounded-xl bg-slate-100 text-slate-600`}
      title={value}
    >
      <span className="text-xs font-bold">#</span>
    </div>
  )
}
