import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { previewHeaders, developmentHeaders } from './security-headers.mjs'

export default defineConfig({
  plugins: [react()],
  // Public pre-rendering resolves every source image through this manifest.
  build: { manifest: true, assetsInlineLimit: 0 },
  server: {
    host: '127.0.0.1', headers: developmentHeaders,
    fs: {
      strict: true, allow: [fileURLToPath(new URL('.', import.meta.url))],
      deny: ['**/.env', '**/.env.*', '**/*.{crt,pem,key,p12,pfx,cer,der}', '**/.npmrc', '**/.yarnrc.yml', '**/.git/**', '**/.backups/**', '**/private-exports/**'],
    },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, headers: previewHeaders },
})
