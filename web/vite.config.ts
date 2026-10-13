import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Lets code import from "@/..." instead of long relative paths like "../../".
      // Must match the "paths" setting in tsconfig.json and tsconfig.app.json.
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
