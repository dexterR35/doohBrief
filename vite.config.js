import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/__tests__/**/*.test.{js,jsx}'],
    pool: 'vmThreads',
    maxWorkers: 4,
  },
  server: {
    proxy: {
      
      // Proxy /api to local API server (avoids CORS when running locally)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers.authorization
            if (auth) proxyReq.setHeader('Authorization', auth)
          })
        },
      },
    },
  },
})
