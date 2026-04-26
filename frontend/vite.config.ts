import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true, // bind 0.0.0.0 so phone on LAN can hit it for QR sideload
    port: 5173,
  },
})
