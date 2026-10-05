# Configuración segura del servidor

La autenticación, la base de datos, los pedidos y la creación/verificación de pagos se ejecutan en funciones del servidor. Configura estas variables privadas en Vercel y en `.env.local` para desarrollo:

| Variable | Uso |
| --- | --- |
| `TURSO_DATABASE_URL` | URL privada de la base Turso |
| `TURSO_AUTH_TOKEN` | Token privado de Turso |
| `ADMIN_EMAIL` | Cuenta administradora |
| `ADMIN_PASSWORD` | Contraseña única y larga para el panel |
| `MERCADOPAGO_ACCESS_TOKEN` | Token privado para crear preferencias y verificar pagos |
| `MERCADOPAGO_CURRENCY` | `COP` o `USD` |
| `COP_EXCHANGE_RATE` | Pesos colombianos por dólar, por ejemplo `4000` |
| `APP_URL` | Dominio público HTTPS de la tienda |
| `TELEGRAM_BOT_TOKEN` | Token privado del bot de notificaciones |
| `TELEGRAM_CHAT_ID` | Chat privado que recibirá las notificaciones |

Los secretos no deben tener el prefijo `VITE_`: Vite publica esas variables en el navegador. Elimina las variables antiguas `VITE_TURSO_DATABASE_URL`, `VITE_TURSO_AUTH_TOKEN`, `VITE_ADMIN_DEFAULT_EMAIL`, `VITE_ADMIN_DEFAULT_PASSWORD` y `VITE_MERCADOPAGO_ACCESS_TOKEN` de Vercel y de los archivos locales.

En Vercel, configura las variables en **Project → Settings → Environment Variables** y vuelve a desplegar desde el repositorio para generar un artefacto limpio. En desarrollo, usa `.env.local` en la raíz. Los precios base también están definidos en `server/store.ts`; si cambian los valores predeterminados de `public/prices.xml`, actualiza esa tabla en el mismo cambio.

## Migración de cuentas existentes

En la primera solicitud al servidor, una migración invalida las cuentas de cliente antiguas, borra sus sesiones y desvincula los pedidos de esos IDs. Conserva los pedidos, sus datos y las imágenes para que el administrador pueda gestionarlos. Los clientes pueden crear una cuenta nueva; por seguridad, esa cuenta no heredará pedidos antiguos porque el sistema anterior no verificaba la propiedad del correo. Los códigos antiguos de seis dígitos ya no permiten consultar datos personales. Los nuevos pedidos usan códigos aleatorios de alta entropía.

## Rotación de credenciales

Rota las credenciales antiguas que pudieron quedar en archivos JavaScript descargados por el navegador:

1. En Turso, crea un token nuevo, actualiza `TURSO_AUTH_TOKEN` y revoca el anterior.
2. En Mercado Pago, crea un token de acceso nuevo, actualiza `MERCADOPAGO_ACCESS_TOKEN` y revoca el anterior.
3. Cambia `ADMIN_PASSWORD` por una contraseña única.
4. Si correo, Telegram o contraseñas SMTP estaban configurados en el sistema anterior, rótalos con sus proveedores y actualízalos en el panel. Rota también el secreto de integridad de Wompi si se llegó a usar en una versión anterior.
5. Despliega desde el repositorio en Vercel. No publiques una carpeta `dist` local preexistente: podría conservar bundles JavaScript antiguos.
