import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Fix for large file uploads timing out
        timeout: 120000,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Remove default content-length limit for file uploads
            proxyReq.setHeader('connection', 'keep-alive');
          });
        },
      }
    }
  }
})
