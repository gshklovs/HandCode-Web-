import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  resolve: {
    alias: {
      '@mediapipe/hands': '/node_modules/@mediapipe/hands/hands.js',
      '@mediapipe/camera_utils': '/node_modules/@mediapipe/camera_utils/camera_utils.js'
    }
  }
})
