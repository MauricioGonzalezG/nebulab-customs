import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import emailHandler from './api/send-email';
import notifySaleHandler from './api/notify-sale';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handler =
          req.url && req.url.startsWith('/api/send-email')
            ? emailHandler
            : req.url && req.url.startsWith('/api/notify-sale')
              ? notifySaleHandler
              : null;
        if (handler) {
          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.end('OK');
            return;
          }

          const buildCustomRes = () => ({
            statusCode: 200,
            headers: {} as Record<string, string>,
            setHeader(name: string, value: string) {
              (this as any).headers[name] = value;
              res.setHeader(name, value);
            },
            status(code: number) {
              (this as any).statusCode = code;
              res.statusCode = code;
              return this;
            },
            json(data: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = (this as any).statusCode || 200;
              res.end(JSON.stringify(data));
            },
            send(data: any) {
              res.statusCode = (this as any).statusCode || 200;
              res.end(data);
            },
          });

          if (req.method === 'GET') {
            try {
              const url = new URL(req.url || '', 'http://localhost');
              const query: Record<string, string> = {};
              url.searchParams.forEach((value, key) => {
                query[key] = value;
              });
              await handler({ method: req.method, query, headers: req.headers }, buildCustomRes());
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, message: err?.message || 'Dev server api error' }));
            }
            return;
          }

          if (req.method === 'POST') {
            let bodyStr = '';
            req.on('data', (chunk) => {
              bodyStr += chunk;
            });
            req.on('end', async () => {
              try {
                const body = bodyStr ? JSON.parse(bodyStr) : {};
                const customReq = { method: req.method, body, headers: req.headers };
                await handler(customReq, buildCustomRes());
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, message: err?.message || 'Dev server api error' }));
              }
            });
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
  server: {
    port: 3000,
    open: true,
  },
});
