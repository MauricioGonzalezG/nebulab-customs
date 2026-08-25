import React, { useState, useEffect } from 'react';
import { CartItem, Order, ShippingDetails } from '../../types';
import { tursoService } from '../../lib/turso';
import { createMercadoPagoPreference } from '../../lib/mercadopago';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { COLOMBIA_DEPARTMENTS, getMunicipalitiesForDepartment } from '../../lib/colombiaData';
import { X, CheckCircle2, Download, Truck, Lock, ArrowLeft, User, Plus, MapPin, Edit2, ShieldCheck, MessageSquare, Wallet } from 'lucide-react';
import { BRAND, getWhatsAppUrl } from '../../lib/brand';

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
  const { isAuthenticated, customerUser } = useAuth();
  const { currency, formatPrice, convertUsdToCop, formatPriceUsdOnly, pricingData } = useCurrency();
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [isEditingSavedAddress, setIsEditingSavedAddress] = useState(false);
  const [isCustomCity, setIsCustomCity] = useState(false);

  const [savedAddress, setSavedAddress] = useState<ShippingDetails | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mercadopago' | 'whatsapp'>('mercadopago');

  const [shipping, setShipping] = useState<ShippingDetails>({
    fullName: customerUser?.name || '',
    email: customerUser?.email || '',
    phone: '',
    address: '',
    department: 'Antioquia',
    city: 'Medellín',
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
            setShipping({ ...parsed, country: 'Colombia' });
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
            setShipping({ ...lastShip, country: 'Colombia' });
            localStorage.setItem(`nebulab_saved_address_${customerUser.email.toLowerCase()}`, JSON.stringify(lastShip));
          } else {
            const initial: ShippingDetails = {
              fullName: customerUser.name,
              email: customerUser.email,
              phone: '',
              address: '',
              department: 'Antioquia',
              city: 'Medellín',
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
  const freeThresholdUsd = pricingData.shipping.freeThresholdUsd;
  const shippingFee = subtotal >= freeThresholdUsd || items.length === 0 ? 0 : pricingData.shipping.standardFeeUsd;
  const total = subtotal + shippingFee;

  const availableMunicipalities = getMunicipalitiesForDepartment(shipping.department || '');

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipping.fullName || !shipping.email || !shipping.address || !shipping.city) {
      alert('Por favor completa todos los campos requeridos de envío.');
      return;
    }
    setStep('payment');
  };

  const generateWhatsAppUrl = (order: Order) => {
    const activeCurr = order.currency || currency;
    const formatItemPrice = (usd: number) => formatPrice(convertUsdToCop(usd), usd, activeCurr);

    const itemDetails = order.items
      .map((it) => {
        const formattedPrice = formatItemPrice(it.price);
        if (it.itemType === 'collar' && it.collarConfig) {
          return `• Collar para Mascota 3D (Mascota: ${it.collarConfig.petName || 'N/A'}, Tel: ${it.collarConfig.phoneText || 'N/A'})\n  - Talla: ${it.collarConfig.size}\n  - Color Correa: ${it.collarConfig.strapColor}\n  - Estilo Placa: ${it.collarConfig.plateStyle}\n  - Precio: ${formattedPrice}`;
        }
        if (it.itemType === 'clicker' && it.clickerConfig) {
          const typeName = it.clickerConfig.type === 'clicker' ? 'Clicker Teclado MX 3D' : 'Llavero 3D';
          return `• ${typeName} (${it.clickerConfig.size}mm)\n  - Estilo Base: ${it.clickerConfig.baseStyle}\n  - Switch: ${it.clickerConfig.switchType}\n  - Precio: ${formattedPrice}`;
        }
        const notesText = it.config.notes ? `\n  - Observaciones: ${it.config.notes}` : '';
        return `• Litofanía ${it.config.shape === 'arc' ? 'Curvada (Arco)' : it.config.shape === 'flat' ? 'Plana' : 'Cilíndrica'} (${it.config.width}x${it.config.height}mm)\n  - Soporte: ${it.config.baseType === 'night-light' ? 'Luz de Noche LED (Socket)' : it.config.baseType === 'flat-stand' ? 'Soporte Escritorio' : 'Sin Base'}${notesText}\n  - Precio: ${formattedPrice}`;
      })
      .join('\n\n');

    const formattedTotal = formatItemPrice(order.total);
    const locationStr = `${order.shippingDetails.city}${order.shippingDetails.department ? `, ${order.shippingDetails.department}` : ''} (Colombia)`;
    const msg = `¡Hola! Quisiera realizar el pedido de mis productos personalizados ${BRAND.name}:\n\n🆔 *Orden ID:* ${order.id}\n👤 *Cliente:* ${order.shippingDetails.fullName}\n📱 *Teléfono:* ${order.shippingDetails.phone}\n📍 *Dirección:* ${order.shippingDetails.address}, ${locationStr}\n\n📦 *Detalles del Producto:*\n${itemDetails}\n\n💰 *Total a Pagar:* ${formattedTotal}\n\n¿Me ayudan a coordinar el pago y la entrega?`;

    return getWhatsAppUrl(msg);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const orderId = `LITHO-${Math.floor(100000 + Math.random() * 900000)}`;
    const order: Order = {
      id: orderId,
      items: [...items],
      subtotal,
      shippingFee,
      total,
      currency: currency,
      shippingDetails: {
        ...shipping,
        country: 'Colombia'
      },
      paymentMethod: selectedPaymentMethod,
      status: 'confirmed',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      if (shipping.email) {
        localStorage.setItem(`nebulab_saved_address_${shipping.email.toLowerCase()}`, JSON.stringify(shipping));
      }
      await tursoService.createOrGetCustomerFromOrder(shipping.fullName, shipping.email, accountPassword);
      await tursoService.saveOrder(order);
    } catch (err) {
      console.error('Error saving order/customer to DB:', err);
    }

    setCompletedOrder(order);
    setIsProcessing(false);
    setStep('confirmation');
    onOrderCompleted(order);

    if (selectedPaymentMethod === 'mercadopago') {
      try {
        const mpUrl = await createMercadoPagoPreference({
          orderId: order.id,
          amountUsd: order.total,
          customerEmail: shipping.email,
          customerFullName: shipping.fullName,
          customerPhone: shipping.phone,
          redirectUrl: window.location.href,
        });
        if (mpUrl) {
          window.open(mpUrl, '_blank');
        }
      } catch (err: any) {
        console.error('Error generating Mercado Pago preference:', err);
        alert(`Error con Mercado Pago: ${err.message || 'Verifica la configuración de Access Token.'}`);
      }
    } else {
      const waUrl = generateWhatsAppUrl(order);
      window.open(waUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overscroll-contain">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto max-h-[92vh] flex flex-col focus:outline-none">

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
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
              <h3 className="text-base sm:text-lg font-bold font-outfit">
                {step === 'shipping' && 'Datos de Envío y Contacto (Colombia)'}
                {step === 'payment' && 'Pasarela de Pago Segura'}
                {step === 'confirmation' && '¡Pedido Confirmado con Éxito!'}
              </h3>
              <p className="text-xs text-slate-400">
                {step !== 'confirmation' ? `Total a pagar: ${formatPriceUsdOnly(total)}` : `Orden ID: ${completedOrder?.id}`}
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
          <form onSubmit={handleShippingSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 touch-pan-y text-slate-100">
            
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
                          <span>{savedAddress.address}, {savedAddress.city}{savedAddress.department ? ` (${savedAddress.department})` : ''}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">📱 {savedAddress.phone} (Colombia 🇨🇴)</p>
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
                        department: 'Antioquia',
                        city: 'Medellín',
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
                    <p className="text-[10px] text-slate-400 mt-2">Ingresa un nombre, correo y dirección totalmente diferentes para este envío.</p>
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
                      placeholder="Ej. Juan Camilo Pérez"
                      value={shipping.fullName}
                      onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      placeholder="Ej. juan.perez@gmail.com"
                      value={shipping.email}
                      onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
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
                    placeholder="Ej. Crea una contraseña segura..."
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
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
                        placeholder="Ej. María Fernanda Gómez"
                        value={shipping.fullName}
                        onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Correo del Destinatario *</label>
                      <input
                        type="email"
                        required
                        placeholder="Ej. maria.gomez@gmail.com"
                        value={shipping.email}
                        onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Teléfono Móvil (WhatsApp) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. 312 456 7890"
                      value={shipping.phone}
                      onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Country Selector (Only Colombia) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">País de Entrega</label>
                    <div className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white flex items-center justify-between shadow-inner">
                      <span className="font-semibold text-slate-200">🇨🇴 Colombia</span>
                      <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md">
                        Envíos Nacionales
                      </span>
                    </div>
                  </div>
                </div>

                {/* Colombia Department & Municipality Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Departamento *</label>
                    <select
                      required
                      value={shipping.department || 'Antioquia'}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        const munis = getMunicipalitiesForDepartment(newDept);
                        setIsCustomCity(false);
                        setShipping({
                          ...shipping,
                          department: newDept,
                          city: munis[0] || ''
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                    >
                      {COLOMBIA_DEPARTMENTS.map((d) => (
                        <option key={d.code} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">Municipio / Ciudad *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCity(!isCustomCity);
                          if (!isCustomCity) {
                            setShipping({ ...shipping, city: '' });
                          } else {
                            setShipping({ ...shipping, city: availableMunicipalities[0] || '' });
                          }
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                      >
                        {isCustomCity ? 'Elegir de la lista' : 'Escribir otro municipio'}
                      </button>
                    </div>

                    {!isCustomCity && availableMunicipalities.length > 0 ? (
                      <select
                        required
                        value={shipping.city || ''}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomCity(true);
                            setShipping({ ...shipping, city: '' });
                          } else {
                            setShipping({ ...shipping, city: e.target.value });
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                      >
                        {availableMunicipalities.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                        <option value="__custom__">Otro municipio / Corregimiento...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="Ej. Nombre del Municipio o Corregimiento"
                        value={shipping.city}
                        onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Dirección Completa de Envío *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carrera 15 # 85-30, Apto 402, Torre 2 (Barrio / Indicación)"
                    value={shipping.address}
                    onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Código Postal (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. 170001 o déjalo en blanco"
                    value={shipping.postalCode}
                    onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Actions (Sticky Footer) */}
            <div className="sticky bottom-0 z-10 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex justify-end shadow-2xl">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
              >
                Continuar al Pago
              </button>
            </div>

          </form>
        )}

        {/* Step 2: Payment Gateways */}
        {step === 'payment' && (
          <form onSubmit={handlePay} className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto flex-1 min-h-0 touch-pan-y text-slate-100">
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                <Truck className="w-4 h-4 text-cyan-400" />
                Resumen del Envío:
              </div>
              <p>Destinatario: {shipping.fullName} ({shipping.email})</p>
              <p>Dirección: {shipping.address}, {shipping.city} ({shipping.country}) - Tel: {shipping.phone}</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Selecciona tu Método de Pago Preferido:
              </label>

              {/* Payment Option 1: Mercado Pago Gateway */}
              <div
                onClick={() => setSelectedPaymentMethod('mercadopago')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedPaymentMethod === 'mercadopago'
                    ? 'bg-slate-900 border-sky-500 ring-1 ring-sky-500 shadow-lg shadow-sky-500/10'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">Mercado Pago (Checkout Pro)</h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-full">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        PSE, Tarjetas de Crédito, Débito, Nequi, Daviplata y Efecty
                      </p>
                    </div>
                  </div>
                  <input type="radio" checked={selectedPaymentMethod === 'mercadopago'} onChange={() => {}} className="accent-sky-500" />
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1 text-sky-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Pago Seguro con Mercado Pago
                  </span>
                  <span>Varias opciones de pago</span>
                </div>
              </div>

              {/* Payment Option 2: WhatsApp Direct */}
              <div
                onClick={() => setSelectedPaymentMethod('whatsapp')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedPaymentMethod === 'whatsapp'
                    ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-emerald-300">Coordinar Pedido y Pago por WhatsApp Directo</h4>
                      <p className="text-xs text-slate-400">Atención personalizada con el equipo técnico para transferencias directas o PayPal.</p>
                    </div>
                  </div>
                  <input type="radio" checked={selectedPaymentMethod === 'whatsapp'} onChange={() => {}} className="accent-emerald-500" />
                </div>
              </div>
            </div>

            {/* Pay Button (Sticky Footer) */}
            <div className="sticky bottom-0 z-10 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl">
              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full py-3.5 sm:py-4 px-6 rounded-2xl font-extrabold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 ${
                  selectedPaymentMethod === 'mercadopago'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/25'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Procesando pago...</span>
                  </>
                ) : selectedPaymentMethod === 'mercadopago' ? (
                  <>
                    <Wallet className="w-5 h-5" />
                    <span>Pagar con Mercado Pago ({formatPriceUsdOnly(total)})</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirmar e Iniciar WhatsApp ({formatPriceUsdOnly(total)})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirmation' && completedOrder && (
          <div className="p-6 sm:p-8 text-center space-y-5 sm:space-y-6 overflow-y-auto flex-1 min-h-0 touch-pan-y text-slate-100">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold font-outfit text-white">¡Gracias por tu compra!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Tu orden <strong className="text-cyan-400 font-mono">{completedOrder.id}</strong> ha sido registrada con éxito.
              </p>
            </div>

            {/* Custom Payment Feedback Banner */}
            {completedOrder.paymentMethod === 'whatsapp' ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-left text-xs space-y-1.5 shadow-lg">
                <div className="font-bold text-emerald-300 flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
                  <span>💬 Instrucciones Importantes para Finalizar tu Pedido:</span>
                </div>
                <p className="text-emerald-200/90 leading-relaxed text-[11px]">
                  Es muy importante que <strong>permanezcas atento(a) a tu celular en WhatsApp</strong>. Nuestro equipo técnico se comunicará contigo en breve para verificar tu transferencia o pago directo, confirmar los datos de envío e iniciar la fabricación 3D.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/40 text-left text-xs space-y-1.5 shadow-lg">
                <div className="font-bold text-sky-300 flex items-center gap-2 text-sm">
                  <Wallet className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>💳 Proceso de Confirmación de Pago Mercado Pago:</span>
                </div>
                <p className="text-sky-200/90 leading-relaxed text-[11px]">
                  Tan pronto Mercado Pago <strong>confirme tu transacción</strong>, recibirás una notificación de aprobación por <strong>WhatsApp y correo electrónico</strong>, e iniciaremos de inmediato la impresión 3D y fabricación de tu producto.
                </p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-2 font-bold text-slate-200">
                <span>Resumen de Orden:</span>
                <span>{completedOrder.items.length} productos</span>
              </div>
              {completedOrder.items.map((it, idx) => {
                const orderCurr = completedOrder.currency || currency;
                const formattedItemPrice = formatPrice(convertUsdToCop(it.price), it.price, orderCurr);
                return (
                  <div key={idx} className="flex justify-between text-slate-400 text-[11px]">
                    <span>
                      • {it.itemType === 'collar' && it.collarConfig
                          ? `Collar Mascota 3D — ${it.collarConfig.petName || 'Personalizado'} (Talla ${it.collarConfig.size})`
                          : it.itemType === 'clicker' && it.clickerConfig
                          ? `${it.clickerConfig.type === 'clicker' ? 'Clicker MX 3D' : 'Llavero 3D'} (${it.clickerConfig.size}mm)`
                          : `Litofanía ${it.config.shape === 'arc' ? 'Curvada' : it.config.shape === 'flat' ? 'Plana' : 'Cilíndrica'} (${it.config.width}x${it.config.height}mm)`}
                    </span>
                    <span className="font-semibold text-slate-200">{formattedItemPrice}</span>
                  </div>
                );
              })}

              <div className="flex justify-between pt-2 border-t border-slate-800 font-extrabold text-cyan-300">
                <span>Total Final ({completedOrder.currency || currency}):</span>
                <span>{formatPrice(convertUsdToCop(completedOrder.total), completedOrder.total, completedOrder.currency || currency)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {isAuthenticated && (
                <button
                  onClick={onDownloadSTL}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo 3D (.stl)</span>
                </button>
              )}

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
