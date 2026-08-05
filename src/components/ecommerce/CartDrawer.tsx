import React from 'react';
import { CartItem } from '../../types';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}) => {
  const { formatPriceUsdOnly, pricingData } = useCurrency();

  if (!isOpen) return null;

  const subtotalUsd = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const freeThresholdUsd = pricingData.shipping.freeThresholdUsd;
  const isFreeShipping = subtotalUsd >= freeThresholdUsd || items.length === 0;
  const shippingFeeUsd = isFreeShipping ? 0 : pricingData.shipping.standardFeeUsd;
  const totalUsd = subtotalUsd + shippingFeeUsd;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold font-outfit">Tu Carrito de Compras</h2>
              <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress bar */}
          <div className="bg-slate-950/60 p-4 border-b border-slate-800/80">
            {isFreeShipping ? (
              <div className="text-xs text-emerald-400 font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>¡Genial! Tienes Envío GRATIS asegurado.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Agrega {formatPriceUsdOnly(freeThresholdUsd - subtotalUsd)} más para Envío Gratis</span>
                  <span className="font-bold text-cyan-400">
                    {Math.round((subtotalUsd / freeThresholdUsd) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, (subtotalUsd / freeThresholdUsd) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
                <ShoppingBag className="w-12 h-12 stroke-[1.5] text-slate-700" />
                <p className="text-sm font-medium text-slate-400">Tu carrito está vacío.</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Personalizar mi Litofanía
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                    <img
                      src={item.previewImageDataUrl}
                      alt="Litofanía 3D"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-slate-200 capitalize">
                          {item.itemType === 'collar'
                            ? `Collar Mascota 3D (${item.collarConfig?.petName || 'Personalizado'})`
                            : item.itemType === 'clicker'
                            ? (item.clickerConfig?.type === 'clicker' ? 'Clicker MX 3D' : 'Llavero 3D')
                            : `Litofanía ${item.config.shape === 'arc' ? 'Curvada' : item.config.shape === 'flat' ? 'Plana' : 'Cilíndrica'}`}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Config Tags */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.itemType === 'collar' && item.collarConfig ? (
                          <>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              Talla {item.collarConfig.size}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50 uppercase font-mono">
                              Correa: {item.collarConfig.strapColor}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50 uppercase font-mono">
                              Placa: {item.collarConfig.plateStyle}
                            </span>
                          </>
                        ) : item.itemType === 'clicker' && item.clickerConfig ? (
                          <>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.clickerConfig.size}mm
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800/50 uppercase font-mono">
                              Base: {item.clickerConfig.baseStyle}
                            </span>
                            {item.clickerConfig.type === 'clicker' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50 uppercase font-mono">
                                Switch: {item.clickerConfig.switchType}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.config.width}x{item.config.height}mm
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                              {item.config.baseType === 'night-light' ? 'Luz Noche' : item.config.baseType === 'led-wooden-base' ? 'Madera LED' : 'Standard'}
                            </span>
                          </>
                        )}
                      </div>


                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-white font-mono">
                        {formatPriceUsdOnly(item.price * item.quantity)}
                      </span>

                      <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="w-5 h-5 flex items-center justify-center text-xs text-slate-300 hover:bg-slate-700 rounded"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-white font-mono px-1">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-5 h-5 flex items-center justify-center text-xs text-slate-300 hover:bg-slate-700 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-slate-800 bg-slate-950/90 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-200">{formatPriceUsdOnly(subtotalUsd)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Envío Estimado</span>
                  <span className="font-mono text-slate-200">
                    {shippingFeeUsd === 0 ? <span className="text-emerald-400 font-bold">GRATIS</span> : formatPriceUsdOnly(shippingFeeUsd)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total</span>
                  <span className="font-mono text-cyan-400">{formatPriceUsdOnly(totalUsd)}</span>
                </div>
              </div>

              <button
                onClick={onCheckout}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95"
              >
                <span>Proceder al Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
