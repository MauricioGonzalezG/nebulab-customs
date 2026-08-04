import React, { useState } from 'react';
import { CartItem, Order, ShippingDetails } from '../../types';
import { X, CreditCard, ShieldCheck, CheckCircle2, Download, Truck, Lock, ArrowLeft } from 'lucide-react';

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

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'mercadopago'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

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

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate instant payment processing delay
    setTimeout(() => {
      const order: Order = {
        id: `LITHO-${Math.floor(100000 + Math.random() * 900000)}`,
        items: [...items],
        subtotal,
        shippingFee,
        total,
        shippingDetails: shipping,
        paymentMethod,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };

      setCompletedOrder(order);
      setIsProcessing(false);
      setStep('confirmation');
      onOrderCompleted(order);
    }, 1500);
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
            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'card', name: 'Tarjeta Crédito/Débito' },
                { id: 'paypal', name: 'PayPal' },
                { id: 'mercadopago', name: 'Mercado Pago' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-3 rounded-xl border text-center transition-all text-xs font-semibold ${
                    paymentMethod === m.id
                      ? 'bg-cyan-500/10 border-cyan-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>

            {/* Credit Card Input simulation */}
            {paymentMethod === 'card' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Número de Tarjeta (Demo)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="4532 •••• •••• 8892"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                    <CreditCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Expiración</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">CVC / CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {(paymentMethod === 'paypal' || paymentMethod === 'mercadopago') && (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-center text-xs text-slate-300">
                Serás redirigido al portal oficial de {paymentMethod === 'paypal' ? 'PayPal' : 'Mercado Pago'} para finalizar tu compra de forma segura.
              </div>
            )}

            {/* Summary */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> Encriptación SSL 256-bit
              </span>
              <span className="text-base font-extrabold text-white font-mono">
                ${total.toFixed(2)} USD
              </span>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white rounded-xl text-sm font-bold shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando Pedido...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Pagar y Confirmar Pedido (${total.toFixed(2)})</span>
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

            {/* Download Manufacturing STL Button */}
            <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl space-y-2">
              <p className="text-xs font-semibold text-cyan-300">
                ¿Deseas imprimir tu propia litofanía o conservar la maqueta 3D?
              </p>
              <button
                onClick={onDownloadSTL}
                className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Archivo STL de Fabricación (.STL)</span>
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
