import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const dist = resolve(process.argv[2] || 'dist')
const files = []

function collect(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)

    if (statSync(path).isDirectory()) {
      collect(path)
    } else if (/\.(js|html)$/.test(name)) {
      files.push(path)
    }
  }
}

try {
  collect(dist)
} catch (error) {
  console.error('STOP: Production build directory missing.')
  process.exit(1)
}

if (!files.some(path => path.endsWith('.js'))) {
  console.error('STOP: No JavaScript build assets found.')
  process.exit(1)
}

const forbidden = [
  /https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/api/i,
  /https?:\/\/\[::1\](?::\d+)?\/api/i,
]

let failed = false

for (const file of files) {
  const content = readFileSync(file, 'utf8')

  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      console.error(`STOP: Localhost API detected in ${file}`)
      failed = true
    }
  }
}

if (failed) process.exit(1)

console.log('PASS: No localhost API URL in production build.')
