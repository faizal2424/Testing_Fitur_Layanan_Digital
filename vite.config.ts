import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],

  server: {
    proxy: {
      // Di dev mode: semua /api/* di-forward ke backend Hono (port 3001)
      // Sehingga cookie dari backend ter-set ke localhost:5173 (same-site)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Teruskan cookie dari backend ke browser
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Hapus SameSite=None dari cookie saat di-proxy agar kompatibel di dev
            const setCookieHeader = proxyRes.headers['set-cookie'];
            if (setCookieHeader) {
              proxyRes.headers['set-cookie'] = (
                Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
              ).map((cookie: string) =>
                cookie
                  .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
                  .replace(/;\s*Secure/gi, '')
              );
            }
          });
        }
      }
    }
  }
});

