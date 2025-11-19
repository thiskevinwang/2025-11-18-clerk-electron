import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  main: {
    plugins: [
      tsConfigPaths({
        root: __dirname,
        projects: ['./tsconfig.node.json']
      }),
      externalizeDepsPlugin()
    ]
  },
  preload: {
    plugins: [
      tsConfigPaths({
        root: __dirname,
        projects: ['./tsconfig.node.json']
      }),
      externalizeDepsPlugin()
    ]
  },
  renderer: {
    plugins: [
      tsConfigPaths({
        root: __dirname,
        projects: ['./tsconfig.web.json']
      }),
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true
      }),
      react(),
      tailwindcss()
    ]
  }
})
