import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8101',
        changeOrigin: true,
      }
    }
  },
  build: {
    target: ['chrome61', 'safari11'],
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@tensorflow/') || id.includes('@mediapipe/')) {
            return 'tfjs-pose'
          }

          if (id.includes('lucide-vue-next')) {
            return 'ui-icons'
          }
        },
      },
    },
  }
})
