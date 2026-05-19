import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          // rewrite no es necesario, el target ya sirve en /api/
        }
      }
    },
    build: {
      // Generar sourcemaps para debugging en producción (opcional, comentar si no se necesita)
      // sourcemap: true,
      rollupOptions: {
        output: {
          // Chunks para mejor caching
          manualChunks: {
            vendor: ['react', 'react-dom'],
          }
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
