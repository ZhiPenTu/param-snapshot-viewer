import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json'

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: { host: '127.0.0.1', port: 5173 },
  build: { outDir: 'dist', emptyOutDir: true },
})
