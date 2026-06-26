import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    // Pozwól Vite serwować źródła pakietu @aetherfall/shared (poza katalogiem client).
    fs: { allow: [".."] },
  },
  define: {
    // Adres serwera Colyseus – nadpisywalny przez VITE_SERVER_URL.
    __DEV__: true,
  },
});
