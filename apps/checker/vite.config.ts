import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __API_BASE_URL__: JSON.stringify(env.API_BASE_URL || ''),
      __UI_BASE_URL__: JSON.stringify(env.UI_BASE_URL || ''),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
