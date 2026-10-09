import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) return 'firebase-firestore'
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase-core'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('lucide-react') || id.includes('react-fast-marquee') || id.includes('react-hot-toast')) return 'vendor-ui'
          if (id.includes('date-fns')) return 'vendor-dates'
        },
      },
    },
  },
})
