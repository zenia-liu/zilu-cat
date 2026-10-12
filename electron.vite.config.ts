import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    root: resolve('src/renderer'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          pet: resolve('src/renderer/pet/index.html'),
          panel: resolve('src/renderer/panel/index.html'),
          settings: resolve('src/renderer/settings/index.html'),
        },
      },
    },
  },
})
