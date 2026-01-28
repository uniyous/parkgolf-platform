import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // API Base URL에서 프록시 타겟 추출
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3092/api';
  const proxyTarget = apiBaseUrl.replace(/\/api$/, '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3002,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});
