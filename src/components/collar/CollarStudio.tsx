import React, { useEffect, useState, useRef } from 'react';
import { CollarConfig, CartItem, CollarPlateStyle, CollarStrapColor } from '../../types';
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
import {
  Upload,
  ShoppingBag,
  ArrowLeft,
  Tag,
  Phone,
  User,
  Download,
  Check,
} from 'lucide-react';
import { getPricingDataSync } from '../../lib/priceConfig';
import { useCurrency } from '../../context/CurrencyContext';

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
  { hex: '#38BDF8', label: 'Cyan' },
  { hex: '#A3E635', label: 'Verde Lima' },
];

const STRAP_COLORS_LIST: Array<{ id: CollarStrapColor; label: string; bg: string }> = [
  { id: 'olive', label: 'Verde Militar', bg: '#4d5d36' },
  { id: 'crimson', label: 'Rojo Carmesí', bg: '#991b1b' },
  { id: 'black', label: 'Negro Obsidiana', bg: '#1e293b' },
  { id: 'navy', label: 'Azul Marino', bg: '#1e3a8a' },
  { id: 'pink', label: 'Rosa Pastel', bg: '#be185d' },
  { id: 'brown', label: 'Cuero Café', bg: '#78350f' },
  { id: 'yellow', label: 'Amarillo', bg: '#eab308' },
];

const PLATE_STYLES_LIST: Array<{ id: CollarPlateStyle; label: string }> = [
  { id: 'rounded', label: 'Curva Redondeada' },
  { id: 'rectangle', label: 'Rectangular' },
  { id: 'bone', label: 'Forma Hueso' },
  { id: 'shield', label: 'Escudo' },
  { id: 'heart', label: 'Corazón' },
  { id: 'circle', label: 'Medalla' },
  { id: 'silhouette', label: 'Silueta' },
];

const PLATE_COLORS_LIST = [
  { hex: '#D4AF37', label: 'Dorado' },
  { hex: '#1E293B', label: 'Negro Carbón' },
  { hex: '#FFFFFF', label: 'Blanco Nieve' },
  { hex: '#991B1B', label: 'Rojo Carmesí' },
  { hex: '#1E3A8A', label: 'Azul Real' },
  { hex: '#94A3B8', label: 'Gris Plata' },
];

export const CollarStudio: React.FC<CollarStudioProps> = ({
  onBackToHome,
  onAddToCart,
  onBuyNow,
}) => {
  const { formatPrice } = useCurrency();
  const { isAuthenticated } = useAuth();
  const pData = getPricingDataSync();
  const collarPriceCop = pData.collar.basePriceCop;
  const collarPriceUsd = pData.collar.basePriceUsd;

  const [config, setConfig] = useState<CollarConfig>(createDefaultCollarConfig);
  const [processedData, setProcessedData] = useState<ProcessedCollarData | null>(null);
  const [currentImgElement, setCurrentImgElement] = useState<HTMLImageElement | null>(null);

  const viewerRef = useRef<HTMLDivElement>(null);

  const scrollToViewerOnMobile = () => {
    if (window.innerWidth < 1024 && viewerRef.current) {
      setTimeout(() => {
        viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  };

  // Load initial sample image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setCurrentImgElement(img);
    };
    img.src = config.imageUrl || COLLAR_SAMPLE_IMAGES[0].url;
  }, [config.imageUrl]);

  // Re-process image when config adjustments change
  useEffect(() => {
    if (!currentImgElement) return;

    try {
      const processed = processCollarImage(currentImgElement, config);
      setProcessedData(processed);
    } catch (err) {
      console.error('Error processing collar image:', err);
    }
  }, [
    currentImgElement,
    config.removeBackground,
    config.imageRotation,
    config.flipHorizontal,
    config.plateStyle,
    config.plateColor,
    config.borderColor,
    config.textColor,
    config.strapColor,
    config.petName,
    config.phoneText,
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setConfig((prev) => ({ ...prev, imageUrl: result, sampleId: undefined }));
      scrollToViewerOnMobile();
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: typeof COLLAR_SAMPLE_IMAGES[0]) => {
    setConfig((prev) => ({
      ...prev,
      imageUrl: sample.url,
      sampleId: sample.id,
    }));
    scrollToViewerOnMobile();
  };

  const createCartItem = (): CartItem => {
    return {
      id: `COLLAR-${Date.now()}`,
      itemType: 'collar',
      title: `Collar para Mascota 3D - ${config.petName || 'Personalizado'} (Talla ${config.size})`,
      config: {} as any,
      collarConfig: { ...config },
      previewImageDataUrl: processedData?.previewDataUrl || config.imageUrl || '',
      price: collarPriceUsd,
      quantity: 1,
      createdAt: new Date().toISOString(),
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-inter selection:bg-cyan-500 selection:text-slate-950">
      
      {/* TOP HEADER BAR */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Volver al Inicio"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold font-outfit text-white flex items-center gap-2">
              <span>Collares para Mascotas 3D</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Nebulab Studio
              </span>
            </h1>
            <p className="text-xs text-slate-400">Placas grabadas y collares personalizados en 3D</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Mode Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setConfig((prev) => ({ ...prev, viewMode: 'assembled' }))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                config.viewMode === 'assembled' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ensamblado
            </button>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, viewMode: 'plate' }))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                config.viewMode === 'plate' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Despiezado
            </button>
          </div>

          {isAuthenticated && (
            <>
              <button
                onClick={() => downloadCollar3MF(processedData, config)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md transition-all"
                title="Descargar archivo multi-color para Bambu Studio / OrcaSlicer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.3MF</span>
              </button>

              <button
                onClick={() => downloadCollarSTL(processedData, config)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                title="Descargar archivo STL"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>STL</span>
              </button>
            </>
          )}

          <button
            onClick={() => onAddToCart(createCartItem())}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Agregar ({formatPrice(collarPriceCop, collarPriceUsd)})</span>
          </button>
        </div>
      </header>

      {/* MAIN STUDIO GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        
        {/* LEFT CONTROL PANEL (Clean Direct Controls) */}
        <div className="lg:col-span-3 bg-slate-900/60 border-r border-slate-800 p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-60px)]">
          
          {/* Pet Name & Phone Input Box */}
          <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-cyan-400" />
              <span>Datos Grabados en la Placa</span>
            </label>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Nombre de la Mascota</span>
                </label>
                <input
                  type="text"
                  value={config.petName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, petName: e.target.value }))}
                  placeholder="Ej. Kolla, Rocky, Thor"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-cyan-500 uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Teléfono de Contacto</span>
                </label>
                <input
                  type="text"
                  value={config.phoneText}
                  onChange={(e) => setConfig((prev) => ({ ...prev, phoneText: e.target.value }))}
                  placeholder="Ej. 315 678 9012"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Text Color Selector */}
              <div>
                <label className="text-slate-400 block mb-1.5 font-semibold text-xs">Color de Letra</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {TEXT_COLORS.map((tc) => (
                    <button
                      key={tc.hex}
                      onClick={() => setConfig((prev) => ({ ...prev, textColor: tc.hex }))}
                      title={tc.label}
                      style={{ backgroundColor: tc.hex }}
                      className={`h-7 rounded-lg border-2 transition-all flex items-center justify-center ${
                        config.textColor === tc.hex ? 'border-cyan-400 scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    >
                      {config.textColor === tc.hex && (
                        <Check className={`w-3.5 h-3.5 ${tc.hex === '#FFFFFF' || tc.hex === '#D4AF37' ? 'text-slate-950' : 'text-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Collar Strap Color Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Color de Correa de Tela</label>
            <div className="grid grid-cols-5 gap-2">
              {STRAP_COLORS_LIST.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => setConfig((prev) => ({ ...prev, strapColor: sc.id }))}
                  title={sc.label}
                  style={{ backgroundColor: sc.bg }}
                  className={`h-8 rounded-xl border-2 transition-all flex items-center justify-center ${
                    config.strapColor === sc.id
                      ? 'border-cyan-400 scale-105 shadow-md shadow-cyan-500/30 ring-2 ring-cyan-500/20'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  {config.strapColor === sc.id && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Plate Shape Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Forma de la Placa 3D</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {PLATE_STYLES_LIST.map((ps) => (
                <button
                  key={ps.id}
                  onClick={() => setConfig((prev) => ({ ...prev, plateStyle: ps.id }))}
                  className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                    config.plateStyle === ps.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {ps.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plate Color Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Color de la Placa 3D</label>
            <div className="grid grid-cols-6 gap-2">
              {PLATE_COLORS_LIST.map((pc) => (
                <button
                  key={pc.hex}
                  onClick={() => setConfig((prev) => ({ ...prev, plateColor: pc.hex }))}
                  title={pc.label}
                  style={{ backgroundColor: pc.hex }}
                  className={`h-8 rounded-xl border-2 transition-all flex items-center justify-center ${
                    config.plateColor === pc.hex
                      ? 'border-cyan-400 scale-105 shadow-md shadow-cyan-500/30'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  {config.plateColor === pc.hex && (
                    <Check className={`w-3.5 h-3.5 ${pc.hex === '#FFFFFF' || pc.hex === '#94A3B8' ? 'text-slate-950' : 'text-white'}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Collar Size Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Talla del Collar</label>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {(['S', 'M', 'L', 'XL'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setConfig((prev) => ({ ...prev, size: sz }))}
                  className={`py-2 rounded-xl font-bold border transition-all ${
                    config.size === sz
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* MIDDLE 3D VIEWPORT */}
        <div ref={viewerRef} className="lg:col-span-6 bg-slate-950 relative flex flex-col items-center justify-center p-4">
          
          <div className="absolute top-5 left-5 z-10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Visor 3D Interactivo de Collar</span>
          </div>

          {/* 3D Canvas */}
          <div className="w-full h-full min-h-[440px] rounded-3xl overflow-hidden border border-slate-900 relative">
            <CollarViewer config={config} processedData={processedData} />
          </div>

          <div className="absolute bottom-5 text-xs text-slate-400 bg-slate-900/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-800 pointer-events-none">
            Girar: Clic izquierdo | Zoom: Rueda | Mover: Clic derecho
          </div>
        </div>

        {/* RIGHT SIDEBAR (Image Origin, Sample Gallery & Price) */}
        <div className="lg:col-span-3 bg-slate-900/60 border-l border-slate-800 p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-60px)]">
          
          {/* Image Upload Box */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Origen de Imagen</label>
            <p className="text-xs text-slate-400">Sube tu propio logo o selecciona una plantilla</p>

            <div className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-4 text-center transition-colors bg-slate-950/40">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="space-y-2 pointer-events-none">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-200">Subir Imagen Personalizada</p>
                <p className="text-[11px] text-slate-400">PNG con fondo transparente funciona ideal</p>
              </div>
            </div>

            {/* Remove Background Option */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs font-bold text-slate-300">Remover Fondo Automáticamente</span>
              <input
                type="checkbox"
                checked={config.removeBackground}
                onChange={(e) => setConfig((prev) => ({ ...prev, removeBackground: e.target.checked }))}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Sample Templates Gallery */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Galería de Muestra</label>
            <div className="grid grid-cols-2 gap-2">
              {COLLAR_SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    config.sampleId === sample.id
                      ? 'bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img src={sample.url} alt={sample.name} className="w-8 h-8 object-contain" />
                  <span className="text-[11px] font-semibold text-slate-300 truncate w-full text-center">{sample.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price & Buy Section */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Precio Unitario 3D</span>
                <span className="text-2xl font-extrabold text-white font-outfit">{formatPrice(collarPriceCop, collarPriceUsd)}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase">
                Impreso & Ensamblado
              </span>
            </div>

            <button
              onClick={() => onAddToCart(createCartItem())}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Agregar al Carrito</span>
            </button>

            <button
              onClick={() => onBuyNow(createCartItem())}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              Comprar Ahora por WhatsApp
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
