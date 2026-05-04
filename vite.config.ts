import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // pix-utils importa `buffer` via dynamicPayload; sem polyfill o bundle pode falhar no browser
      buffer: 'buffer/',
    },
  },
})
