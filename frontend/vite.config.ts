import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  css: {
    // Deshabilitar LightningCSS y usar procesador CSS estándar
    transformer: 'postcss',
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // No rewrite needed since we want to keep /api in the path
      }
    }
  }
})