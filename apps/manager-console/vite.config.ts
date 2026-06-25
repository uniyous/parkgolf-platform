import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // API URL에서 프록시 타겟 설정
  const proxyTarget = env.VITE_API_URL || 'http://localhost:3091';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@/shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
        "@/features": fileURLToPath(new URL("./src/features", import.meta.url)),
        "@/app": fileURLToPath(new URL("./src/app", import.meta.url)),
      },
    },
    server: {
      port: 3001,
      host: "0.0.0.0",
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path,
        },
      },
    },
  };
});
