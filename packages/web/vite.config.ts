import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const DEV_API_URL = "http://127.0.0.1:4000"
const PROD_API_URL = process.env.HERMIUM_API_URL || "http://127.0.0.1:47474"

export default defineConfig({
  plugins: [
    devtools(),
    nitro({
      routeRules: {
        "/api/**": { proxy: PROD_API_URL + "/api/**" },
        "/upload/**": { proxy: PROD_API_URL + "/upload/**" },
        "/health": { proxy: PROD_API_URL + "/health" },
        "/webhook": { proxy: PROD_API_URL + "/webhook" },
      },
    }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: DEV_API_URL,
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on("error", (err, _req, res) => {
            const msg = `Proxy error: API at ${options.target} is unreachable. Did you start the API server (bun run dev:api)?`
            console.error(msg, err.message)
            const serverRes = res as import("http").ServerResponse
            if (serverRes && !serverRes.headersSent) {
              serverRes.writeHead(502, { "Content-Type": "application/json" })
              serverRes.end(JSON.stringify({ error: { message: msg } }))
            }
          })
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin")
            proxyReq.removeHeader("referer")
          })
          proxy.on("proxyRes", (proxyRes) => {
            proxyRes.headers["cache-control"] = "no-cache"
            proxyRes.headers["x-accel-buffering"] = "no"
          })
        },
      },
      "/upload": { target: DEV_API_URL, changeOrigin: true },
      "/health": { target: DEV_API_URL, changeOrigin: true },
      "/webhook": { target: DEV_API_URL, changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Put all dependencies into a single vendor chunk to avoid
          // circular chunk dependencies that break React hydration.
          if (id.includes("node_modules")) {
            return "vendor"
          }
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
  },
})
