import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'منصة نغم',
        short_name: 'نغم',
        description: 'مكتبة نغم الصوتية الأولى',
        theme_color: '#4f46e5',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3011/3011270.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})