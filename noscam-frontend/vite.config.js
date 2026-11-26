import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')

    const required = [
      'VITE_REVERB_APP_KEY',
      'VITE_REVERB_HOST',
      'VITE_REVERB_PORT',
      'VITE_REVERB_SCHEME',
    ]

    const missing = required.filter(
      (name) => !env[name]?.trim()
    )

    if (missing.length) {
      throw new Error(
        '[NoScam Build Guard] Missing production configuration: ' +
        missing.join(', ')
      )
    }

    if (
      env.VITE_REVERB_HOST !== 'noscam.vn' ||
      env.VITE_REVERB_PORT !== '443' ||
      env.VITE_REVERB_SCHEME !== 'https'
    ) {
      throw new Error(
        '[NoScam Build Guard] Invalid production Reverb configuration.'
      )
    }

    console.log('[NoScam Build Guard] Production Reverb configuration: PASS')
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
  }
})
