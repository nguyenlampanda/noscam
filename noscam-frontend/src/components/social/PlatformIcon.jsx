function FacebookIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.5 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.8 1.8-1.8H17V2.4c-.8-.1-1.7-.2-2.5-.2-2.6 0-4.4 1.6-4.4 4.6v2.7H7V13h3.1v9h3.4Z" />
    </svg>
  )
}

function InstagramIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
      />
      <circle
        cx="17.5"
        cy="6.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}

function TikTokIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.4 2h3.1c.3 1.8 1.4 3.2 3.2 3.9v3.2a9.1 9.1 0 0 1-3.2-1.1v7.1a6.9 6.9 0 1 1-6.9-6.9c.4 0 .8 0 1.2.1v3.3a3.6 3.6 0 1 0 2.6 3.5V2Z" />
    </svg>
  )
}

export default function PlatformIcon({
  platform,
  className = 'h-5 w-5',
}) {
  const value =
    String(platform || '').toLowerCase()

  if (value.includes('facebook')) {
    return (
      <FacebookIcon
        className={className}
      />
    )
  }

  if (value.includes('instagram')) {
    return (
      <InstagramIcon
        className={className}
      />
    )
  }

  if (value.includes('tiktok')) {
    return (
      <TikTokIcon
        className={className}
      />
    )
  }

  return (
    <div
      className={`${className} rounded-full bg-slate-300`}
    />
  )
}
