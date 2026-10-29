import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({ plugins: [react()], test: { include: ['tests/auth-ui/**/*.test.jsx'], environment: 'jsdom', environmentOptions: { jsdom: { url: 'http://localhost:5173' } } } })
