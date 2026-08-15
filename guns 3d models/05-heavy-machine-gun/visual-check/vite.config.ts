import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: true,
    port: 4177,
    strictPort: true,
    allowedHosts: ['localhost', '127.0.0.1', '.manus.computer', '.manusvm.computer'],
  },
});
