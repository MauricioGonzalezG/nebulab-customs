import React, { useState, useEffect } from 'react';
import { tursoService } from '../../lib/turso';
import { emailService } from '../../lib/emailService';
import { EmailSettings } from '../../types';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  Save,
  HelpCircle,
  ExternalLink,
  Bell,
  Package,
  Truck,
  ShieldCheck,
  RefreshCw,
  Info,
  Zap,
  Key,
} from 'lucide-react';

export const EmailSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMailtrapToken, setShowMailtrapToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    success?: boolean;
    message?: string;
    details?: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await tursoService.getEmailSettings();
      // Ensure provider default is mailtrap if missing
      if (!data.provider) {
        data.provider = 'mailtrap';
      }
      setSettings(data);
      if (!testEmail && data.adminNotificationEmail) {
        setTestEmail(data.adminNotificationEmail);
      }
    } catch (err) {
      console.error('Error loading email settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await tursoService.saveEmailSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert('Error al guardar la configuración en Turso DB.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!settings) return;

    if (settings.provider === 'mailtrap' && !settings.mailtrapApiToken) {
      setTestStatus({
        success: false,
        message: 'Por favor ingresa primero el Token API de Mailtrap.',
      });
      return;
    }

    if (settings.provider === 'gmail' && (!settings.senderEmail || !settings.gmailAppPassword)) {
      setTestStatus({
        success: false,
        message: 'Por favor ingresa primero el Correo Emisor y la Contraseña de Aplicación de Gmail.',
      });
      return;
    }

    const targetRecipient = testEmail.trim() || settings.adminNotificationEmail || settings.senderEmail;
    if (!targetRecipient) {
      setTestStatus({
        success: false,
        message: 'Por favor ingresa un correo destinatario para la prueba.',
      });
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    try {
      const result = await emailService.sendTestEmail(targetRecipient, settings);
      if (result.success) {
        setTestStatus({
          success: true,
          message: `¡Correo de prueba enviado con éxito a ${targetRecipient} vía ${settings.provider === 'mailtrap' ? 'Mailtrap API' : 'Gmail SMTP'}! Revisa la bandeja de entrada o spam.`,
        });
      } else {
        setTestStatus({
          success: false,
          message: result.message || result.error || 'Error al enviar correo de prueba.',
          details: result.error,
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: 'Error inesperado al conectar con el servicio de correo.',
        details: err?.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const isConfigured =
    settings.provider === 'mailtrap'
      ? Boolean(settings.mailtrapApiToken)
      : Boolean(settings.senderEmail && settings.gmailAppPassword);

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/10 via-violet-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-extrabold text-white font-outfit">
                  Configuración de Notificaciones por Correo
                </h2>
                {settings.enabled && isConfigured ? (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Activo ({settings.provider === 'mailtrap' ? 'Mailtrap API' : 'Gmail SMTP'})
                  </span>
                ) : (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {settings.enabled ? 'Incompleto' : 'Desactivado'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Selecciona tu proveedor preferido (Mailtrap API o Gmail) y personaliza los eventos de correo para clientes y administradores.
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 self-start md:self-auto">
            <span className="text-xs font-bold text-slate-300">
              {settings.enabled ? 'Notificaciones Habilitadas' : 'Notificaciones Desactivadas'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-violet-600"></div>
            </label>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Section 1: Provider Selection & Credentials */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <h3 className="font-extrabold text-base text-white font-outfit flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>1. Proveedor de Envío & Credenciales</span>
            </h3>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{showGuide ? 'Ocultar Guía' : `¿Cómo configurar ${settings.provider === 'mailtrap' ? 'Mailtrap' : 'Gmail'}?`}</span>
            </button>
          </div>

          {/* Provider Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, provider: 'mailtrap', senderEmail: settings.senderEmail || 'hello@demomailtrap.co' })}
              className={`p-4 rounded-2xl border transition-all text-left flex items-start gap-3.5 relative overflow-hidden ${
                settings.provider === 'mailtrap'
                  ? 'bg-gradient-to-br from-cyan-950/40 via-slate-900 to-violet-950/30 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${settings.provider === 'mailtrap' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-white">Mailtrap API</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Envío por API REST HTTPS. Ideal para Vercel Serverless (sin problemas de puertos).
                </p>
              </div>
              {settings.provider === 'mailtrap' && (
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, provider: 'gmail', senderEmail: settings.senderEmail === 'hello@demomailtrap.co' ? '' : settings.senderEmail })}
              className={`p-4 rounded-2xl border transition-all text-left flex items-start gap-3.5 relative overflow-hidden ${
                settings.provider === 'gmail'
                  ? 'bg-gradient-to-br from-violet-950/40 via-slate-900 to-cyan-950/30 border-violet-500/60 shadow-lg shadow-violet-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${settings.provider === 'gmail' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40' : 'bg-slate-800 text-slate-400'}`}>
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-white">Gmail SMTP</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Envío directo con tu cuenta de Gmail y Contraseña de Aplicación de 16 caracteres.
                </p>
              </div>
              {settings.provider === 'gmail' && (
                <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0" />
              )}
            </button>
          </div>

          {/* Interactive Step-by-Step Guide */}
          {showGuide && (
            <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-xs space-y-3 text-slate-300">
              <div className="font-bold text-cyan-300 flex items-center gap-2 text-sm">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>
                  {settings.provider === 'mailtrap'
                    ? '¿Cómo obtener tu Token API en Mailtrap en 2 minutos?'
                    : '¿Cómo obtener tu Contraseña de Aplicación en Google?'}
                </span>
              </div>

              {settings.provider === 'mailtrap' ? (
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                  <li>
                    Ingresa a{' '}
                    <a
                      href="https://mailtrap.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 underline font-semibold inline-flex items-center gap-0.5"
                    >
                      mailtrap.io <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    e inicia sesión.
                  </li>
                  <li>
                    Ve al menú <strong>Sending Domains</strong> o <strong>Email API → API Tokens</strong>.
                  </li>
                  <li>
                    Copia tu <strong>API Token</strong> y pégalo en el campo de abajo.
                  </li>
                  <li>
                    Si usas el dominio de prueba de Mailtrap, deja el correo emisor como{' '}
                    <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300">hello@demomailtrap.co</code>. Si registraste tu propio dominio en Mailtrap, escribe tu correo institucional.
                  </li>
                </ol>
              ) : (
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                  <li>
                    Ingresa a la sección de Seguridad de tu Cuenta de Google:{' '}
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 underline font-semibold inline-flex items-center gap-0.5"
                    >
                      myaccount.google.com/security <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Asegúrate de tener activa la <strong>Verificación en 2 pasos</strong>.</li>
                  <li>
                    Busca en la barra superior o en Seguridad la opción <strong>"Contraseñas de aplicaciones"</strong>.
                  </li>
                  <li>
                    Escribe un nombre (ej. <em>Nebulab Store</em>) y haz clic en <strong>Crear</strong>.
                  </li>
                  <li>
                    Google te entregará un código de <strong>16 letras</strong> (ej. <code>xzgt asae xpoc glfv</code>). Cópialo y pégalo abajo.
                  </li>
                </ol>
              )}
            </div>
          )}

          {/* Form Fields: Mailtrap vs Gmail */}
          {settings.provider === 'mailtrap' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Mailtrap API Token */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Token API de Mailtrap *</span>
                  </span>
                  <a
                    href="https://mailtrap.io/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 normal-case font-normal"
                  >
                    <span>Abrir consola Mailtrap</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <div className="relative">
                  <input
                    type={showMailtrapToken ? 'text' : 'password'}
                    value={settings.mailtrapApiToken || ''}
                    onChange={(e) => setSettings({ ...settings, mailtrapApiToken: e.target.value })}
                    placeholder="Pega aquí tu API Token de Mailtrap (ej: 4a2b9c8d...)"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMailtrapToken(!showMailtrapToken)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showMailtrapToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Token generado en la sección Email API / Sending de tu cuenta de Mailtrap.
                </p>
              </div>

              {/* Sender Email (Mailtrap) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Correo Emisor (From Email) *</span>
                </label>
                <input
                  type="email"
                  value={settings.senderEmail || ''}
                  onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                  placeholder="hello@demomailtrap.co o ventas@tudominio.com"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-[11px] text-slate-500">
                  Usa <code className="text-cyan-400">hello@demomailtrap.co</code> para el dominio de prueba de Mailtrap, o tu dominio verificado.
                </p>
              </div>

              {/* Sender Name */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Nombre de Remitente Visible
                </label>
                <input
                  type="text"
                  value={settings.senderName || ''}
                  onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                  placeholder="Nebulab Studio 3D"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-[11px] text-slate-500">
                  Nombre que verá el cliente al recibir el correo (ej. Nebulab Studio 3D).
                </p>
              </div>

              {/* Admin Notification Recipient */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Correo de Alertas para Administrador
                </label>
                <input
                  type="email"
                  value={settings.adminNotificationEmail || ''}
                  onChange={(e) => setSettings({ ...settings, adminNotificationEmail: e.target.value })}
                  placeholder="admin@nebuladb3d.com.co"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-[11px] text-slate-500">
                  Bandeja donde te llegarán los avisos de nuevas compras realizadas en la tienda.
                </p>
              </div>

            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Gmail Sender Email */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Correo Emisor (Gmail) *</span>
                </label>
                <input
                  type="email"
                  value={settings.senderEmail || ''}
                  onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                  placeholder="nebulab3d@gmail.com"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-[11px] text-slate-500">
                  Dirección desde donde saldrán los correos de la tienda.
                </p>
              </div>

              {/* Sender Name */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Nombre de Remitente Visible
                </label>
                <input
                  type="text"
                  value={settings.senderName || ''}
                  onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                  placeholder="Nebulab Studio"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-[11px] text-slate-500">
                  Nombre que verá el cliente al recibir el correo (ej. Nebulab Studio 3D).
                </p>
              </div>

              {/* Google App Password */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Contraseña de Aplicación de Google (16 caracteres) *</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={settings.gmailAppPassword || ''}
                    onChange={(e) => setSettings({ ...settings, gmailAppPassword: e.target.value })}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Generada en la sección Seguridad de tu cuenta de Google.
                </p>
              </div>

              {/* Admin Notification Email */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Correo de Alertas para Administrador
                </label>
                <input
                  type="email"
                  value={settings.adminNotificationEmail || ''}
                  onChange={(e) => setSettings({ ...settings, adminNotificationEmail: e.target.value })}
                  placeholder="admin@nebuladb3d.com.co"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-[11px] text-slate-500">
                  Bandeja donde te llegarán los avisos de nuevas compras realizadas.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Section 2: Automated Notification Events */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h3 className="font-extrabold text-base text-white font-outfit flex items-center gap-2">
              <Bell className="w-5 h-5 text-violet-400" />
              <span>2. Eventos Automáticos de Envío</span>
            </h3>
            <span className="text-xs text-slate-400">
              Activa o desactiva qué correos se enviarán automáticamente
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Event 1 */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Confirmación al Cliente</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Envía un recibo detallado con los productos 3D y dirección de entrega al realizar el checkout.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                <span className="text-[11px] font-semibold text-slate-400">
                  {settings.events.notifyCustomerNewOrder ? 'Habilitado' : 'Deshabilitado'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.events.notifyCustomerNewOrder}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        events: { ...settings.events, notifyCustomerNewOrder: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>

            {/* Event 2 */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Alerta de Venta (Admin)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Notifica al correo del administrador cada vez que entra un nuevo pedido listo para fabricar.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                <span className="text-[11px] font-semibold text-slate-400">
                  {settings.events.notifyAdminNewOrder ? 'Habilitado' : 'Deshabilitado'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.events.notifyAdminNewOrder}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        events: { ...settings.events, notifyAdminNewOrder: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
                </label>
              </div>
            </div>

            {/* Event 3 */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Cambio de Estado</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Notifica automáticamente al cliente cuando pasas el pedido a "En Producción" o "Listo / Despachado".
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                <span className="text-[11px] font-semibold text-slate-400">
                  {settings.events.notifyCustomerStatusChange ? 'Habilitado' : 'Deshabilitado'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.events.notifyCustomerStatusChange}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        events: { ...settings.events, notifyCustomerStatusChange: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Section 3: Live Testing Tool */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h3 className="font-extrabold text-base text-white font-outfit flex items-center gap-2">
              <Send className="w-5 h-5 text-pink-400" />
              <span>3. Prueba de Envío en Vivo</span>
            </h3>
            <span className="text-xs text-slate-400">
              Verifica tus credenciales de {settings.provider === 'mailtrap' ? 'Mailtrap' : 'Gmail'} sin hacer compras reales
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Ingresa tu correo para recibir la prueba (ej: juangomez27.99@gmail.com)"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 pl-10"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={isTesting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 shadow-lg shadow-pink-500/20"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando Prueba...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Correo de Prueba</span>
                </>
              )}
            </button>
          </div>

          {/* Test Status Feedback Alert */}
          {testStatus && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fadeIn ${
                testStatus.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold text-sm">{testStatus.message}</p>
                {testStatus.details && (
                  <p className="text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    {testStatus.details}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Save Bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800 sticky bottom-4 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                ¡Configuración guardada exitosamente en la base de datos!
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-sm transition-all flex items-center gap-2 shadow-xl shadow-cyan-500/20 disabled:opacity-50 ml-auto"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Configuración de Correo</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
