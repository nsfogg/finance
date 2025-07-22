import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use different base URLs for dev vs production
  base: command === 'serve' ? '/' : '/finance/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
}))
