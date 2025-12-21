import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/vtt/room1/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // Generuj przewidywalne nazwy plików
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    },
    server: {
      proxy: {
        '/vtt/room1/backend': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/vtt\/room1\/backend/, '')
        }
      }
    }
  }
})