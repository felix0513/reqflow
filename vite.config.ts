import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import os from 'os';

// Vite 配置：React 插件 + 路径别名 @ -> src
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      output: {
        // 将大体积第三方库拆分为独立 chunk，避免阻塞首屏
        manualChunks: {
          excel: ['xlsx'],
          mdeditor: ['@uiw/react-md-editor'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  cacheDir: path.join(os.tmpdir(), 'vite-cache-reqflow'),
  optimizeDeps: {
    force: true,
    include: [
      '@mui/material',
      '@mui/system',
      '@emotion/react',
      '@emotion/styled',
      '@mui/icons-material',
      '@mui/x-charts',
    ],
  },
});
