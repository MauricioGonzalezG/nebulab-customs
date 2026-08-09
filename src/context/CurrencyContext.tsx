import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchPricingConfig, getPricingDataSync, PricingData } from '../lib/priceConfig';
import { DollarSign, Globe, ChevronDown, Check } from 'lucide-react';

export type CurrencyType = 'COP' | 'USD';

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (c: CurrencyType) => void;
  pricingData: PricingData;
  formatPrice: (amountCop: number, amountUsd?: number, overrideCurrency?: CurrencyType) => string;
  formatPriceUsdOnly: (amountUsd: number) => string;
  convertUsdToCop: (amountUsd: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyType>('COP');
  const [pricingData, setPricingData] = useState<PricingData>(getPricingDataSync());

  useEffect(() => {
    fetchPricingConfig().then((data) => {
      setPricingData(data);
      if (data.defaultCurrency) {
        setCurrencyState(data.defaultCurrency);
      }
    });
  }, []);

  const setCurrency = (c: CurrencyType) => {
    setCurrencyState(c);
  };

  const convertUsdToCop = (amountUsd: number): number => {
    const copPrice = amountUsd * 4000;
    return Math.round(copPrice);
  };

  const formatPrice = (amountCop: number, amountUsd?: number, overrideCurrency?: CurrencyType): string => {
    const activeCurrency = overrideCurrency || currency;

    if (activeCurrency === 'COP') {
      const val = Math.round(amountCop);
      return `$ ${val.toLocaleString('es-CO')} COP`;
    } else {
      const val = amountUsd !== undefined ? amountUsd : amountCop / 4000;
      return `$ ${val.toFixed(2)} USD`;
    }
  };

  const formatPriceUsdOnly = (amountUsd: number): string => {
    const cop = convertUsdToCop(amountUsd);
    return formatPrice(cop, amountUsd);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        pricingData,
        formatPrice,
        formatPriceUsdOnly,
        convertUsdToCop,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencySelector: React.FC = () => {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-bold font-mono text-slate-200 transition-colors flex items-center gap-1 sm:gap-1.5 shadow-md"
        title={`Moneda activa: ${currency === 'COP' ? 'Peso Colombiano (COP)' : 'Dólar (USD)'}`}
        aria-label="Cambiar moneda"
      >
        {currency === 'COP' ? (
          <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
        ) : (
          <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
        <span className="hidden sm:inline text-xs font-bold">{currency}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-1.5 space-y-1 backdrop-blur-xl">
          <button
            onClick={() => {
              setCurrency('COP');
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
              currency === 'COP'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>COP (Pesos)</span>
            </div>
            {currency === 'COP' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          <button
            onClick={() => {
              setCurrency('USD');
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
              currency === 'USD'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>USD (Dólares)</span>
            </div>
            {currency === 'USD' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      )}
    </div>
  );
};
