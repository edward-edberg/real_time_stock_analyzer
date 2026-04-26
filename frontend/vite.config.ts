import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: true, // bind 0.0.0.0 so phone on LAN can hit it for QR sideload
    port: 5173,
  },
})
