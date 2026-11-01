import { appRoute } from './src/lib/routes.js'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { previewHeaders, developmentHeaders } from './security-headers.mjs'

export default defineConfig({
  plugins: [react(), {
    name: 'preview-caregiver-routes',
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        const pathname = new URL(request.url, 'http://localhost').pathname
        if (appRoute({pathname}) || /^\/app\/?$/.test(pathname)) request.url = '/app/index.html'
        next()
      })
    },
  }],
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
