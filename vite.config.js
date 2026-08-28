import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    // 让 / 自动重定向到 /dev.html，避免 dev server 找 index.html
    {
      name: 'redirect-to-dev',
      configureServer(server) {
        server.middlewares.use('/', (req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/dev.html'
          }
          next()
        })
      },
    },
  ],
  base: './',
  server: {
    port: 3000,
    host: true,
    open: '/dev.html',
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: { index: 'dev.html' },
    },
  },
})
