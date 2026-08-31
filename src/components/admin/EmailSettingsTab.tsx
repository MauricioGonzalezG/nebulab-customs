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
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';

export const EmailSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    if (!settings.senderEmail || !settings.gmailAppPassword) {
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
      // Temporarily use current form settings for test
      const result = await emailService.sendTestEmail(targetRecipient, settings);
      if (result.success) {
        setTestStatus({
          success: true,
          message: `¡Correo de prueba enviado con éxito a ${targetRecipient}! Revisa la bandeja de entrada o spam.`,
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

  const isConfigured = Boolean(settings.senderEmail && settings.gmailAppPassword);

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
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-white font-outfit">
                  Configuración de Notificaciones por Correo
                </h2>
                <span
                  className={`px-3 py-0.5 text-xs font-bold rounded-full border ${
                    settings.enabled && isConfigured
                      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-950/60 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {settings.enabled && isConfigured ? 'Sistema Activo' : 'Inactivo / Configuración Pendiente'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Configura tu cuenta de Gmail emisora y personaliza los eventos automáticos para clientes y administración.
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shrink-0">
            <span className="text-xs font-bold text-slate-300">
              {settings.enabled ? 'Notificaciones Habilitadas' : 'Notificaciones Desactivadas'}
            </span>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                settings.enabled ? 'bg-gradient-to-r from-cyan-500 to-violet-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Section 1: Gmail Sender Credentials */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white font-outfit">
                1. Datos del Emisor (Gmail SMTP)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{showGuide ? 'Ocultar Guía' : '¿Cómo obtener la contraseña de Gmail?'}</span>
            </button>
          </div>

          {/* Google App Password Guide (Collapsible) */}
          {showGuide && (
            <div className="bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-5 space-y-3 animate-fadeIn text-sm text-slate-300">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Paso a paso para conectar tu cuenta de Gmail:</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-300">
                <li>
                  Ingresa a tu cuenta de Google en{' '}
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    myaccount.google.com/security <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Asegúrate de que la <strong className="text-white">Verificación en dos pasos (2FA)</strong> esté activada.
                </li>
                <li>
                  En el buscador superior de tu cuenta de Google, escribe <strong className="text-white">"Contraseñas de aplicaciones"</strong> o accede a{' '}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    apppasswords <ExternalLink className="w-3 h-3" />
                  </a>.
                </li>
                <li>
                  Crea una nueva contraseña llamada <strong className="text-cyan-300">"Nebulab Studio"</strong> y copia el código de 16 caracteres generado.
                </li>
                <li>
                  Pega ese código de 16 caracteres en el campo de abajo <strong className="text-white">"Contraseña de Aplicación"</strong> (los espacios se omiten automáticamente).
                </li>
              </ol>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sender Email */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Correo Emisor (Gmail) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={settings.senderEmail}
                  onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                  placeholder="ejemplo@gmail.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Dirección desde donde saldrán los correos de la tienda.
              </p>
            </div>

            {/* Sender Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Nombre de Remitente Visible
              </label>
              <input
                type="text"
                value={settings.senderName}
                onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                placeholder="Nebulab Studio 3D"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Nombre que verá el cliente al recibir el correo (ej. Nebulab Studio 3D).
              </p>
            </div>

            {/* Google App Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Contraseña de Aplicación de Google (16 caracteres) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={settings.gmailAppPassword || ''}
                  onChange={(e) => setSettings({ ...settings, gmailAppPassword: e.target.value })}
                  placeholder="xxxx xxxx xxxx xxxx"
                  required
                  className="w-full pl-4 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Generada en la sección Seguridad de tu cuenta de Google.
              </p>
            </div>

            {/* Admin Notification Email */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Correo de Alertas para Administrador
              </label>
              <input
                type="email"
                value={settings.adminNotificationEmail}
                onChange={(e) => setSettings({ ...settings, adminNotificationEmail: e.target.value })}
                placeholder="admin@nebuladb3d.com.co"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Bandeja donde te llegarán los avisos de nuevas compras realizadas.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Event Notification Toggles */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-violet-400" />
              <h3 className="text-base font-bold text-white font-outfit">
                2. Eventos de Notificación Automática
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Activa o desactiva qué correos deben enviarse cuando ocurran acciones en la tienda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Event 1: Customer Order Confirmation */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        events: {
                          ...settings.events,
                          notifyCustomerNewOrder: !settings.events.notifyCustomerNewOrder,
                        },
                      })
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                      settings.events.notifyCustomerNewOrder ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                        settings.events.notifyCustomerNewOrder ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <h4 className="text-sm font-bold text-white">
                  Confirmación al Cliente
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Envía de inmediato un correo al comprador con el desglose de productos 3D, totales, método de pago y dirección de envío.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-cyan-400/80 bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-cyan-500/10">
                Disparador: Creación de pedido
              </div>
            </div>

            {/* Event 2: Admin New Order Alert */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        events: {
                          ...settings.events,
                          notifyAdminNewOrder: !settings.events.notifyAdminNewOrder,
                        },
                      })
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                      settings.events.notifyAdminNewOrder ? 'bg-violet-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                        settings.events.notifyAdminNewOrder ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <h4 className="text-sm font-bold text-white">
                  Alerta al Administrador
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Envía una alerta inmediata a la bandeja del administrador con los datos del comprador y los modelos solicitados para fabricación.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-violet-400/80 bg-violet-500/5 px-2.5 py-1 rounded-lg border border-violet-500/10">
                Disparador: Nueva venta registrada
              </div>
            </div>

            {/* Event 3: Order Status Change */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Truck className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        events: {
                          ...settings.events,
                          notifyCustomerStatusChange: !settings.events.notifyCustomerStatusChange,
                        },
                      })
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                      settings.events.notifyCustomerStatusChange ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                        settings.events.notifyCustomerStatusChange ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <h4 className="text-sm font-bold text-white">
                  Cambio de Estado de Pedido
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Envía un correo al cliente notificándole cuando su orden pasa a <em>En Producción</em>, <em>Completado/Enviado</em> o <em>Cancelado</em>.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-emerald-400/80 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                Disparador: Actualización en Admin
              </div>
            </div>

          </div>
        </div>

        {/* Section 3: Live Test & Diagnostics */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Send className="w-5 h-5 text-fuchsia-400" />
              <h3 className="text-base font-bold text-white font-outfit">
                3. Prueba de Envío en Vivo
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verifica que tus credenciales de Gmail SMTP y la conexión funcionen sin necesidad de hacer una compra real.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="correo-destino-prueba@ejemplo.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-fuchsia-500 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={isTesting || !settings.senderEmail || !settings.gmailAppPassword}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 shadow-lg ${
                isTesting || !settings.senderEmail || !settings.gmailAppPassword
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-fuchsia-500/20'
              }`}
            >
              <Send className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Verificando y enviando...' : 'Enviar Correo de Prueba'}</span>
            </button>
          </div>

          {/* Test Status Feedback */}
          {testStatus && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm animate-fadeIn ${
                testStatus.success
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{testStatus.message}</p>
                {testStatus.details && (
                  <p className="text-[11px] opacity-80 font-mono break-all">{testStatus.details}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-slate-900/90 border border-slate-800 rounded-3xl sticky bottom-4 z-30 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Las configuraciones se sincronizan de forma persistente en Turso SQLite DB.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                ¡Guardado en Turso DB!
              </span>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 hover:opacity-95 text-white text-xs font-extrabold shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Guardando...' : 'Guardar Configuración de Correo'}</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
