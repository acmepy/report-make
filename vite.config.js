import { defineConfig } from "vite";
import pkg from "./package.json";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          const normalizedId = id.toLowerCase();

          if (normalizedId.includes("vfs_fonts")) return "pdfmake-fonts";

          if (normalizedId.includes("pdfmake")) return "pdfmake";

          if (
            normalizedId.includes("@codemirror") ||
            normalizedId.includes("codemirror")
          ) {
            return "codemirror";
          }

          if (normalizedId.includes("@lezer")) return "lezer";
          if (normalizedId.includes("style-mod")) return "style-mod";
          if (normalizedId.includes("w3c-keyname")) return "w3c-keyname";
          if (normalizedId.includes("crelt")) return "crelt";

          return "vendor";
        },
      },
    },
  },
});
