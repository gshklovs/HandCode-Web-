import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          mediapipe: ['@mediapipe/hands', '@mediapipe/camera_utils'],
          tensorflow: ['@tensorflow/tfjs']
        }
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    },
    include: ['@mediapipe/hands', '@mediapipe/camera_utils']
  }
})
