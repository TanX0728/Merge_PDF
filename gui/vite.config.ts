import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // 确保端口不会自动跳到 5174
    watch: {
      usePolling: true, // 强制使用轮询监听文件变化，解决某些环境下 HMR 失效的问题
    },
  }
})