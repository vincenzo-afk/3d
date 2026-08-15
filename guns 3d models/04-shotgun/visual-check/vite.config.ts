import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 4176,
    strictPort: true,
    allowedHosts: ['.manus.computer', 'localhost'],
  },
});
