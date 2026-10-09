import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/usuarios': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/produtos': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
