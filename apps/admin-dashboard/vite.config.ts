import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: "0.0.0.0",
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3091',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
