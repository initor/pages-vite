import { basename } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// This page is served at https://pages.waynewen.com/<directory name>/, so the
// directory name is the base path. Renaming the directory moves the URL.
export default defineConfig({
  base: `/${basename(import.meta.dirname)}/`,
  plugins: [react(), tailwindcss()],
})
