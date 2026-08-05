export interface CurrencyConfig {
  code: 'COP' | 'USD';
  symbol: string;
  suffix: string;
  rate: number;
  format: 'integer' | 'decimal';
}

export interface PricingData {
  defaultCurrency: 'COP' | 'USD';
  currencies: Record<'COP' | 'USD', CurrencyConfig>;
  shipping: {
    standardFeeCop: number;
    standardFeeUsd: number;
    freeThresholdCop: number;
    freeThresholdUsd: number;
  };
  lithophane: {
    basePriceCop: number;
    basePriceUsd: number;
    sizeExtraMultiplierCop: number;
    sizeExtraMultiplierUsd: number;
    bases: Record<string, { cop: number; usd: number }>;
    giftBoxCop: number;
    giftBoxUsd: number;
  };
  clicker: {
    clickerBaseCop: number;
    clickerBaseUsd: number;
    keychainBaseCop: number;
    keychainBaseUsd: number;
    sizeExtraCop: number;
    sizeExtraUsd: number;
  };
  collar: {
    basePriceCop: number;
    basePriceUsd: number;
  };
}

const DEFAULT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<pricingConfig>
  <currencies default="COP">
    <currency code="COP" symbol="$" suffix="COP" rate="1.0" format="integer" />
    <currency code="USD" symbol="$" suffix="USD" rate="0.00025" format="decimal" />
  </currencies>

  <shipping>
    <standardFee cop="20000" usd="4.90" />
    <freeShippingThreshold cop="200000" usd="50.00" />
  </shipping>

  <products>
    <lithophane>
      <basePrice cop="60000" usd="14.90" />
      <sizeExtraMultiplier cop="22000" usd="5.50" />
      <bases>
        <base id="night-light" cop="34000" usd="8.50" />
        <base id="led-wooden-base" cop="56000" usd="14.00" />
        <base id="flat-stand" cop="16000" usd="4.00" />
      </bases>
      <giftBox cop="14000" usd="3.50" />
    </lithophane>

    <clicker>
      <clickerBase cop="60000" usd="14.90" />
      <keychainBase cop="40000" usd="9.90" />
      <sizeExtra cop="12000" usd="3.00" />
    </clicker>

    <collar>
      <basePrice cop="60000" usd="14.90" />
    </collar>
  </products>
</pricingConfig>`;

let cachedPricingData: PricingData | null = null;

export function parsePricingXml(xmlText: string): PricingData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const currenciesEl = xmlDoc.querySelector('currencies');
  const defaultCurrency = (currenciesEl?.getAttribute('default') as 'COP' | 'USD') || 'COP';

  const currencyMap: Record<'COP' | 'USD', CurrencyConfig> = {
    COP: { code: 'COP', symbol: '$', suffix: 'COP', rate: 1.0, format: 'integer' },
    USD: { code: 'USD', symbol: '$', suffix: 'USD', rate: 0.00025, format: 'decimal' },
  };

  xmlDoc.querySelectorAll('currency').forEach((el) => {
    const code = el.getAttribute('code') as 'COP' | 'USD';
    if (code) {
      currencyMap[code] = {
        code,
        symbol: el.getAttribute('symbol') || '$',
        suffix: el.getAttribute('suffix') || code,
        rate: parseFloat(el.getAttribute('rate') || '1.0'),
        format: (el.getAttribute('format') as 'integer' | 'decimal') || 'integer',
      };
    }
  });

  const stdFeeEl = xmlDoc.querySelector('standardFee');
  const freeThEl = xmlDoc.querySelector('freeShippingThreshold');

  const lithoEl = xmlDoc.querySelector('lithophane');
  const lithoBaseEl = lithoEl?.querySelector('basePrice');
  const lithoMultEl = lithoEl?.querySelector('sizeExtraMultiplier');
  const lithoGiftEl = lithoEl?.querySelector('giftBox');

  const basesRecord: Record<string, { cop: number; usd: number }> = {};
  lithoEl?.querySelectorAll('bases > base').forEach((b) => {
    const id = b.getAttribute('id');
    if (id) {
      basesRecord[id] = {
        cop: parseFloat(b.getAttribute('cop') || '0'),
        usd: parseFloat(b.getAttribute('usd') || '0'),
      };
    }
  });

  const clickerEl = xmlDoc.querySelector('clicker');
  const clickerBaseEl = clickerEl?.querySelector('clickerBase');
  const keychainBaseEl = clickerEl?.querySelector('keychainBase');
  const sizeExtraEl = clickerEl?.querySelector('sizeExtra');

  const collarEl = xmlDoc.querySelector('collar');
  const collarBaseEl = collarEl?.querySelector('basePrice');

  return {
    defaultCurrency,
    currencies: currencyMap,
    shipping: {
      standardFeeCop: parseFloat(stdFeeEl?.getAttribute('cop') || '20000'),
      standardFeeUsd: parseFloat(stdFeeEl?.getAttribute('usd') || '4.90'),
      freeThresholdCop: parseFloat(freeThEl?.getAttribute('cop') || '200000'),
      freeThresholdUsd: parseFloat(freeThEl?.getAttribute('usd') || '50.00'),
    },
    lithophane: {
      basePriceCop: parseFloat(lithoBaseEl?.getAttribute('cop') || '60000'),
      basePriceUsd: parseFloat(lithoBaseEl?.getAttribute('usd') || '14.90'),
      sizeExtraMultiplierCop: parseFloat(lithoMultEl?.getAttribute('cop') || '22000'),
      sizeExtraMultiplierUsd: parseFloat(lithoMultEl?.getAttribute('usd') || '5.50'),
      bases: basesRecord,
      giftBoxCop: parseFloat(lithoGiftEl?.getAttribute('cop') || '14000'),
      giftBoxUsd: parseFloat(lithoGiftEl?.getAttribute('usd') || '3.50'),
    },
    clicker: {
      clickerBaseCop: parseFloat(clickerBaseEl?.getAttribute('cop') || '60000'),
      clickerBaseUsd: parseFloat(clickerBaseEl?.getAttribute('usd') || '14.90'),
      keychainBaseCop: parseFloat(keychainBaseEl?.getAttribute('cop') || '40000'),
      keychainBaseUsd: parseFloat(keychainBaseEl?.getAttribute('usd') || '9.90'),
      sizeExtraCop: parseFloat(sizeExtraEl?.getAttribute('cop') || '12000'),
      sizeExtraUsd: parseFloat(sizeExtraEl?.getAttribute('usd') || '3.00'),
    },
    collar: {
      basePriceCop: parseFloat(collarBaseEl?.getAttribute('cop') || '60000'),
      basePriceUsd: parseFloat(collarBaseEl?.getAttribute('usd') || '14.90'),
    },
  };
}

export async function fetchPricingConfig(): Promise<PricingData> {
  if (cachedPricingData) return cachedPricingData;

  try {
    const response = await fetch('/prices.xml');
    if (response.ok) {
      const text = await response.text();
      cachedPricingData = parsePricingXml(text);
      return cachedPricingData;
    }
  } catch (err) {
    console.warn('Could not fetch /prices.xml, using default XML config:', err);
  }

  cachedPricingData = parsePricingXml(DEFAULT_XML);
  return cachedPricingData;
}

export function getPricingDataSync(): PricingData {
  if (!cachedPricingData) {
    cachedPricingData = parsePricingXml(DEFAULT_XML);
  }
  return cachedPricingData;
}
