import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    host: true,
    open: '/',
  },
  build: {
    outDir: 'dist',
    // 分包构建：带 hash 的资源文件浏览器会长期缓存
    rollupOptions: {
      input: { index: 'index.html' },
      output: {
        // 把大依赖分离成独立 chunk，按需加载
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
