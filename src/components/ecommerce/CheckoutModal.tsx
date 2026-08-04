import React, { useState } from 'react';
import { CartItem, Order, ShippingDetails } from '../../types';
import { X, CheckCircle2, Download, Truck, Lock, ArrowLeft } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderCompleted: (order: Order) => void;
  onDownloadSTL: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderCompleted,
  onDownloadSTL
}) => {
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const [shipping, setShipping] = useState<ShippingDetails>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'España'
  });

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 50 ? 0 : 4.90;
  const total = subtotal + shippingFee;

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipping.fullName || !shipping.email || !shipping.address || !shipping.city) {
      alert('Por favor completa los campos requeridos de envío.');
      return;
    }
    setStep('payment');
  };

  const generateWhatsAppUrl = (order: Order) => {
    const itemDetails = order.items
      .map(
        (it) =>
          `• Litofanía ${it.config.shape === 'arc' ? 'Curvada (Arco)' : it.config.shape === 'flat' ? 'Plana' : 'Cilíndrica'} (${it.config.width}x${it.config.height}mm)\n  - Soporte: ${it.config.baseType === 'night-light' ? 'Luz de Noche LED (Socket)' : it.config.baseType === 'led-wooden-base' ? 'Base Madera LED RGB' : 'Soporte Escritorio'}\n  - Material: ${it.config.material === 'white-pla' ? 'Blanco Ártico PLA' : 'Marfil Cálido'}\n  - Precio: $${it.price.toFixed(2)} USD`
      )
      .join('\n\n');

    const msg = `¡Hola! Quisiera realizar el pedido de mi litofanía personalizada:\n\n🆔 *Orden ID:* ${order.id}\n👤 *Cliente:* ${order.shippingDetails.fullName}\n📱 *Teléfono:* ${order.shippingDetails.phone}\n📍 *Dirección:* ${order.shippingDetails.address}, ${order.shippingDetails.city} (${order.shippingDetails.country})\n\n📦 *Detalles del Producto:*\n${itemDetails}\n\n💰 *Total a Pagar:* $${order.total.toFixed(2)} USD\n\n¿Me ayudan a coordinar el pago y la entrega?`;

    return `https://wa.me/573232218586?text=${encodeURIComponent(msg)}`;
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      const order: Order = {
        id: `LITHO-${Math.floor(100000 + Math.random() * 900000)}`,
        items: [...items],
        subtotal,
        shippingFee,
        total,
        shippingDetails: shipping,
        paymentMethod: 'whatsapp',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };

      setCompletedOrder(order);
      setIsProcessing(false);
      setStep('confirmation');
      onOrderCompleted(order);

      // Open WhatsApp automatically
      const waUrl = generateWhatsAppUrl(order);
      window.open(waUrl, '_blank');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            {step === 'payment' && (
              <button
                onClick={() => setStep('shipping')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="text-lg font-bold font-outfit">
                {step === 'shipping' && 'Datos de Envío y Contacto'}
                {step === 'payment' && 'Pasarela de Pago Segura'}
                {step === 'confirmation' && '¡Pedido Confirmado con Éxito!'}
              </h3>
              <p className="text-xs text-slate-400">
                {step !== 'confirmation' ? `Total a pagar: $${total.toFixed(2)} USD` : `Orden ID: ${completedOrder?.id}`}
              </p>
            </div>
          </div>

          {step !== 'confirmation' && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step 1: Shipping Form */}
        {step === 'shipping' && (
          <form onSubmit={handleShippingSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  value={shipping.fullName}
                  onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  placeholder="juan@ejemplo.com"
                  value={shipping.email}
                  onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Teléfono Movil *</label>
                <input
                  type="tel"
                  required
                  placeholder="+34 600 000 000"
                  value={shipping.phone}
                  onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">País de Entrega</label>
                <select
                  value={shipping.country}
                  onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="España">España</option>
                  <option value="México">México</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Chile">Chile</option>
                  <option value="Estados Unidos">Estados Unidos</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Dirección Completa de Envío *</label>
              <input
                type="text"
                required
                placeholder="Calle Mayor 123, Piso 4B"
                value={shipping.address}
                onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Ciudad *</label>
                <input
                  type="text"
                  required
                  placeholder="Madrid / CDMX"
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Código Postal *</label>
                <input
                  type="text"
                  required
                  placeholder="28001"
                  value={shipping.postalCode}
                  onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
              >
                Continuar al Pago
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Payment Options */}
        {step === 'payment' && (
          <form onSubmit={handlePay} className="p-6 space-y-5">
            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">Selecciona el Método de Confirmación</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Active Option: WhatsApp */}
                <div className="flex flex-col text-left p-3.5 rounded-2xl border-2 transition-all bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      💬 Pedir por WhatsApp
                    </span>
                    <span className="text-[10px] font-bold uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                      Habilitado
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Envío directo del resumen a WhatsApp (+57 3232218586) para coordinar pago y despacho.
                  </p>
                </div>

                {/* Disabled Options: Card, PayPal, Mercado Pago */}
                {[
                  { name: 'Tarjeta Crédito / Débito', desc: 'Pago en línea con encriptación SSL' },
                  { name: 'PayPal Express', desc: 'Cobro seguro internacional' },
                  { name: 'Mercado Pago', desc: 'Pasarela local de pago' }
                ].map((m, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col text-left p-3.5 rounded-2xl border border-slate-800/60 bg-slate-950/40 opacity-50 cursor-not-allowed select-none"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-400">{m.name}</span>
                      <span className="text-[9px] font-semibold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        En construcción
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> Atención directa por WhatsApp
              </span>
              <span className="text-base font-extrabold text-white font-mono">
                ${total.toFixed(2)} USD
              </span>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generando resumen para WhatsApp...</span>
                </>
              ) : (
                <>
                  <span>Confirmar y Enviar a WhatsApp (3232218586)</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 3: Order Confirmation */}
        {step === 'confirmation' && completedOrder && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white font-outfit">
                ¡Gracias por tu Compra!
              </h2>
              <p className="text-xs text-slate-300">
                Hemos recibido tu pedido correctamente. Código de seguimiento:
              </p>
              <span className="inline-block mt-1 px-3 py-1 bg-slate-800 text-cyan-400 font-mono font-bold rounded-lg text-sm">
                {completedOrder.id}
              </span>
            </div>

            {/* Delivery timeframe */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <Truck className="w-4 h-4" />
                <span>Tiempo de Fabricación 3D & Envío</span>
              </div>
              <p className="text-slate-300">
                Enviado a: <strong className="text-white">{completedOrder.shippingDetails.address}, {completedOrder.shippingDetails.city}</strong>
              </p>
              <p className="text-slate-400 text-[11px]">
                Enviaremos actualizaciones de seguimiento a <strong>{completedOrder.shippingDetails.email}</strong>.
              </p>
            </div>

            {/* Download Manufacturing STL & Re-open WhatsApp */}
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-3">
              <p className="text-xs font-semibold text-emerald-300">
                Tu resumen de compra se ha generado. Si no se abrió WhatsApp automáticamente:
              </p>
              <a
                href={generateWhatsAppUrl(completedOrder)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <span>💬 Abrir Pedido en WhatsApp (+57 3232218586)</span>
              </a>

              <button
                onClick={onDownloadSTL}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Archivo STL de Fabricación 3D (.STL)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              Volver al Estudio
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
