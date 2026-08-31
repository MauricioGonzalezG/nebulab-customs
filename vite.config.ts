import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import emailHandler from './api/send-email';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/send-email')) {
          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.end('OK');
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
                const customRes = {
                  statusCode: 200,
                  headers: {} as Record<string, string>,
                  setHeader(name: string, value: string) {
                    this.headers[name] = value;
                    res.setHeader(name, value);
                  },
                  status(code: number) {
                    this.statusCode = code;
                    res.statusCode = code;
                    return this;
                  },
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = this.statusCode || 200;
                    res.end(JSON.stringify(data));
                  },
                  send(data: any) {
                    res.statusCode = this.statusCode || 200;
                    res.end(data);
                  },
                };
                await emailHandler(customReq, customRes);
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, message: err?.message || 'Dev server email error' }));
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
