import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeBase(raw: string | undefined): string {
  if (raw === undefined || raw === '' || raw === '/') return '/'
  let b = raw.trim()
  if (!b.startsWith('/')) b = `/${b}`
  if (!b.endsWith('/')) b = `${b}/`
  return b
}

// https://vite.dev/config/
export default defineConfig({
  base: normalizeBase(process.env.VITE_BASE_URL),
  plugins: [react()],
  resolve: {
    alias: {
      // pix-utils importa `buffer` via dynamicPayload; sem polyfill o bundle pode falhar no browser
      buffer: 'buffer/',
    },
  },
})
