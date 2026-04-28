import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // Префікс для GitHub Pages: https://<user>.github.io/skybud-web-app-redesign/
  // Якщо буде custom domain — змінити на '/'
  base: "/skybud-web-app-redesign/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
  },
  preview: {
    port: 3001,
    host: true,
  },
})
