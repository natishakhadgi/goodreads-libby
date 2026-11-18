import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
        'process.env.BASE_URL': JSON.stringify(env.BASE_URL),
        'process.env.LOCAL_API': JSON.stringify(env.LOCAL_API),
        'process.env.NICOLE_PROFILE': JSON.stringify(env.NICOLE_PROFILE)
    },
    server: {
      proxy: {
        '/api/overdrive': {
          target: 'https://thunder.api.overdrive.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/overdrive/, '/v2'),
        },
      },
    },
    plugins: [react()],
  };
})