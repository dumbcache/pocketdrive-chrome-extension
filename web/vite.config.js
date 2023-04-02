import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
    plugins: [
        react(),
        // VitePWA({
        //     registerType: "autoUpdate",
        //     injectRegister: "auto",
        //     devOptions: { enabled: true },
        //     manifest: { name: "krabs" },
        // }),
    ],
    // appType: "spa",
});
