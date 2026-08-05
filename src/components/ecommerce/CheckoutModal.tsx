import React, { useState, useEffect } from 'react';
import { CartItem, Order, ShippingDetails } from '../../types';
import { tursoService } from '../../lib/turso';
import { useAuth } from '../../context/AuthContext';
import { X, CheckCircle2, Download, Truck, Lock, ArrowLeft, User, Plus, MapPin, Edit2 } from 'lucide-react';

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
  const { customerUser } = useAuth();
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [isEditingSavedAddress, setIsEditingSavedAddress] = useState(false);

  const [savedAddress, setSavedAddress] = useState<ShippingDetails | null>(null);

  const [shipping, setShipping] = useState<ShippingDetails>({
    fullName: customerUser?.name || '',
    email: customerUser?.email || '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Colombia'
  });

  const [accountPassword, setAccountPassword] = useState('');

  // Load saved address from LocalStorage or last Turso order
  useEffect(() => {
    if (isOpen) {
      if (items.length > 0) {
        setStep('shipping');
        setCompletedOrder(null);
      }

      if (customerUser) {
        const storedLocal = localStorage.getItem(`nebulab_saved_address_${customerUser.email.toLowerCase()}`);
        if (storedLocal) {
          try {
            const parsed = JSON.parse(storedLocal);
            setSavedAddress(parsed);
            setShipping(parsed);
            return;
          } catch (e) {
            console.error('Error parsing stored address:', e);
          }
        }

        // Fallback: fetch last order by email
        tursoService.getOrdersByCustomerEmail(customerUser.email).then((orders) => {
          if (orders.length > 0 && orders[0].shippingDetails) {
            const lastShip = orders[0].shippingDetails;
            setSavedAddress(lastShip);
            setShipping(lastShip);
            localStorage.setItem(`nebulab_saved_address_${customerUser.email.toLowerCase()}`, JSON.stringify(lastShip));
          } else {
            const initial: ShippingDetails = {
              fullName: customerUser.name,
              email: customerUser.email,
              phone: '',
              address: '',
              city: '',
              postalCode: '',
              country: 'Colombia',
            };
            setShipping(initial);
          }
        });
      }
    }
  }, [isOpen, customerUser, items.length]);

  const handleClose = () => {
    setStep('shipping');
    setCompletedOrder(null);
    onClose();
  };

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
      .map((it) => {
        if (it.itemType === 'collar' && it.collarConfig) {
          return `• Collar para Mascota 3D (Mascota: ${it.collarConfig.petName || 'N/A'}, Tel: ${it.collarConfig.phoneText || 'N/A'})\n  - Talla: ${it.collarConfig.size}\n  - Color Correa: ${it.collarConfig.strapColor}\n  - Estilo Placa: ${it.collarConfig.plateStyle}\n  - Precio: $${it.price.toFixed(2)} USD`;
        }
        if (it.itemType === 'clicker' && it.clickerConfig) {
          const typeName = it.clickerConfig.type === 'clicker' ? 'Clicker Teclado MX 3D' : 'Llavero 3D';
          return `• ${typeName} (${it.clickerConfig.size}mm)\n  - Estilo Base: ${it.clickerConfig.baseStyle}\n  - Switch: ${it.clickerConfig.switchType}\n  - Precio: $${it.price.toFixed(2)} USD`;
        }
        return `• Litofanía ${it.config.shape === 'arc' ? 'Curvada (Arco)' : it.config.shape === 'flat' ? 'Plana' : 'Cilíndrica'} (${it.config.width}x${it.config.height}mm)\n  - Soporte: ${it.config.baseType === 'night-light' ? 'Luz de Noche LED (Socket)' : it.config.baseType === 'led-wooden-base' ? 'Base Madera LED RGB' : 'Soporte Escritorio'}\n  - Material: ${it.config.material === 'white-pla' ? 'Blanco Ártico PLA' : 'Marfil Cálido'}\n  - Precio: $${it.price.toFixed(2)} USD`;
      })
      .join('\n\n');


    const msg = `¡Hola! Quisiera realizar el pedido de mis productos personalizados Nebulab 3D:\n\n🆔 *Orden ID:* ${order.id}\n👤 *Cliente:* ${order.shippingDetails.fullName}\n📱 *Teléfono:* ${order.shippingDetails.phone}\n📍 *Dirección:* ${order.shippingDetails.address}, ${order.shippingDetails.city} (${order.shippingDetails.country})\n\n📦 *Detalles del Producto:*\n${itemDetails}\n\n💰 *Total a Pagar:* $${order.total.toFixed(2)} USD\n\n¿Me ayudan a coordinar el pago y la entrega?`;


    return `https://wa.me/573232218586?text=${encodeURIComponent(msg)}`;
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(async () => {
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

      try {
        // Save shipping details locally for future orders
        if (shipping.email) {
          localStorage.setItem(`nebulab_saved_address_${shipping.email.toLowerCase()}`, JSON.stringify(shipping));
        }
        // Automatically create or update customer account with email and password
        await tursoService.createOrGetCustomerFromOrder(shipping.fullName, shipping.email, accountPassword);
        await tursoService.saveOrder(order);
      } catch (err) {
        console.error('Error saving order/customer to DB:', err);
      }

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
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step 1: Shipping Form */}
        {step === 'shipping' && (
          <form onSubmit={handleShippingSubmit} className="p-6 space-y-5">
            
            {/* If Customer is Logged In */}
            {customerUser ? (
              <div className="space-y-4">
                
                {/* User Session Banner */}
                <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                      {customerUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-cyan-300 block">{customerUser.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{customerUser.email}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                    Sesión Activa
                  </span>
                </div>

                {/* Address Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Card A: Account Address */}
                  <div
                    onClick={() => {
                      setUseCustomAddress(false);
                      if (savedAddress) {
                        setShipping(savedAddress);
                      }
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      !useCustomAddress
                        ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        Dirección Guardada de tu Cuenta
                      </span>
                      <input type="radio" checked={!useCustomAddress} onChange={() => {}} className="accent-cyan-500" />
                    </div>

                    {savedAddress && savedAddress.address ? (
                      <div className="space-y-1 text-xs text-slate-300">
                        <p className="font-semibold text-slate-100">{savedAddress.fullName}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{savedAddress.address}, {savedAddress.city}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">📱 {savedAddress.phone} ({savedAddress.country})</p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">
                        <p className="font-semibold text-slate-200">{customerUser.name}</p>
                        <p className="font-mono">{customerUser.email}</p>
                        <p className="text-[10px] text-cyan-400 mt-1">Completa tu dirección abajo para guardarla.</p>
                      </div>
                    )}
                  </div>

                  {/* Card B: Alternate Address */}
                  <div
                    onClick={() => {
                      setUseCustomAddress(true);
                      setShipping({
                        fullName: '',
                        email: '',
                        phone: '',
                        address: '',
                        city: '',
                        postalCode: '',
                        country: 'Colombia',
                      });
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      useCustomAddress
                        ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-cyan-400" />
                        + Usar otra dirección / destinatario
                      </span>
                      <input type="radio" checked={useCustomAddress} onChange={() => {}} className="accent-cyan-500" />
                    </div>
                    <p className="text-xs text-slate-300">Despachar a otro destinatario</p>
                    <p className="text-[10px] text-slate-500 mt-2">Ingresa un nombre, correo y dirección totalmente diferentes para este envío.</p>
                  </div>

                </div>

                {/* If using saved address and address is already filled, show quick edit toggle button */}
                {!useCustomAddress && savedAddress?.address && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Se usará tu dirección guardada predeterminada.
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingSavedAddress(!isEditingSavedAddress)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 transition-colors flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isEditingSavedAddress ? 'Ocultar Formulario' : 'Editar Dirección'}</span>
                    </button>
                  </div>
                )}

              </div>
            ) : (
              /* If Customer is NOT Logged In (Guest Checkout) */
              <>
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

                {/* Optional Account Password for Multi-Device Access */}
                <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-xl space-y-1.5">
                  <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    Contraseña para consultar tus pedidos desde cualquier dispositivo (Opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="Crea una contraseña personalizada..."
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Tu cuenta se creará automáticamente vinculada a tu correo para darte acceso a tus archivos e impresiones.
                  </p>
                </div>
              </>
            )}

            {/* Destination Address Input Fields */}
            {/* Show fields if: NOT logged in OR useCustomAddress OR editing saved address OR saved address is empty */}
            {(!customerUser || useCustomAddress || isEditingSavedAddress || !savedAddress?.address) && (
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                {useCustomAddress && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Nombre del Destinatario *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. María Gómez"
                        value={shipping.fullName}
                        onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Correo del Destinatario *</label>
                      <input
                        type="email"
                        required
                        placeholder="maria@ejemplo.com"
                        value={shipping.email}
                        onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Teléfono Movil *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+57 300 000 0000"
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
                      <option value="Colombia">Colombia</option>
                      <option value="España">España</option>
                      <option value="México">México</option>
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
                    placeholder="Ej. Cra 8 # 57e - 13, Apt 302"
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
                      placeholder="Ej. Manizales / Bogotá"
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
                      placeholder="27001"
                      value={shipping.postalCode}
                      onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all"
              >
                Continuar al Pago
              </button>
            </div>

          </form>
        )}

        {/* Step 2: Payment Gateways */}
        {step === 'payment' && (
          <form onSubmit={handlePay} className="p-6 space-y-6">
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                <Truck className="w-4 h-4 text-cyan-400" />
                Resumen del Envío:
              </div>
              <p>Destinatario: {shipping.fullName} ({shipping.email})</p>
              <p>Dirección: {shipping.address}, {shipping.city} ({shipping.country}) - Tel: {shipping.phone}</p>
            </div>

            {/* WhatsApp Direct Order Confirmation */}
            <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                  WA
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-300">Coordinar Pedido y Pago por WhatsApp Directo</h4>
                  <p className="text-xs text-slate-400">Atención personalizada con el diseñador 3D para transferencia Bancolombia, Nequi o PayPal.</p>
                </div>
              </div>
            </div>

            {/* Pay Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando e iniciando WhatsApp...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirmar Pedido (${total.toFixed(2)} USD)</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirmation' && completedOrder && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold font-outfit text-white">¡Gracias por tu compra!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Tu orden <strong className="text-cyan-400 font-mono">{completedOrder.id}</strong> ha sido registrada con éxito.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-2 font-bold text-slate-200">
                <span>Resumen de Orden:</span>
                <span>{completedOrder.items.length} productos</span>
              </div>
              {completedOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-slate-400 text-[11px]">
                  <span>
                    • {it.itemType === 'collar' && it.collarConfig
                        ? `Collar Mascota 3D — ${it.collarConfig.petName || 'Personalizado'} (Talla ${it.collarConfig.size})`
                        : it.itemType === 'clicker' && it.clickerConfig
                        ? `${it.clickerConfig.type === 'clicker' ? 'Clicker MX 3D' : 'Llavero 3D'} (${it.clickerConfig.size}mm)`
                        : `Litofanía ${it.config.shape === 'arc' ? 'Curvada' : it.config.shape === 'flat' ? 'Plana' : 'Cilíndrica'} (${it.config.width}x${it.config.height}mm)`}
                  </span>
                  <span>${it.price.toFixed(2)} USD</span>
                </div>
              ))}

              <div className="flex justify-between pt-2 border-t border-slate-800 font-extrabold text-cyan-300">
                <span>Total Final:</span>
                <span>${completedOrder.total.toFixed(2)} USD</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onDownloadSTL}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Archivo 3D (.stl)</span>
              </button>

              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
              >
                Aceptar y Volver
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
