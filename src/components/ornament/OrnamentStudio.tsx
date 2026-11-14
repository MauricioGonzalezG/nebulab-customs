import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, DragEvent } from 'react';
import { ArrowLeft, Bell, ChevronRight, CreditCard, Download, Gift, Home, ImagePlus, Loader2, Minus, Plus, RotateCcw, ShoppingBag, Star, Trash2, TreePine } from 'lucide-react';
import type { ManifoldToplevel } from 'manifold-3d';
import { buildOrnament, loadOrnamentEngine, OrnamentModel } from '../../core/ornamentBuilder';
import {
  DEFAULT_ORNAMENT, ORNAMENT_MAX_SIZE, ORNAMENT_MIN_SIZE, ORNAMENT_SHAPE_LABELS, ORNAMENT_SIZES, ORNAMENT_TEXT_MAX,
  ORNAMENT_WINDOW_LABELS, OrnamentConfig, OrnamentShape, OrnamentWindow, ornamentTier,
} from '../../core/ornamentConfig';
import { exportOrnament } from '../../core/ornamentExporter';
import { downloadOrnamentPrintPhoto, ornamentPreviewDataUrl, readOrnamentPhoto } from '../../core/ornamentPhoto';
import { cleanPlateText } from '../../core/plateBuilder';
import { OrnamentViewer } from '../3d/OrnamentViewer';
import { NumberSliderControl } from '../editor/NumberSliderControl';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { getPricingDataSync } from '../../lib/priceConfig';
import type { CartItem } from '../../types';

interface OrnamentStudioProps {
  onBackToHome: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
}

const panel = 'rounded-2xl border border-white/10 bg-white/[0.025] p-4 space-y-3.5';

const BaubleIcon = ({ size = 18 }: { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="14" r="8" /><path d="M10 6V3.5h4V6" />
  </svg>
);

const SHAPE_ICONS: Record<OrnamentShape, ComponentType<{ size?: number | string }>> = {
  gift: Gift, bauble: BaubleIcon, tree: TreePine, star: Star, bell: Bell, house: Home,
};

const COLOR_PRESETS = [
  { name: 'Blanco y rojo', body: '#f8fafc', accent: '#c81e1e' },
  { name: 'Blanco y azul', body: '#f8fafc', accent: '#3b82c4' },
  { name: 'Blanco y verde', body: '#f8fafc', accent: '#15803d' },
  { name: 'Blanco y dorado', body: '#f8fafc', accent: '#d4af37' },
  { name: 'Rojo y blanco', body: '#b91c1c', accent: '#f8fafc' },
  { name: 'Verde y dorado', body: '#166534', accent: '#d4af37' },
];

export function OrnamentStudio({ onBackToHome, onAddToCart, onBuyNow }: OrnamentStudioProps) {
  const { isAuthenticated } = useAuth();
  const { formatPrice } = useCurrency();
  const pData = getPricingDataSync();

  const [config, setConfig] = useState<OrnamentConfig>(DEFAULT_ORNAMENT);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [api, setApi] = useState<ManifoldToplevel>();
  const [model, setModel] = useState<OrnamentModel>();
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updating, setUpdating] = useState(true);
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<OrnamentConfig>) => { setNotice(''); setConfig(previous => ({ ...previous, ...patch })); };

  useEffect(() => {
    let active = true;
    setError('');
    loadOrnamentEngine().then(value => { if (active) setApi(value); }).catch(() => { if (active) setError('No se pudo cargar el generador 3D. Intenta nuevamente.'); });
    return () => { active = false; };
  }, [retry]);

  // El modelo solo depende de la geometría: mover la foto o cambiar colores no lo regenera.
  const { shape, window: windowShape, text, size, thickness, relief, backThickness, holeDiameter } = config;
  const geometry = useMemo(
    () => ({ shape, window: windowShape, text, size, thickness, relief, backThickness, holeDiameter }),
    [shape, windowShape, text, size, thickness, relief, backThickness, holeDiameter],
  );
  useEffect(() => {
    if (!api) return;
    setUpdating(true);
    const timer = setTimeout(() => {
      try { setModel(buildOrnament(api, { ...DEFAULT_ORNAMENT, ...geometry })); setError(''); }
      catch { setError('No se pudo generar el adorno. Cambia la forma o el texto y vuelve a intentarlo.'); }
      finally { setUpdating(false); }
    }, 120);
    return () => clearTimeout(timer);
  }, [api, geometry]);
  useEffect(() => () => model?.dispose(), [model]);

  const pickPhoto = async (file?: File | null) => {
    if (!file) return;
    setLoadingPhoto(true);
    setPhotoError('');
    try {
      const photo = await readOrnamentPhoto(file);
      setImage(photo.image);
      update({ imageUrl: photo.dataUrl, photoZoom: 1, photoX: 0, photoY: 0 });
    } catch (reason) {
      setPhotoError(reason instanceof Error ? reason.message : 'No se pudo cargar la foto.');
    } finally {
      setLoadingPhoto(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };
  const removePhoto = () => { setImage(null); update({ imageUrl: null, photoZoom: 1, photoX: 0, photoY: 0 }); };
  const onDrop = (event: DragEvent) => { event.preventDefault(); setDragging(false); void pickPhoto(event.dataTransfer.files?.[0]); };

  const ready = !!model && !updating && !error;
  const download = async (format: 'stl' | '3mf') => {
    if (!isAuthenticated || !model || !ready) return;
    setExporting(true);
    setNotice('');
    try { await exportOrnament(model, config, format); setNotice(`Archivo ${format.toUpperCase()} preparado para descargar.`); }
    catch { setNotice('No se pudo exportar el archivo. Intenta nuevamente.'); }
    finally { setExporting(false); }
  };

  const tier = ornamentTier(config.size);
  const unitPriceCop = pData.ornaments[`${tier}PriceCop`];
  const unitPriceUsd = pData.ornaments[`${tier}PriceUsd`];
  const sizeOption = ORNAMENT_SIZES.find(option => option.size === config.size);
  const shapeLabel = ORNAMENT_SHAPE_LABELS[config.shape];

  const createCartItem = (): CartItem => ({
    id: `ITEM-ORNAMENT-${Date.now()}`,
    itemType: 'ornament',
    title: `Decoración navideña ${shapeLabel}${config.text.trim() ? ` "${config.text.trim()}"` : ''} (${config.size} mm)`,
    config: {} as CartItem['config'],
    ornamentConfig: { ...config },
    previewImageDataUrl: ornamentPreviewDataUrl(model!, config, image),
    price: unitPriceUsd,
    quantity,
    createdAt: new Date().toISOString(),
  });

  const canOrder = ready && !!image;
  const orderCop = unitPriceCop * quantity;
  const orderUsd = unitPriceUsd * quantity;
  const freeShippingCop = orderCop >= pData.shipping.freeThresholdCop;
  const shippingCop = freeShippingCop ? 0 : pData.shipping.standardFeeCop;
  const shippingUsd = freeShippingCop ? 0 : pData.shipping.standardFeeUsd;
  const windowWidth = model ? model.windowBounds.maxX - model.windowBounds.minX : 0;
  const windowHeight = model ? model.windowBounds.maxY - model.windowBounds.minY : 0;
  const exportDisabled = !ready || exporting;

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
              <span className="font-semibold text-red-300">Navidad</span>
            </nav>
            <h1 className="font-outfit text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span>Decoraciones navideñas 3D</span>
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-red-300/30 bg-red-300/10 text-red-300">Nebulab Studio</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && <>
            <button onClick={() => void download('3mf')} disabled={exportDisabled} className="hidden sm:flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed" title="Descargar archivo multi-color para Bambu Studio / OrcaSlicer">
              <Download size={14} /> <span>{exporting ? 'Preparando…' : '.3MF'}</span>
            </button>
            <button onClick={() => void download('stl')} disabled={exportDisabled} className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed" title="Descargar archivo STL listo para imprimir">
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
        <div>
          <p className="brand-eyebrow mb-2">TU HISTORIA EN EL ÁRBOL</p>
          <h2 className="font-outfit text-2xl sm:text-3xl font-black">Diseña tu decoración navideña</h2>
          <p className="mt-3 text-sm text-slate-400 max-w-xl">Sube una foto, elige la forma y los colores, y cuélgala en tu árbol. La imprimimos en 3D, le ponemos tu foto y te la enviamos lista con su cordón.</p>
        </div>
        <TreePine className="hidden sm:block text-red-300 mt-6" size={34} />
      </div>

      <div className="grid lg:grid-cols-12 gap-7 items-start">
        <section className="min-w-0 lg:col-span-7 lg:sticky lg:top-24 space-y-4" aria-label="Vista previa del adorno">
          <div className="flex justify-between gap-3 items-center">
            <h3 className="font-bold text-lg">Tu adorno en 3D</h3>
            <span className="text-xs text-slate-400">{shapeLabel} · {config.size} mm{isAuthenticated ? ` · ${(config.backThickness + config.thickness + config.relief).toFixed(1)} mm de grosor` : ''}</span>
          </div>
          {model
            ? <OrnamentViewer model={model} config={config} image={image} />
            : <div className="h-[360px] sm:h-[500px] rounded-3xl border border-white/10 flex items-center justify-center gap-3 text-slate-400"><Loader2 className="animate-spin" size={20} /> Preparando tu adorno…</div>}
          {isAuthenticated && model && (
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              {[['Ventana de foto', `${windowWidth.toFixed(0)} × ${windowHeight.toFixed(0)} mm`], ['Orificio', `Ø ${config.holeDiameter} mm`], ['Marco + tapa', `${config.thickness} + ${config.backThickness} mm`]].map(([title, value]) => <div key={title} className="rounded-xl border border-white/10 p-3"><p className="text-slate-400">{title}</p><p className="mt-1 font-semibold">{value}</p></div>)}
            </div>
          )}
          {error && <div role="alert" className="text-sm text-rose-300">{error} {!api && <button className="underline ml-2" onClick={() => setRetry(value => value + 1)}>Reintentar</button>}</div>}
        </section>

        <section className="min-w-0 lg:col-span-5 space-y-4" aria-label="Personalizar adorno">
          <div className={panel}>
            <h3 className="font-bold">01 · Tu foto</h3>
            <input ref={fileInput} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={event => void pickPhoto(event.target.files?.[0])} />
            {image && config.imageUrl ? (
              <>
                <div className="flex items-center gap-3">
                  <img src={config.imageUrl} alt="Tu foto" className="h-16 w-16 shrink-0 rounded-xl border border-white/15 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200">Foto lista</p>
                    <p className="text-[11px] text-slate-500">Ajusta el encuadre hasta que se vea bien en la ventana.</p>
                  </div>
                  <button onClick={() => fileInput.current?.click()} className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10">Cambiar</button>
                  <button onClick={removePhoto} className="rounded-lg border border-white/15 p-1.5 text-slate-400 hover:bg-white/10 hover:text-rose-300" aria-label="Quitar foto"><Trash2 size={14} /></button>
                </div>
                <NumberSliderControl label="Zoom" value={Math.round(config.photoZoom * 100)} min={100} max={300} step={5} unit="%" color="violet" onChange={value => update({ photoZoom: value / 100 })} />
                <div className="grid grid-cols-2 gap-3">
                  <NumberSliderControl label="Horizontal" value={Math.round(config.photoX * 100)} min={-100} max={100} step={5} color="violet" onChange={value => update({ photoX: value / 100 })} />
                  <NumberSliderControl label="Vertical" value={Math.round(config.photoY * 100)} min={-100} max={100} step={5} color="violet" onChange={value => update({ photoY: value / 100 })} />
                </div>
              </>
            ) : (
              <button
                onClick={() => fileInput.current?.click()}
                onDragOver={event => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                disabled={loadingPhoto}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors ${dragging ? 'border-violet-400 bg-violet-500/10' : 'border-white/20 bg-white/[0.02] hover:border-violet-400/70 hover:bg-white/[0.05]'}`}
              >
                {loadingPhoto ? <Loader2 className="animate-spin text-violet-300" size={26} /> : <ImagePlus className="text-violet-300" size={26} />}
                <span className="text-sm font-bold text-white">{loadingPhoto ? 'Cargando tu foto…' : 'Sube tu foto'}</span>
                <span className="text-[11px] text-slate-400">Toca para elegirla o arrástrala aquí · JPG, PNG o WEBP</span>
              </button>
            )}
            {photoError && <p role="alert" className="text-[11px] text-rose-300">{photoError}</p>}
          </div>

          <div className={panel}>
            <h3 className="font-bold">02 · Forma</h3>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma del adorno">
              {(Object.keys(ORNAMENT_SHAPE_LABELS) as OrnamentShape[]).map(key => {
                const Icon = SHAPE_ICONS[key];
                const active = key === config.shape;
                return (
                  <button key={key} role="radio" aria-checked={active} onClick={() => update({ shape: key })} className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-semibold transition-colors ${active ? 'border-violet-400 bg-violet-600/25 text-white' : 'border-white/15 text-slate-300 hover:bg-white/10'}`}>
                    <Icon size={20} />
                    <span>{ORNAMENT_SHAPE_LABELS[key]}</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Ventana de la foto</span>
                {model && <span className="text-slate-500">{windowWidth.toFixed(0)} × {windowHeight.toFixed(0)} mm</span>}
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                {(Object.keys(ORNAMENT_WINDOW_LABELS) as OrnamentWindow[]).map(key => (
                  <button key={key} onClick={() => update({ window: key })} aria-pressed={key === config.window} className={`rounded-lg py-1.5 text-[11px] font-bold transition-colors ${key === config.window ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>{ORNAMENT_WINDOW_LABELS[key]}</button>
                ))}
              </div>
            </div>
          </div>

          <div className={panel}>
            <h3 className="font-bold">03 · Estilo</h3>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">Colores</span>
              <div className="flex items-center gap-1.5">
                {COLOR_PRESETS.map(preset => {
                  const active = preset.body === config.bodyColor && preset.accent === config.accentColor;
                  return <button key={preset.name} title={preset.name} aria-label={`Colores ${preset.name}`} aria-pressed={active} onClick={() => update({ bodyColor: preset.body, accentColor: preset.accent })} style={{ backgroundColor: preset.body }} className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${active ? 'border-violet-400 ring-2 ring-violet-500/40' : 'border-white/20 hover:border-white/40'}`}><span style={{ backgroundColor: preset.accent }} className="block h-3 w-3 rounded-full" /></button>;
                })}
              </div>
            </div>
            {isAuthenticated && (
              <div className="grid grid-cols-2 gap-3">{(['bodyColor', 'accentColor'] as const).map((key, i) => <label key={key} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs">{i ? 'Relieve' : 'Cuerpo'}<input aria-label={i ? 'Color del relieve' : 'Color del cuerpo'} type="color" value={config[key]} onChange={event => update({ [key]: event.target.value })} className="w-9 h-9 rounded cursor-pointer bg-transparent" /></label>)}</div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Tamaño</span>
                <span className="text-slate-500">{config.size} mm de lado mayor</span>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                {ORNAMENT_SIZES.map(option => (
                  <button key={option.label} onClick={() => update({ size: option.size })} aria-pressed={option.size === config.size} className={`rounded-lg py-1.5 text-[11px] font-bold transition-colors ${option.size === config.size ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>{option.label}</button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="flex items-center justify-between text-xs font-medium"><span>Texto en relieve (opcional)</span><span className="text-slate-500">{config.text.length}/{ORNAMENT_TEXT_MAX}</span></span>
              <input value={config.text} maxLength={ORNAMENT_TEXT_MAX} onChange={event => update({ text: cleanPlateText(event.target.value, ORNAMENT_TEXT_MAX) })} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-bold tracking-wider focus:border-violet-500 focus:outline-none" placeholder="Ej. NAVIDAD 2026" />
            </label>
            {model && !!config.text.trim() && model.textHeight < 2.6 && <p className="text-[11px] text-amber-300">El texto queda pequeño. Usa menos letras o un tamaño más grande para que se lea mejor.</p>}
          </div>

          <div className={panel}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">04 · Tu pedido</span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">Con foto y cordón</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-[11px] text-slate-400">Precio por unidad · {sizeOption?.label ?? `${config.size} mm`}</span>
                <span className="whitespace-nowrap text-xl font-extrabold text-white font-outfit sm:text-2xl">{formatPrice(unitPriceCop, unitPriceUsd)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQuantity(value => Math.max(1, value - 1))} disabled={quantity <= 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/10 disabled:opacity-40" aria-label="Quitar una unidad"><Minus size={13} /></button>
                <span className="w-6 text-center text-sm font-bold font-mono" aria-label="Unidades">{quantity}</span>
                <button onClick={() => setQuantity(value => Math.min(20, value + 1))} disabled={quantity >= 20} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/10 disabled:opacity-40" aria-label="Agregar una unidad"><Plus size={13} /></button>
              </div>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              {quantity > 1 && (
                <div className="flex justify-between"><span>{quantity} × {formatPrice(unitPriceCop, unitPriceUsd)}</span><span>{formatPrice(orderCop, orderUsd)}</span></div>
              )}
              <div className="flex justify-between"><span>Envío estimado</span>{freeShippingCop ? <span className="font-bold text-emerald-400">Gratis</span> : <span className="text-cyan-400">+{formatPrice(shippingCop, shippingUsd)}</span>}</div>
              <div className="flex items-baseline justify-between border-t border-white/10 pt-1.5 font-bold text-slate-100"><span>Total estimado con envío</span><span className="text-base font-extrabold font-outfit">{formatPrice(orderCop + shippingCop, orderUsd + shippingUsd)}</span></div>
            </div>
            {!image && <p className="text-[11px] text-amber-300">Sube tu foto para continuar.</p>}
            {image && <p className="text-[11px] text-slate-500">¿Varias fotos? Añade este adorno al carrito y repite con la siguiente foto.</p>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onAddToCart(createCartItem())} disabled={!canOrder} className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-2 py-3 text-[11px] font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"><ShoppingBag size={15} /> Añadir al Carrito</button>
              <button onClick={() => onBuyNow(createCartItem())} disabled={!canOrder} className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-violet-500/40 bg-violet-600 px-2 py-3 text-[11px] font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"><CreditCard size={15} /> Comprar Ahora</button>
            </div>
          </div>

          {isAuthenticated && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 space-y-5">
              <h3 className="font-bold">05 · Producción</h3>
              {([
                ['size', 'Lado mayor', ORNAMENT_MIN_SIZE, ORNAMENT_MAX_SIZE, 1], ['thickness', 'Grosor del marco', 1.6, 4, 0.2],
                ['relief', 'Altura del relieve', 0.4, 1.6, 0.2], ['backThickness', 'Grosor de la tapa', 0.6, 2, 0.2],
                ['holeDiameter', 'Diámetro del orificio', 2, 5, 0.5],
              ] as const).map(([key, label, min, max, step]) => <NumberSliderControl key={key} label={label} value={config[key]} min={min} max={max} step={step} unit="mm" color="violet" onChange={value => update({ [key]: value })} />)}
              <p className="text-xs leading-relaxed text-slate-400">Son dos piezas: el marco (con el relieve hacia arriba) y la tapa trasera. Imprime la foto a escala real, recórtala por su borde y pégala entre ambas. Para dos colores, cambia el filamento a los {config.thickness.toFixed(1)} mm o asigna los materiales del 3MF en tu laminador.</p>
              <div className="grid grid-cols-2 gap-3">{(['3mf', 'stl'] as const).map(format => <button key={format} disabled={exportDisabled} onClick={() => void download(format)} className={`${format === '3mf' ? 'brand-primary' : 'border border-white/20 hover:bg-white/10'} flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed`}><Download size={16} /> {exporting ? 'Preparando…' : `Descargar ${format.toUpperCase()}`}</button>)}</div>
              <button disabled={!ready || !image} onClick={() => image && model && downloadOrnamentPrintPhoto(image, config, model)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"><Download size={16} /> Foto para imprimir (PNG 300 dpi)</button>
              {notice && <p role="status" className="text-xs text-violet-300">{notice}</p>}
              <button onClick={() => update({ ...DEFAULT_ORNAMENT, imageUrl: config.imageUrl, photoZoom: config.photoZoom, photoX: config.photoX, photoY: config.photoY })} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"><RotateCcw size={13} /> Restablecer diseño</button>
            </div>
          )}
        </section>
      </div>
    </main>
  </>;
}
