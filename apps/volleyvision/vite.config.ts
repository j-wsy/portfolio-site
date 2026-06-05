import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/volleyvision/',
  build: {
    outDir: '../../docs/volleyvision',
    emptyOutDir: true,
  },
})
