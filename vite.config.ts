import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'no-cache-sw-and-html',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url === '/sw.js' || req.url.startsWith('/sw.js?') || req.url === '/' || req.url.endsWith('.html'))) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
          next();
        });
      }
    }
  ],
  server: {
    host: true
  },
  // OCR local : workers en modules ES (code partagé + onnxruntime-web)
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
})
