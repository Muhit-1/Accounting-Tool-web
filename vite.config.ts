import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // VITE_API_URL is baked into the bundle, so a production build without it
  // (e.g. a forgotten build variable in the deploy tool) would ship an app
  // that can never reach its API. Fail the build instead of the first login.
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    if (!env.VITE_API_URL?.trim()) {
      throw new Error(
        'VITE_API_URL is not set. Provide it at build time (Docker: --build-arg VITE_API_URL=https://api.example.com).',
      )
    }
  }

  return {
    plugins: [react(), tailwindcss()],
  }
})
