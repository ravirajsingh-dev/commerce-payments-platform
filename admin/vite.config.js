import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dotenv from "dotenv";

// Load env: base .env first, then .env.prod for production builds so VITE_* are correct at build time.
dotenv.config({ path: "../.env" });
if (process.env.NODE_ENV === "production" || process.env.DEP_ENV === "prod") {
  dotenv.config({ path: "../.env.prod" });
}

export default defineConfig({
  define: {
    __BUNDLED_DEV__: JSON.stringify(false),
  },
  experimental: {
    bundledDev: false,
  },
  plugins: [react()],
  server: {
    host: true,
    port: Number(
      process.env.VITE_APP_ADMIN_PORT || process.env.VITE_APP_PORT || 3001,
    ),
    proxy: {
      "/api": {
        target: process.env.VITE_APP_SERVER_URL || "http://server:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("node_modules/@reduxjs/toolkit") ||
            id.includes("node_modules/redux/") ||
            id.includes("node_modules/react-redux/")
          ) {
            return "redux-vendor";
          }
          if (
            id.includes("node_modules/react-bootstrap") ||
            id.includes("node_modules/bootstrap/")
          ) {
            return "ui-vendor";
          }
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router")
          ) {
            return "react-vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  resolve: {
    extensions: [".js", ".jsx", ".json"],
    alias: {
      "@src": "/src",
      "@app": "/src/app",
      "@features": "/src/features",
      "@components": "/src/components",
      "@assets": "/src/assets",
      "@hooks": "/src/hooks",
      "@middlewares": "/src/middlewares",
      "@config": "/src/config",
      "@utils": "/src/utils",
    },
  },
});
