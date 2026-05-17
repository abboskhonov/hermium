import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const API_URL = "http://127.0.0.1:4000"

export default defineConfig({
  plugins: [
    devtools(),
    nitro(),
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
        target: API_URL,
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
      "/upload": { target: API_URL, changeOrigin: true },
      "/health": { target: API_URL, changeOrigin: true },
      "/webhook": { target: API_URL, changeOrigin: true },
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
          if (id.includes("node_modules/@tanstack/react-router")) {
            return "router"
          }
          if (id.includes("node_modules/@base-ui")) {
            return "base-ui"
          }
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
