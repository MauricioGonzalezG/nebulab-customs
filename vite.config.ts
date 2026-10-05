import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import emailHandler from './api/send-email';
import notifySaleHandler from './api/notify-sale';
import storeHandler from './api/store';
import mercadoPagoPreferenceHandler from './api/mercadopago-preference';
import mercadoPagoWebhookHandler from './api/mercadopago-webhook';

function apiDevServerPlugin(): Plugin {
  const handlers: Record<string, (req: any, res: any) => Promise<any> | any> = {
    '/api/send-email': emailHandler,
    '/api/notify-sale': notifySaleHandler,
    '/api/store': storeHandler,
    '/api/mercadopago-preference': mercadoPagoPreferenceHandler,
    '/api/mercadopago-webhook': mercadoPagoWebhookHandler,
  };
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        const handler = handlers[pathname];
        if (!handler) return next();

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

        const invoke = async (body: any = {}) => {
          try {
            await handler({ method: req.method, body, headers: req.headers, query: Object.fromEntries(new URL(req.url || '/', 'http://localhost').searchParams) }, customRes);
          } catch (error: any) {
            if (res.writableEnded) return;
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: error?.message || 'Error de API en desarrollo.' }));
          }
        };

        if (req.method === 'GET' || req.method === 'OPTIONS') return invoke();
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let bodyText = '';
        req.on('data', (chunk) => {
          bodyText += chunk;
          if (bodyText.length > 10_000_000) req.destroy();
        });
        req.on('end', () => {
          let body = {};
          try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { body = {}; }
          void invoke(body);
        });
      });
    },
  };
}

const SERVER_ENV_KEYS = [
  'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ADMIN_EMAIL', 'ADMIN_PASSWORD',
  'MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_CURRENCY', 'COP_EXCHANGE_RATE', 'APP_URL',
  'MAILTRAP_API_TOKEN', 'MAILTRAP_SENDER_EMAIL', 'SMTP_GMAIL_USER', 'SMTP_GMAIL_APP_PASSWORD',
  'ADMIN_NOTIFICATION_EMAIL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of SERVER_ENV_KEYS) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [react(), apiDevServerPlugin()],
    server: { port: 3000, open: true },
    build: { emptyOutDir: true },
  };
});
