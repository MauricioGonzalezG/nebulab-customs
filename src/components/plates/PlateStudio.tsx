import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, CreditCard, Download, KeyRound, Loader2, Minus, Plus, RotateCcw, ShoppingBag } from 'lucide-react';
import type { ManifoldToplevel } from 'manifold-3d';
import { buildPlate, cleanPlateText, DEFAULT_PLATE, loadPlateEngine, platePriceFactor, PlateConfig, PlateModel } from '../../core/plateBuilder';
import { platePreviewDataUrl } from '../../core/platePreview';
import { exportPlate } from '../../core/plateExporter';
import { PlateViewer } from '../3d/PlateViewer';
import { NumberSliderControl } from '../editor/NumberSliderControl';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { getPricingDataSync } from '../../lib/priceConfig';
import type { CartItem } from '../../types';

interface PlateStudioProps {
  onBackToHome: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
}

const templates = [
  { name: 'Colombia', text: 'DLX 28F', subtitle: 'COLOMBIA' },
  { name: 'Clásica', text: 'HHW699', subtitle: '' },
  { name: 'Personal', text: 'SEBASTIAN', subtitle: 'MI LLAVERO' },
];
const panel = 'rounded-2xl border border-white/10 bg-white/[0.025] p-5 space-y-5';
const compactPanel = 'rounded-2xl border border-white/10 bg-white/[0.025] p-4 space-y-3.5';

const SIZE_OPTIONS = [
  { label: 'Compacta', width: 45, height: 24 },
  { label: 'Estándar', width: 60, height: 30 },
  { label: 'Grande', width: 90, height: 45 },
];

const PLATE_COLOR_PRESETS = [
  { name: 'Amarillo clásico', base: '#facc15', detail: '#171717' },
  { name: 'Blanco y negro', base: '#f1f5f9', detail: '#0f172a' },
  { name: 'Negro y blanco', base: '#1e293b', detail: '#f1f5f9' },
  { name: 'Dorado', base: '#d4af37', detail: '#1e293b' },
  { name: 'Rojo', base: '#dc2626', detail: '#f1f5f9' },
  { name: 'Azul', base: '#2563eb', detail: '#f1f5f9' },
];

export function PlateStudio({ onBackToHome, onAddToCart, onBuyNow }: PlateStudioProps) {
  const { isAuthenticated } = useAuth();
  const { formatPrice } = useCurrency();
  const pData = getPricingDataSync();
  const basePriceCop = pData.plates.unitPriceCop;
  const basePriceUsd = pData.plates.unitPriceUsd;

  const [config, setConfig] = useState<PlateConfig>(DEFAULT_PLATE);
  const [quantity, setQuantity] = useState(1);
  const [api, setApi] = useState<ManifoldToplevel>();
  const [model, setModel] = useState<PlateModel>();
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [updating, setUpdating] = useState(true);
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const update = (patch: Partial<PlateConfig>) => { setUpdating(true); setNotice(''); setConfig(previous => ({ ...previous, ...patch })); };

  useEffect(() => {
    let active = true;
    setError('');
    loadPlateEngine().then(value => { if (active) setApi(value); }).catch(() => { if (active) setError('No se pudo cargar el generador 3D. Intenta nuevamente.'); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (!api) return;
    setUpdating(true);
    const timer = setTimeout(() => {
      try { setModel(buildPlate(api, config)); setError(''); }
      catch { setError('No se pudo generar la placa. Revisa el texto y vuelve a intentarlo.'); }
      finally { setUpdating(false); }
    }, 120);
    return () => clearTimeout(timer);
  }, [api, config]);
  useEffect(() => () => model?.dispose(), [model]);

  const download = async (format: 'stl' | '3mf') => {
    if (!isAuthenticated || !model || updating || !config.text.trim()) return;
    setExporting(true);
    setNotice('');
    try { await exportPlate(model, config, format); setNotice(`Archivo ${format.toUpperCase()} preparado para descargar.`); }
    catch { setNotice('No se pudo exportar el archivo. Intenta nuevamente.'); }
    finally { setExporting(false); }
  };

  // El precio crece con el material de la placa (tamaño, grosor y relieve),
  // tomando la placa estándar 60×30×3 mm como tarifa base.
  const priceFactor = platePriceFactor(config);
  const unitPriceCop = Math.round((basePriceCop * priceFactor) / 100) * 100;
  const unitPriceUsd = Number((basePriceUsd * priceFactor).toFixed(2));
  const adjustCop = unitPriceCop - basePriceCop;
  const adjustUsd = Number((unitPriceUsd - basePriceUsd).toFixed(2));

  const createCartItem = (): CartItem => {
    const title = `Placa llavero "${config.text.trim() || 'Personalizada'}"${config.subtitle.trim() ? ` · ${config.subtitle.trim()}` : ''} (${config.width}×${config.height}mm)`;
    return {
      id: `ITEM-PLATE-${Date.now()}`,
      itemType: 'plate',
      title,
      config: {} as CartItem['config'],
      plateConfig: { ...config },
      previewImageDataUrl: platePreviewDataUrl(config),
      price: unitPriceUsd,
      quantity,
      createdAt: new Date().toISOString(),
    };
  };

  const canOrder = !!config.text.trim() && !updating && !!model;
  const orderCop = unitPriceCop * quantity;
  const orderUsd = unitPriceUsd * quantity;
  const freeShippingCop = orderCop >= pData.shipping.freeThresholdCop;
  const shippingCop = freeShippingCop ? 0 : pData.shipping.standardFeeCop;
  const shippingUsd = freeShippingCop ? 0 : pData.shipping.standardFeeUsd;

  return <>
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0f16]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBackToHome} className="p-2 rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/10 transition-colors" title="Volver al catálogo" aria-label="Volver al catálogo">
            <ArrowLeft size={16} />
          </button>
          <div>
            <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-[11px] text-slate-500">
              <button onClick={onBackToHome} className="hover:text-slate-300 transition-colors">Catálogo</button>
              <ChevronRight size={12} />
              <span className="font-semibold text-yellow-300">Placas</span>
            </nav>
            <h1 className="font-outfit text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span>Placas llavero 3D</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-yellow-300/30 bg-yellow-300/10 text-yellow-300">Nebulab Studio</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && <>
            <button onClick={() => void download('3mf')} disabled={!model || updating || !!error || exporting || !config.text.trim()} className="hidden sm:flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed" title="Descargar archivo multi-color para Bambu Studio / OrcaSlicer">
              <Download size={14} /> <span>{exporting ? 'Preparando…' : '.3MF'}</span>
            </button>
            <button onClick={() => void download('stl')} disabled={!model || updating || !!error || exporting || !config.text.trim()} className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed" title="Descargar archivo STL sólido listo para imprimir">
              <Download size={14} className="text-slate-400" /> <span>STL</span>
            </button>
          </>}
          <button onClick={() => onAddToCart(createCartItem())} disabled={!canOrder} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <ShoppingBag size={14} /> <span>Agregar ({formatPrice(orderCop, orderUsd)})</span>
          </button>
        </div>
      </div>
    </header>

    <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-7">
      <div className="flex items-start justify-between gap-4">
        <div><p className="brand-eyebrow mb-2">TU MATRÍCULA, EN MINIATURA</p><h2 className="font-outfit text-2xl sm:text-3xl font-black">Diseña tu placa</h2><p className="mt-3 text-sm text-slate-400 max-w-xl">{isAuthenticated ? 'Texto en relieve, esquinas redondeadas y ojal integrado en una sola pieza.' : 'Escribe tu matrícula o nombre, elige colores y tamaño, y añádela al carrito. Nosotros la fabricamos y te la enviamos.'}</p></div>
        <KeyRound className="hidden sm:block text-yellow-300 mt-6" size={34} />
      </div>
      <div className="grid lg:grid-cols-12 gap-7 items-start">
        <section className="lg:col-span-7 lg:sticky lg:top-24 space-y-4" aria-label="Vista previa de la placa">
          <div className="flex justify-between gap-3 items-center"><h3 className="font-bold text-lg">Tu placa en 3D</h3><span className="text-xs text-slate-400">{config.width} × {config.height}{isAuthenticated ? ` × ${(config.thickness + config.relief).toFixed(1)}` : ''} mm</span></div>
          {model ? <PlateViewer model={model} config={config} /> : <div className="h-[330px] sm:h-[470px] rounded-3xl border border-white/10 flex items-center justify-center gap-3 text-slate-400"><Loader2 className="animate-spin" size={20} /> Preparando tu placa…</div>}
          {isAuthenticated && <>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              {[['Relieve real', `${config.relief} mm`], ['Orificio pasante', `Ø ${config.holeDiameter} mm`], ['Base plana', `${config.thickness} mm`]].map(([title, value]) => <div key={title} className="rounded-xl border border-white/10 p-3"><p className="text-slate-400">{title}</p><p className="mt-1 font-semibold">{value}</p></div>)}
            </div>
            <p className="text-xs text-slate-500">Medidas del cuerpo de la placa; el ojal sobresale a la izquierda. La argolla metálica no forma parte del modelo.</p>
          </>}
          {error && <div role="alert" className="text-sm text-rose-300">{error} {!api && <button className="underline ml-2" onClick={() => setRetry(value => value + 1)}>Reintentar</button>}</div>}
        </section>
        <section className="lg:col-span-5 space-y-4" aria-label="Personalizar placa">
          {isAuthenticated ? (
            <>
              <div className={panel}>
                <h3 className="font-bold">01 · Tu diseño</h3>
                <div className="grid grid-cols-3 gap-2">{templates.map(template => <button key={template.name} onClick={() => update({ text: template.text, subtitle: template.subtitle })} className="rounded-xl border border-white/15 px-2 py-3 text-xs font-semibold hover:bg-white/10">{template.name}</button>)}</div>
                <label className="block text-sm font-medium">Matrícula o nombre<input value={config.text} maxLength={12} onChange={event => update({ text: cleanPlateText(event.target.value, 12) })} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg font-bold tracking-wider" placeholder="ABC 123" /><span className="block mt-1 text-xs text-slate-500">Hasta 12 caracteres · {config.text.length}/12</span></label>
                <label className="block text-sm font-medium">Segunda línea (opcional)<input value={config.subtitle} maxLength={18} onChange={event => update({ subtitle: cleanPlateText(event.target.value, 18) })} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 tracking-wider" placeholder="COLOMBIA" /></label>
                <label className="flex items-center justify-between text-sm">Borde en relieve<input type="checkbox" checked={config.border} onChange={event => update({ border: event.target.checked })} className="w-4 h-4 accent-violet-500" /></label>
                <div className="grid grid-cols-2 gap-3">{(['baseColor', 'detailColor'] as const).map((key, i) => <label key={key} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs">{i ? 'Texto y borde' : 'Base'}<input aria-label={i ? 'Color del texto y borde' : 'Color de base'} type="color" value={config[key]} onChange={event => update({ [key]: event.target.value })} className="w-9 h-9 rounded cursor-pointer bg-transparent" /></label>)}</div>
              </div>
              <div className={panel}>
                <h3 className="font-bold">02 · Tamaño y relieve</h3>
                {([
                  ['width', 'Ancho', 45, 90, 1], ['height', 'Alto', 24, 45, 1],
                  ['thickness', 'Grosor de base', 2, 5, 0.2], ['relief', 'Altura del relieve', 0.4, 1.6, 0.2],
                  ['holeDiameter', 'Diámetro del orificio', 3, 6, 0.5],
                ] as const).map(([key, label, min, max, step]) => <NumberSliderControl key={key} label={label} value={config[key]} min={min} max={max} step={step} unit="mm" color="violet" onChange={value => update({ [key]: value })} />)}
              </div>
            </>
          ) : (
            <>
              <div className={compactPanel}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold">01 · Tu diseño</h3>
                  <div className="flex gap-1">{templates.map(template => <button key={template.name} onClick={() => update({ text: template.text, subtitle: template.subtitle })} className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-white/10">{template.name}</button>)}</div>
                </div>
                <label className="block">
                  <span className="flex items-center justify-between text-xs font-medium"><span>Matrícula o nombre</span><span className="text-slate-500">{config.text.length}/12</span></span>
                  <input value={config.text} maxLength={12} onChange={event => update({ text: cleanPlateText(event.target.value, 12) })} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-base font-bold tracking-wider focus:border-violet-500 focus:outline-none" placeholder="ABC 123" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium">Segunda línea (opcional)</span>
                  <input value={config.subtitle} maxLength={18} onChange={event => update({ subtitle: cleanPlateText(event.target.value, 18) })} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm tracking-wider focus:border-violet-500 focus:outline-none" placeholder="Ej. COLOMBIA" />
                </label>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">Tamaño</span>
                    <span className="text-slate-500">{config.width} × {config.height} mm</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                    {SIZE_OPTIONS.map(option => {
                      const active = option.width === config.width;
                      return <button key={option.label} onClick={() => update({ width: option.width, height: option.height })} className={`rounded-lg py-1.5 text-[11px] font-bold transition-colors ${active ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>{option.label}</button>;
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300">Colores</span>
                  <div className="flex items-center gap-1.5">
                    {PLATE_COLOR_PRESETS.map(preset => {
                      const active = preset.base === config.baseColor && preset.detail === config.detailColor;
                      return <button key={preset.name} title={preset.name} aria-label={`Colores ${preset.name}`} onClick={() => update({ baseColor: preset.base, detailColor: preset.detail })} style={{ backgroundColor: preset.base }} className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${active ? 'border-violet-400 ring-2 ring-violet-500/40' : 'border-white/20 hover:border-white/40'}`}><span style={{ backgroundColor: preset.detail }} className="block h-3 w-3 rounded-full" /></button>;
                    })}
                  </div>
                </div>
                <label className="flex items-center justify-between text-xs text-slate-300">Borde decorativo<input type="checkbox" checked={config.border} onChange={event => update({ border: event.target.checked })} className="w-4 h-4 accent-violet-500" /></label>
              </div>
            </>
          )}
          <div className={compactPanel}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isAuthenticated ? '03 · ' : '02 · '}Tu pedido</span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">{isAuthenticated ? 'Impreso & Ensamblado' : 'Fabricado para ti'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-[11px] text-slate-400">Precio por unidad</span>
                <span className="text-2xl font-extrabold text-white font-outfit">{formatPrice(unitPriceCop, unitPriceUsd)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQuantity(value => Math.max(1, value - 1))} disabled={quantity <= 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/10 disabled:opacity-40" aria-label="Quitar una unidad"><Minus size={13} /></button>
                <span className="w-6 text-center text-sm font-bold font-mono" aria-label="Unidades">{quantity}</span>
                <button onClick={() => setQuantity(value => Math.min(20, value + 1))} disabled={quantity >= 20} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/10 disabled:opacity-40" aria-label="Agregar una unidad"><Plus size={13} /></button>
              </div>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              {adjustCop !== 0 && (
                <div className="flex justify-between">
                  <span>Ajuste por tamaño y material</span>
                  <span className={adjustCop > 0 ? 'text-cyan-400' : 'text-emerald-400'}>{adjustCop > 0 ? '+' : '-'}{formatPrice(Math.abs(adjustCop), Math.abs(adjustUsd))}</span>
                </div>
              )}
              {quantity > 1 && (
                <div className="flex justify-between"><span>{quantity} × {formatPrice(unitPriceCop, unitPriceUsd)}</span><span>{formatPrice(orderCop, orderUsd)}</span></div>
              )}
              <div className="flex justify-between"><span>Envío estimado</span>{freeShippingCop ? <span className="font-bold text-emerald-400">Gratis</span> : <span className="text-cyan-400">+{formatPrice(shippingCop, shippingUsd)}</span>}</div>
              <div className="flex items-baseline justify-between border-t border-white/10 pt-1.5 font-bold text-slate-100"><span>Total estimado con envío</span><span className="text-base font-extrabold font-outfit">{formatPrice(orderCop + shippingCop, orderUsd + shippingUsd)}</span></div>
            </div>
            {!config.text.trim() && <p className="text-[11px] text-amber-300">Escribe una matrícula o un nombre para continuar.</p>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onAddToCart(createCartItem())} disabled={!canOrder} className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-40"><ShoppingBag size={15} /> Añadir al Carrito</button>
              <button onClick={() => onBuyNow(createCartItem())} disabled={!canOrder} className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-600 px-3 py-3 text-xs font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"><CreditCard size={15} /> Comprar Ahora</button>
            </div>
          </div>
          {isAuthenticated && (
            <div className={panel}>
              <h3 className="font-bold">04 · Detalles de impresión</h3>
              <p className="text-xs leading-relaxed text-slate-400">Imprime con la base plana sobre la cama. Para dos colores, cambia el filamento a los {config.thickness.toFixed(1)} mm o asigna los materiales del 3MF en tu laminador.</p>
              {model && model.smallestTextHeight < 3 && <p className="text-xs text-amber-300">El texto es pequeño. Usa menos caracteres o aumenta el tamaño para mejorar la impresión.</p>}
              <div className="grid grid-cols-2 gap-3">{(['3mf', 'stl'] as const).map(format => <button key={format} disabled={!model || updating || !!error || exporting || !config.text.trim()} onClick={() => void download(format)} className={`${format === '3mf' ? 'brand-primary' : 'border border-white/20 hover:bg-white/10'} flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed`}><Download size={16} /> {exporting ? 'Preparando…' : `Descargar ${format.toUpperCase()}`}</button>)}</div>
              <p className="text-xs text-slate-500">3MF: base y relieve con colores · STL: pieza unificada sin color. Revisa la escala en milímetros y las capas antes de imprimir.</p>
              {notice && <p role="status" className="text-xs text-violet-300">{notice}</p>}
              <button onClick={() => update({ ...DEFAULT_PLATE })} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"><RotateCcw size={13} /> Restablecer diseño</button>
            </div>
          )}
        </section>
      </div>
    </main>
  </>;
}
