import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
import { defineConfig } from "vite"
import { crx } from "@crxjs/vite-plugin"
import preact from "@preact/preset-vite"
import manifest from "./manifest"

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "build",
    rollupOptions: {
      input: {
        details: resolve(root, "src/details/index.html"),
      },
      output: {
        chunkFileNames: "assets/chunk-[hash].js",
      },
    },
  },
  plugins: [crx({ manifest }), preact()],
})
