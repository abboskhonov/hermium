import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const config = defineConfig({
  resolve: {
    alias: {
      // react-syntax-highlighter uses old lowlight paths
      "lowlight/lib/core": "lowlight/lib/core.js",
    },
  },
  optimizeDeps: {
    // Pre-bundle syntax highlighter and its transitive deps so Vite's esbuild
    // converts CJS → ESM and fixes default-export interop issues.
    include: [
      "react-syntax-highlighter",
      "refractor",
      "lowlight",
      "debug",
    ],
    esbuildOptions: {
      target: "es2022",
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:47474",
        changeOrigin: true,
      },
    },
    fs: {
      allow: ["..", "../..", "../../node_modules/.bun"],
    },
  },
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})

export default config
