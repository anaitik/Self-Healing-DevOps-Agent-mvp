import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.LOKI_URL': JSON.stringify(env.LOKI_URL || env.VITE_LOKI_URL || ''),
        'process.env.GRAFANA_LOKI_USER': JSON.stringify(env.GRAFANA_LOKI_USER || env.VITE_GRAFANA_LOKI_USER || ''),
        'process.env.GRAFANA_LOKI_API_TOKEN': JSON.stringify(env.GRAFANA_LOKI_API_TOKEN || env.VITE_GRAFANA_LOKI_API_TOKEN || ''),
        'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:4000')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
