import React, { useEffect, useRef, useState } from 'react';
import {
  CollarConfig,
  CartItem,
  CollarPlateStyle,
  CollarStrapColor,
  CollarIcon,
  CollarReliefStyle,
  CollarLightingMode,
  CollarViewMode,
} from '../../types';
import {
  processCollarImage,
  ProcessedCollarData,
  COLLAR_SAMPLE_IMAGES,
  createDefaultCollarConfig,
} from '../../core/collarProcessor';
import { downloadCollar3MF } from '../../core/collar3mfExporter';
import { downloadCollarSTL } from '../../core/collarStlExporter';
import { CollarViewer } from '../3d/CollarViewer';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import {
  ArrowLeft,
  Check,
  Download,
  ImagePlus,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';

interface CollarStudioProps {
  onBackToHome: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
}

const TEXT_COLORS = [
  { hex: '#FFFFFF', label: 'Blanco' },
  { hex: '#000000', label: 'Negro' },
  { hex: '#D4AF37', label: 'Dorado' },
  { hex: '#EF4444', label: 'Rojo' },
  { hex: '#38BDF8', label: 'Azul claro' },
  { hex: '#A3E635', label: 'Verde lima' },
];

const STRAP_COLORS: Array<{ id: CollarStrapColor; label: string; hex: string }> = [
  { id: 'olive', label: 'Verde militar', hex: '#4d5d36' },
  { id: 'crimson', label: 'Rojo carmesí', hex: '#991b1b' },
  { id: 'black', label: 'Negro', hex: '#1e293b' },
  { id: 'navy', label: 'Azul marino', hex: '#1e3a8a' },
  { id: 'pink', label: 'Rosa', hex: '#be185d' },
  { id: 'brown', label: 'Café', hex: '#78350f' },
  { id: 'yellow', label: 'Amarillo', hex: '#eab308' },
];

const PLATE_STYLES: Array<{ id: CollarPlateStyle; label: string }> = [
  { id: 'bone', label: 'Hueso' },
  { id: 'rounded', label: 'Redondeada' },
  { id: 'rectangle', label: 'Rectangular' },
  { id: 'circle', label: 'Medalla' },
  { id: 'shield', label: 'Escudo' },
  { id: 'heart', label: 'Corazón' },
  { id: 'hexagon', label: 'Hexágono' },
  { id: 'pill', label: 'Cápsula' },
  { id: 'silhouette', label: 'Silueta' },
];

const PLATE_COLORS = [
  { hex: '#D4AF37', label: 'Dorado' },
  { hex: '#1E293B', label: 'Azul oscuro' },
  { hex: '#FFFFFF', label: 'Blanco' },
  { hex: '#991B1B', label: 'Rojo' },
  { hex: '#1E3A8A', label: 'Azul' },
  { hex: '#94A3B8', label: 'Plata' },
];

const ICONS: Array<{ id: CollarIcon; label: string }> = [
  { id: 'none', label: 'Sin ícono' },
  { id: 'paw', label: 'Huella' },
  { id: 'bone', label: 'Hueso' },
  { id: 'heart', label: 'Corazón' },
  { id: 'crown', label: 'Corona' },
  { id: 'star', label: 'Estrella' },
  { id: 'cross', label: 'Cruz' },
];

const RELIEF_STYLES: Array<{ id: CollarReliefStyle; label: string }> = [
  { id: 'embossed', label: 'En relieve' },
  { id: 'debossed', label: 'Hundido' },
  { id: 'inlaid', label: 'Incrustado' },
];

const LIGHTING_MODES: Array<{ id: CollarLightingMode; label: string }> = [
  { id: 'studio', label: 'Estudio' },
  { id: 'daylight', label: 'Día' },
  { id: 'warm', label: 'Cálida' },
  { id: 'neon', label: 'Neón' },
];

const VIEW_MODES: Array<{ id: CollarViewMode; label: string }> = [
  { id: 'assembled', label: 'Ensamblado' },
  { id: 'plate', label: 'Placa' },
  { id: 'back', label: 'Reverso' },
  { id: 'exploded', label: 'Explosión' },
  { id: 'printbed', label: 'Impresión' },
];

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const choiceClass = (selected: boolean) =>
  `min-h-10 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
    selected
      ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100'
      : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white'
  }`;

const sectionClass = 'rounded-2xl border border-slate-800 bg-slate-900/75 p-4 sm:p-5 space-y-4';
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400';

function Swatches({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{ hex: string; label: string }>;
  selected: string;
  onSelect: (hex: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-200">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.toLowerCase() === option.hex.toLowerCase();
          const darkMark = ['#FFFFFF', '#D4AF37', '#94A3B8', '#A3E635', '#38BDF8'].includes(option.hex);
          return (
            <button
              key={option.hex}
              type="button"
              aria-label={`${label}: ${option.label}`}
              aria-pressed={active}
              title={option.label}
              onClick={() => onSelect(option.hex)}
              style={{ backgroundColor: option.hex }}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${active ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-slate-600/50'}`}
            >
              {active && <Check aria-hidden="true" className={`h-5 w-5 ${darkMark ? 'text-slate-950' : 'text-white'}`} />}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-400">Seleccionado: {options.find((option) => option.hex.toLowerCase() === selected.toLowerCase())?.label || selected}</p>
    </fieldset>
  );
}

function Measure({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2 text-sm text-slate-200">
      <span className="flex justify-between gap-3"><span>{label}</span><output className="font-mono font-semibold text-cyan-300">{value} mm</output></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan-400"
        aria-label={label}
      />
    </label>
  );
}

export const CollarStudio: React.FC<CollarStudioProps> = ({ onBackToHome, onAddToCart, onBuyNow }) => {
  const { formatPrice, pricingData } = useCurrency();
  const { isAuthenticated } = useAuth();
  const collarPriceCop = pricingData.collar.basePriceCop;
  // The cart stores USD and its COP display uses a fixed 4,000 conversion.
  // Derive both displays from the configured COP price so checkout matches the studio.
  const collarPriceUsd = collarPriceCop / 4000;

  const [config, setConfig] = useState<CollarConfig>(createDefaultCollarConfig);
  const [loadedImage, setLoadedImage] = useState<{ url: string; image: HTMLImageElement } | null>(null);
  const [processedResult, setProcessedResult] = useState<{ key: string; data: ProcessedCollarData } | null>(null);
  const [imageError, setImageError] = useState<{ key: string; message: string } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [exporting, setExporting] = useState<'3mf' | 'stl' | null>(null);
  const [exportNotice, setExportNotice] = useState('');
  const viewerRef = useRef<HTMLDivElement>(null);
  const fileReaderRef = useRef<FileReader | null>(null);

  useEffect(() => () => {
    if (fileReaderRef.current?.readyState === FileReader.LOADING) fileReaderRef.current.abort();
  }, []);

  function updateConfig<K extends keyof CollarConfig>(key: K, value: CollarConfig[K]) {
    setConfig((previous) => ({ ...previous, [key]: value }));
  }

  const imageUrl = config.imageUrl || COLLAR_SAMPLE_IMAGES[0].url;
  const processingKey = `${imageUrl}|${config.removeBackground}|${config.imageRotation}|${config.flipHorizontal}`;
  const processedData = processedResult?.key === processingKey ? processedResult.data : null;
  const activeError = imageError?.key === processingKey || imageError?.key === imageUrl ? imageError.message : '';
  const isProcessing = !processedData && !activeError;
  const canOrder = Boolean(processedData && config.petName.trim() && !exporting);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (cancelled) return;
      if (!image.naturalWidth || !image.naturalHeight) {
        setImageError({ key: imageUrl, message: 'La imagen no tiene dimensiones válidas.' });
        return;
      }
      setLoadedImage({ url: imageUrl, image });
    };
    image.onerror = () => {
      if (!cancelled) setImageError({ key: imageUrl, message: 'No se pudo abrir la imagen. Prueba otro archivo o una plantilla.' });
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
    // The image only needs to be decoded again when its source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  useEffect(() => {
    if (!loadedImage || loadedImage.url !== imageUrl) return;
    let cancelled = false;
    const task = window.setTimeout(() => {
      try {
        const data = processCollarImage(loadedImage.image, config);
        if (!cancelled) {
          setProcessedResult({ key: processingKey, data });
          setImageError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setImageError({ key: processingKey, message: error instanceof Error ? error.message : 'No se pudo procesar la imagen.' });
        }
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(task);
    };
    // Only image transforms require processing; the viewer handles the remaining config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedImage, imageUrl, config.removeBackground, config.imageRotation, config.flipHorizontal]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (fileReaderRef.current?.readyState === FileReader.LOADING) fileReaderRef.current.abort();
    setUploadError('');
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Usa una imagen PNG, JPG o WebP.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('La imagen supera 8 MB. Elige una versión más liviana.');
      return;
    }
    const reader = new FileReader();
    fileReaderRef.current = reader;
    reader.onload = () => {
      if (fileReaderRef.current !== reader) return;
      if (typeof reader.result !== 'string') {
        setUploadError('No se pudo leer la imagen.');
        return;
      }
      setUploadName(file.name);
      setConfig((previous) => ({ ...previous, imageUrl: reader.result as string, sampleId: undefined }));
    };
    reader.onerror = () => {
      if (fileReaderRef.current === reader) setUploadError('No se pudo leer la imagen.');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: typeof COLLAR_SAMPLE_IMAGES[number]) => {
    if (fileReaderRef.current?.readyState === FileReader.LOADING) fileReaderRef.current.abort();
    fileReaderRef.current = null;
    setUploadError('');
    setUploadName('');
    setConfig((previous) => ({ ...previous, imageUrl: sample.url, sampleId: sample.id }));
  };

  const resetConfig = () => {
    if (fileReaderRef.current?.readyState === FileReader.LOADING) fileReaderRef.current.abort();
    fileReaderRef.current = null;
    setConfig(createDefaultCollarConfig());
    setUploadError('');
    setUploadName('');
    setExportNotice('');
    viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const createCartItem = (): CartItem => ({
    id: `COLLAR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemType: 'collar',
    title: `Collar para Mascota 3D - ${config.petName.trim()} (Talla ${config.size})`,
    config: {} as CartItem['config'],
    collarConfig: { ...config, petName: config.petName.trim(), phoneText: config.phoneText.trim() },
    previewImageDataUrl: processedData?.previewDataUrl || '',
    price: collarPriceUsd,
    quantity: 1,
    createdAt: new Date().toISOString(),
  });

  const handleExport = async (format: '3mf' | 'stl') => {
    if (!processedData || exporting) return;
    setExporting(format);
    setExportNotice('');
    try {
      if (format === '3mf') await downloadCollar3MF(processedData, config);
      else await downloadCollarSTL(processedData, config);
      setExportNotice(`Archivo ${format.toUpperCase()} descargado.`);
    } catch (error) {
      setExportNotice(error instanceof Error ? `No se pudo exportar: ${error.message}` : 'No se pudo exportar el archivo.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter selection:bg-cyan-500 selection:text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onBackToHome} aria-label="Volver al inicio" className="shrink-0 rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-slate-200 hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"><ArrowLeft className="h-5 w-5" /></button>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Nebulab Studio</p>
              <h1 className="font-outfit text-xl font-bold leading-tight text-white sm:text-2xl">Collar personalizado 3D</h1>
            </div>
          </div>
          <button type="button" onClick={resetConfig} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"><RotateCcw className="h-4 w-4" /> Reiniciar diseño</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(330px,390px)_minmax(0,1fr)] lg:items-start lg:px-8 lg:py-8">
        <main className="order-2 space-y-5 lg:order-1">
          <section className={sectionClass} aria-labelledby="collar-identity-title">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">01 · Identidad</p><h2 id="collar-identity-title" className="mt-1 font-outfit text-lg font-bold">Datos de la mascota</h2></div>
            <label className="block space-y-2 text-sm font-medium text-slate-200">Nombre en la placa
              <input className={inputClass} type="text" maxLength={18} autoComplete="off" value={config.petName} onChange={(event) => updateConfig('petName', event.target.value)} placeholder="Ej. Kolla" aria-required="true" />
            </label>
            {!config.petName.trim() && <p className="text-xs text-amber-300" role="alert">Escribe el nombre para poder añadir el collar.</p>}
            <label className="block space-y-2 text-sm font-medium text-slate-200">Teléfono de contacto
              <input className={inputClass} type="tel" inputMode="tel" maxLength={20} autoComplete="tel" value={config.phoneText} onChange={(event) => updateConfig('phoneText', event.target.value)} placeholder="Ej. 315 678 9012" />
            </label>
            <Swatches label="Color del texto" options={TEXT_COLORS} selected={config.textColor} onSelect={(hex) => updateConfig('textColor', hex)} />
            <fieldset className="space-y-2"><legend className="text-sm font-medium text-slate-200">Ícono de la placa</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">{ICONS.map((item) => <button key={item.id} type="button" aria-pressed={config.icon === item.id} onClick={() => updateConfig('icon', item.id)} className={choiceClass(config.icon === item.id)}>{item.label}</button>)}</div></fieldset>
            <fieldset className="space-y-2"><legend className="text-sm font-medium text-slate-200">Acabado del grabado</legend><div className="grid grid-cols-3 gap-2">{RELIEF_STYLES.map((item) => <button key={item.id} type="button" aria-pressed={config.reliefStyle === item.id} onClick={() => updateConfig('reliefStyle', item.id)} className={choiceClass(config.reliefStyle === item.id)}>{item.label}</button>)}</div></fieldset>
          </section>

          <section className={sectionClass} aria-labelledby="collar-build-title">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">02 · Estructura</p><h2 id="collar-build-title" className="mt-1 font-outfit text-lg font-bold">Collar y placa</h2></div>
            <fieldset className="space-y-2"><legend className="text-sm font-medium text-slate-200">Tipo de montaje</legend><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={config.mountType === 'slide'} onClick={() => updateConfig('mountType', 'slide')} className={choiceClass(config.mountType === 'slide')}>Pasante posterior</button><button type="button" aria-pressed={config.mountType === 'dangling'} onClick={() => updateConfig('mountType', 'dangling')} className={choiceClass(config.mountType === 'dangling')}>Colgante con anilla</button></div><p className="text-xs text-slate-400">{config.mountType === 'slide' ? 'La correa atraviesa un canal detrás de la placa; el frente queda sin perforaciones.' : 'La placa cuelga de una anilla superior.'}</p></fieldset>
            <fieldset className="space-y-2"><legend className="text-sm font-medium text-slate-200">Talla de la correa</legend><div className="grid grid-cols-4 gap-2">{(['S', 'M', 'L', 'XL'] as const).map((size) => <button key={size} type="button" aria-pressed={config.size === size} onClick={() => updateConfig('size', size)} className={choiceClass(config.size === size)}>{size}</button>)}</div></fieldset>
            <fieldset className="space-y-2"><legend className="text-sm font-medium text-slate-200">Color de la correa</legend><div className="flex flex-wrap gap-2">{STRAP_COLORS.map((item) => <button key={item.id} type="button" aria-label={`Color de la correa: ${item.label}`} aria-pressed={config.strapColor === item.id} title={item.label} onClick={() => updateConfig('strapColor', item.id)} style={{ backgroundColor: item.hex }} className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${config.strapColor === item.id ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-slate-600/50'}`}>{config.strapColor === item.id && <Check aria-hidden="true" className={`h-5 w-5 ${item.id === 'yellow' ? 'text-slate-950' : 'text-white'}`} />}</button>)}</div><p className="text-xs text-slate-400">Seleccionado: {STRAP_COLORS.find((item) => item.id === config.strapColor)?.label}</p></fieldset>
            <fieldset className="space-y-2"><legend className="text-sm font-medium text-slate-200">Forma de la placa</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">{PLATE_STYLES.map((item) => <button key={item.id} type="button" aria-pressed={config.plateStyle === item.id} onClick={() => updateConfig('plateStyle', item.id)} className={choiceClass(config.plateStyle === item.id)}>{item.label}</button>)}</div></fieldset>
            <Swatches label="Color de la placa" options={PLATE_COLORS} selected={config.plateColor} onSelect={(hex) => updateConfig('plateColor', hex)} />
            <Swatches label="Color del borde" options={PLATE_COLORS} selected={config.borderColor} onSelect={(hex) => updateConfig('borderColor', hex)} />
            <details className="rounded-xl border border-slate-700 bg-slate-950/65 p-3"><summary className="cursor-pointer text-sm font-semibold text-slate-200">Medidas de la placa</summary><div className="space-y-4 pt-4"><Measure label="Ancho" value={config.plateWidth} min={35} max={65} step={1} onChange={(value) => updateConfig('plateWidth', value)} /><Measure label="Alto" value={config.plateHeight} min={25} max={50} step={1} onChange={(value) => updateConfig('plateHeight', value)} /><Measure label="Grosor" value={config.plateThickness} min={2.5} max={6} step={0.5} onChange={(value) => updateConfig('plateThickness', value)} /><Measure label="Bisel" value={config.plateBevel} min={0.5} max={2} step={0.1} onChange={(value) => updateConfig('plateBevel', value)} />{config.mountType === 'dangling' && <Measure label="Diámetro de la anilla" value={config.ringDiameter} min={3} max={6} step={0.5} onChange={(value) => updateConfig('ringDiameter', value)} />}</div></details>
          </section>

          <section className={sectionClass} aria-labelledby="collar-image-title">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">03 · Gráfico</p><h2 id="collar-image-title" className="mt-1 font-outfit text-lg font-bold">Imagen de la placa</h2><p className="mt-1 text-sm text-slate-400">Sube tu logo o empieza con una plantilla.</p></div>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-600 bg-slate-950/70 px-4 py-5 text-center transition-colors hover:border-cyan-400 focus-within:border-cyan-400"><ImagePlus aria-hidden="true" className="h-6 w-6 text-cyan-300" /><span className="text-sm font-semibold">Seleccionar imagen</span><span className="text-xs text-slate-400">PNG, JPG o WebP · máximo 8 MB</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileUpload} className="sr-only" aria-label="Subir imagen para la placa" /></label>
            {uploadName && <p className="break-all text-xs text-cyan-200">Archivo: {uploadName}</p>}
            {uploadError && <p role="alert" className="text-sm text-rose-300">{uploadError}</p>}
            {processedData && <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800"><img src={processedData.previewDataUrl} alt="Resultado de la imagen para la placa" className="h-full w-full object-contain" /></div>
              <p className="text-xs leading-relaxed text-slate-400">Vista de la imagen procesada. Gírala, refléjala o ajusta el fondo y comprueba el resultado aquí.</p>
            </div>}
            <fieldset className="space-y-2"><legend className="text-sm font-medium text-slate-200">Plantillas</legend><div className="grid grid-cols-3 gap-2">{COLLAR_SAMPLE_IMAGES.map((sample) => <button key={sample.id} type="button" aria-label={`Usar plantilla ${sample.name}`} aria-pressed={config.sampleId === sample.id} onClick={() => handleSelectSample(sample)} className={`flex min-w-0 flex-col items-center gap-2 rounded-xl border p-2 text-center transition-colors ${config.sampleId === sample.id ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}`}><img src={sample.url} alt="" className="h-10 w-10 object-contain" /><span className="w-full truncate text-xs text-slate-200">{sample.name}</span></button>)}</div></fieldset>
            <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200"><input type="checkbox" checked={config.removeBackground} onChange={(event) => updateConfig('removeBackground', event.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-400" /><span>Eliminar fondo automáticamente<span className="mt-1 block text-xs text-slate-400">Para logos sobre fondo uniforme. Desactívalo si se pierden detalles.</span></span></label>
            <div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => updateConfig('imageRotation', (config.imageRotation + 90) % 360)} className={choiceClass(false)}>Girar 90°</button><button type="button" aria-pressed={config.flipHorizontal} onClick={() => updateConfig('flipHorizontal', !config.flipHorizontal)} className={choiceClass(config.flipHorizontal)}>Reflejar imagen</button></div>
          </section>
        </main>

        <aside className="order-1 space-y-4 lg:sticky lg:top-4 lg:order-2" aria-label="Vista previa y compra">
          <div ref={viewerRef} className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-[#121b2c] shadow-2xl shadow-black/30">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-3"><div><p className="text-sm font-bold text-white">Vista 3D</p><p className="text-xs text-slate-400">Arrastra para girar · Rueda para acercar</p></div><span role="status" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${activeError ? 'bg-rose-500/15 text-rose-300' : isProcessing ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-300'}`}>{activeError ? 'Error de imagen' : isProcessing ? 'Procesando…' : 'Vista lista'}</span></div>
            <div className="relative h-[320px] sm:h-[420px] lg:h-[min(44vh,490px)] lg:min-h-[330px]" aria-busy={isProcessing}><CollarViewer config={config} processedData={processedData} />{(activeError || isProcessing) && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/65 p-6 text-center text-sm text-slate-100" role={activeError ? 'alert' : 'status'}>{activeError || 'Preparando la vista previa…'}</div>}</div>
            <div className="space-y-3 border-t border-slate-800 bg-slate-900/80 p-4"><fieldset className="space-y-2"><legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vista del modelo</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{VIEW_MODES.map((item) => <button key={item.id} type="button" aria-pressed={config.viewMode === item.id} onClick={() => updateConfig('viewMode', item.id)} className={`${choiceClass(config.viewMode === item.id)} ${item.id === 'printbed' ? 'col-span-2 sm:col-span-1' : ''}`}>{item.label}</button>)}</div></fieldset><fieldset className="space-y-2"><legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Iluminación</legend><div className="grid grid-cols-4 gap-2">{LIGHTING_MODES.map((item) => <button key={item.id} type="button" aria-pressed={config.lightingMode === item.id} onClick={() => updateConfig('lightingMode', item.id)} className={choiceClass(config.lightingMode === item.id)}>{item.label}</button>)}</div></fieldset></div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Collar impreso y ensamblado</p><p className="mt-1 font-outfit text-2xl font-extrabold text-white">{formatPrice(collarPriceCop, collarPriceUsd)}</p></div><span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">Talla {config.size} · {config.mountType === 'slide' ? 'Pasante' : 'Colgante'}</span></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" disabled={!canOrder} onClick={() => onAddToCart(createCartItem())} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2 text-sm font-bold text-white hover:from-cyan-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"><ShoppingBag className="h-4 w-4" /> Agregar al carrito</button><button type="button" disabled={!canOrder} onClick={() => onBuyNow(createCartItem())} className="min-h-11 flex-1 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50">Comprar ahora</button></div>{isProcessing && <p className="mt-2 text-xs text-slate-400">Los botones se activan cuando termine la vista previa.</p>}</div>

          {isAuthenticated && <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4"><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Archivos de fabricación</p><div className="mt-3 flex gap-2"><button type="button" disabled={!processedData || !!exporting} onClick={() => void handleExport('3mf')} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-3 text-sm font-semibold text-cyan-200 disabled:opacity-50"><Download className="h-4 w-4" />{exporting === '3mf' ? 'Generando…' : '3MF'}</button><button type="button" disabled={!processedData || !!exporting} onClick={() => void handleExport('stl')} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm font-semibold text-slate-200 disabled:opacity-50"><Download className="h-4 w-4" />{exporting === 'stl' ? 'Generando…' : 'STL'}</button></div>{exportNotice && <p className="mt-3 text-xs text-slate-300" role="status">{exportNotice}</p>}</div>}
        </aside>
      </div>
    </div>
  );
};
