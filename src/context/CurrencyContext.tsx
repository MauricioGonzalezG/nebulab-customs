import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchPricingConfig, getPricingDataSync, PricingData } from '../lib/priceConfig';
import { DollarSign, Globe } from 'lucide-react';

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

  return (
    <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-bold font-mono">
      <button
        onClick={() => setCurrency('COP')}
        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
          currency === 'COP'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Moneda principal: Peso Colombiano (COP)"
      >
        <Globe className="w-3 h-3" />
        <span>COP</span>
      </button>

      <button
        onClick={() => setCurrency('USD')}
        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
          currency === 'USD'
            ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Moneda internacional: Dólar Estadounidense (USD)"
      >
        <DollarSign className="w-3 h-3" />
        <span>USD</span>
      </button>
    </div>
  );
};
