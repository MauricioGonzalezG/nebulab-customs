import React, { useState } from 'react';
import { LithophaneConfig } from '../../types';
import { ShoppingBag, CreditCard, Gift, Truck, Clock, ShieldCheck, Check } from 'lucide-react';
import { getPricingDataSync } from '../../lib/priceConfig';
import { useCurrency } from '../../context/CurrencyContext';

interface PricingSummaryProps {
  config: LithophaneConfig;
  previewDataUrl: string | null;
  onAddToCart: (giftBox: boolean) => void;
  onBuyNow: (giftBox: boolean) => void;
}

export function calculatePrice(config: LithophaneConfig, giftBox: boolean = false): {
  basePrice: number;
  sizeExtra: number;
  baseExtra: number;
  giftExtra: number;
  totalPrice: number;
  basePriceCop: number;
  sizeExtraCop: number;
  baseExtraCop: number;
  giftExtraCop: number;
  totalPriceCop: number;
} {
  const data = getPricingDataSync();
  const litho = data.lithophane;

  const basePriceCop = litho.basePriceCop;
  const basePriceUsd = litho.basePriceUsd;

  const baseArea = 120 * 100; // Base size up to 120x100 mm (12000 mm²)
  const currentArea = config.width * config.height;
  const extraArea = Math.max(0, (currentArea - baseArea) / 10000);
  const sizeExtraCop = extraArea * litho.sizeExtraMultiplierCop;
  const sizeExtraUsd = extraArea * litho.sizeExtraMultiplierUsd;

  let baseExtraCop = 0;
  let baseExtraUsd = 0;
  if (config.baseType && litho.bases[config.baseType]) {
    baseExtraCop = litho.bases[config.baseType].cop;
    baseExtraUsd = litho.bases[config.baseType].usd;
  }

  const giftExtraCop = giftBox ? litho.giftBoxCop : 0;
  const giftExtraUsd = giftBox ? litho.giftBoxUsd : 0;

  const totalPriceCop = basePriceCop + sizeExtraCop + baseExtraCop + giftExtraCop;
  const totalPrice = basePriceUsd + sizeExtraUsd + baseExtraUsd + giftExtraUsd;

  return {
    basePrice: basePriceUsd,
    sizeExtra: sizeExtraUsd,
    baseExtra: baseExtraUsd,
    giftExtra: giftExtraUsd,
    totalPrice,
    basePriceCop,
    sizeExtraCop,
    baseExtraCop,
    giftExtraCop,
    totalPriceCop,
  };
}

export const PricingSummary: React.FC<PricingSummaryProps> = ({
  config,
  onAddToCart,
  onBuyNow
}) => {
  const { formatPrice } = useCurrency();
  const [giftBox, setGiftBox] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  const priceDetails = calculatePrice(config, giftBox);

  const handleAdd = () => {
    onAddToCart(giftBox);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800/90 p-5 shadow-2xl space-y-5">
      {/* Price Header */}
      <div className="flex items-baseline justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Precio Personalizado
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
              {formatPrice(priceDetails.totalPriceCop, priceDetails.totalPrice)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <Truck className="w-3.5 h-3.5" />
          <span>Envío 24-48h</span>
        </div>
      </div>

      {/* Breakdown List */}
      <div className="space-y-2 text-xs text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">Litofanía 3D Base (hasta 120x100 mm)</span>
          <span>{formatPrice(priceDetails.basePriceCop, priceDetails.basePrice)}</span>
        </div>

        {priceDetails.sizeExtraCop > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-400">
              Dimensiones ({config.width}x{config.height} mm)
            </span>
            <span className="text-cyan-400">+{formatPrice(priceDetails.sizeExtraCop, priceDetails.sizeExtra)}</span>
          </div>
        )}

        {priceDetails.baseExtraCop > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-400">
              {config.baseType === 'night-light' && 'Soporte Luz de Noche LED'}
              {config.baseType === 'led-wooden-base' && 'Base Madera LED RGB'}
              {config.baseType === 'flat-stand' && 'Soporte de Escritorio'}
            </span>
            <span className="text-cyan-400">+{formatPrice(priceDetails.baseExtraCop, priceDetails.baseExtra)}</span>
          </div>
        )}

        {giftBox && (
          <div className="flex justify-between">
            <span className="text-slate-400">Caja de Regalo Premium & Tarjeta</span>
            <span className="text-cyan-400">+{formatPrice(priceDetails.giftExtraCop, priceDetails.giftExtra)}</span>
          </div>
        )}
      </div>

      {/* Gift Box Checkbox Option */}
      <div
        onClick={() => setGiftBox(!giftBox)}
        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${giftBox
          ? 'bg-violet-500/10 border-violet-500/80 text-white'
          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
      >
        <div className="flex items-center gap-2.5">
          <Gift className={`w-4 h-4 ${giftBox ? 'text-violet-400' : 'text-slate-400'}`} />
          <div>
            <div className="text-xs font-semibold text-slate-200">
              ¿Es un regalo? Empaque Especial
            </div>
            <p className="text-[10px] text-slate-400">Caja rígida protectora con cinta y dedicatoria</p>
          </div>
        </div>
        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${giftBox ? 'bg-violet-500 border-violet-500 text-white' : 'border-slate-700 bg-slate-900'
          }`}>
          {giftBox && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <button
          onClick={handleAdd}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-xl ${addedAnimation
            ? 'bg-emerald-500 text-white scale-[0.99]'
            : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 hover:scale-[1.01] active:scale-95'
            }`}
        >
          {addedAnimation ? (
            <>
              <Check className="w-5 h-5 animate-bounce" />
              <span>¡Añadido al Carrito!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-5 h-5" />
              <span>Añadir al Carrito</span>
            </>
          )}
        </button>

        <button
          onClick={() => onBuyNow(giftBox)}
          className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-500 text-white border border-violet-500/40 flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 transition-all hover:scale-[1.01] active:scale-95"
        >
          <CreditCard className="w-4 h-4" />
          <span>Comprar Ahora</span>
        </button>
      </div>

      {/* Guarantees */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Producción en 24h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Garantía de Satisfacción</span>
        </div>
      </div>
    </div>
  );
};
