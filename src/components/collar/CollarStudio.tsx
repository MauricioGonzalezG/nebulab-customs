import React, { useEffect, useState } from 'react';
import { CollarConfig, CartItem } from '../../types';
import {
  processCollarImage,
  ProcessedCollarData,
  COLLAR_SAMPLE_IMAGES,
  createDefaultCollarConfig,
} from '../../core/collarProcessor';
import { CollarViewer } from '../3d/CollarViewer';
import {
  Upload,
  ShoppingBag,
  ArrowLeft,
  Sparkles,
  Tag,
  Phone,
  User,
} from 'lucide-react';
import { getPricingDataSync } from '../../lib/priceConfig';
import { useCurrency } from '../../context/CurrencyContext';

interface CollarStudioProps {
  onBackToHome: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
}

export const CollarStudio: React.FC<CollarStudioProps> = ({
  onBackToHome,
  onAddToCart,
  onBuyNow,
}) => {
  const { formatPrice } = useCurrency();
  const pData = getPricingDataSync();
  const collarPriceCop = pData.collar.basePriceCop;
  const collarPriceUsd = pData.collar.basePriceUsd;

  const [config, setConfig] = useState<CollarConfig>(createDefaultCollarConfig);
  const [processedData, setProcessedData] = useState<ProcessedCollarData | null>(null);
  const [currentImgElement, setCurrentImgElement] = useState<HTMLImageElement | null>(null);


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
    config.plateStyle,
    config.plateColor,
    config.strapColor,
    config.petName,
    config.phoneText,
    config.textColor,
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setConfig((prev) => ({ ...prev, imageUrl: result, sampleId: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: typeof COLLAR_SAMPLE_IMAGES[0]) => {
    setConfig((prev) => ({
      ...prev,
      imageUrl: sample.url,
      sampleId: sample.id,
    }));
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
      
      {/* Top Header Bar */}
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
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Placas Grabadas 3D
              </span>
            </h1>
            <p className="text-xs text-slate-400">Diseño y personalización tridimensional de placas y collares</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="hidden sm:flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setConfig((prev) => ({ ...prev, viewMode: 'assembled' }))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                config.viewMode === 'assembled' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400'
              }`}
            >
              Ensamblado
            </button>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, viewMode: 'exploded' }))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                config.viewMode === 'exploded' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400'
              }`}
            >
              Despiezado
            </button>
          </div>

          <button
            onClick={() => onAddToCart(createCartItem())}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Agregar ($14.90)</span>
          </button>
        </div>
      </header>

      {/* Main Studio Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        
        {/* LEFT CONTROL PANEL (Plate & Collar Settings) */}
        <div className="lg:col-span-3 bg-slate-900/60 border-r border-slate-800 p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-60px)]">
          
          {/* Pet Name & Phone Input Box */}
          <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-cyan-400" />
              <span>Datos Grabados en la Placa</span>
            </label>

            <div className="space-y-2 text-xs">
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-cyan-500"
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
                  {[
                    { hex: '#FFFFFF', label: 'Blanco' },
                    { hex: '#000000', label: 'Negro' },
                    { hex: '#D4AF37', label: 'Dorado' },
                    { hex: '#EF4444', label: 'Rojo' },
                    { hex: '#38BDF8', label: 'Cyan' },
                    { hex: '#A3E635', label: 'Verde Lima' },
                  ].map((tc) => (
                    <button
                      key={tc.hex}
                      onClick={() => setConfig((prev) => ({ ...prev, textColor: tc.hex }))}
                      title={tc.label}
                      style={{ backgroundColor: tc.hex }}
                      className={`h-7 rounded-lg border-2 transition-all ${
                        config.textColor === tc.hex ? 'border-cyan-400 scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Collar Strap Color Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Color de Correa de Tela</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'olive', label: 'Verde Militar', bg: 'bg-[#4d5d36]' },
                { id: 'crimson', label: 'Rojo Carmesí', bg: 'bg-[#991b1b]' },
                { id: 'black', label: 'Negro Azabache', bg: 'bg-[#1e293b]' },
                { id: 'navy', label: 'Azul Marino', bg: 'bg-[#1e3a8a]' },
                { id: 'pink', label: 'Rosa Hot', bg: 'bg-[#be185d]' },
              ].map((strap) => (
                <button
                  key={strap.id}
                  onClick={() => setConfig((prev) => ({ ...prev, strapColor: strap.id as any }))}
                  title={strap.label}
                  className={`h-9 rounded-xl border-2 transition-all flex items-center justify-center ${strap.bg} ${
                    config.strapColor === strap.id ? 'border-cyan-400 scale-110 shadow-lg shadow-cyan-500/20' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Plate Shape Style */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Forma de la Placa 3D</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'rounded', label: 'Curva Redondeada' },
                { id: 'rectangle', label: 'Rectangular' },
                { id: 'bone', label: 'Forma Hueso' },
                { id: 'shield', label: 'Escudo' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setConfig((prev) => ({ ...prev, plateStyle: style.id as any }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    config.plateStyle === style.id
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plate Color Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Color de la Placa 3D</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { hex: '#D4AF37', label: 'Dorado / Bronce' },
                { hex: '#1E293B', label: 'Negro Azabache' },
                { hex: '#F8FAFC', label: 'Blanco Eco-PLA' },
                { hex: '#EF4444', label: 'Rojo Carmesí' },
                { hex: '#94A3B8', label: 'Plata Metal' },
              ].map((pColor) => (
                <button
                  key={pColor.hex}
                  onClick={() => setConfig((prev) => ({ ...prev, plateColor: pColor.hex }))}
                  title={pColor.label}
                  style={{ backgroundColor: pColor.hex }}
                  className={`h-9 rounded-xl border-2 transition-all ${
                    config.plateColor === pColor.hex ? 'border-cyan-400 scale-110 shadow-lg shadow-cyan-500/20' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Pet Size Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Talla del Collar</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'S', label: 'S (Pequeño)' },
                { id: 'M', label: 'M (Mediano)' },
                { id: 'L', label: 'L (Grande)' },
                { id: 'XL', label: 'XL (Extra)' },
              ].map((sz) => (
                <button
                  key={sz.id}
                  onClick={() => setConfig((prev) => ({ ...prev, size: sz.id as any }))}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    config.size === sz.id
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sz.id}
                </button>
              ))}
            </div>
          </div>

          {/* Image Rotation & Flip */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Rotación de Imagen</span>
              <span className="font-mono text-cyan-400 font-bold">{config.imageRotation ?? 0}°</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() => setConfig((prev) => ({ ...prev, imageRotation: deg }))}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    (config.imageRotation ?? 0) === deg
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Reflejar Horizontal (Espejo)</span>
              <input
                type="checkbox"
                checked={config.flipHorizontal}
                onChange={(e) => setConfig((prev) => ({ ...prev, flipHorizontal: e.target.checked }))}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>

        </div>

        {/* CENTER VIEWPORT (3D Interactive Model Canvas) */}
        <div className="lg:col-span-6 bg-slate-950 flex flex-col items-center justify-center relative min-h-[450px]">
          
          {/* Floating Controls Overlay */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-xs font-bold text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Visor 3D Interactivo de Collar</span>
            </div>
          </div>

          <div className="w-full h-full min-h-[420px] flex items-center justify-center">
            <CollarViewer config={config} processedData={processedData} />
          </div>

          <div className="absolute bottom-4 text-center text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-800/80">
            Arrastra para rotar 360° • Rueda para zoom • Clic derecho para desplazar
          </div>
        </div>

        {/* RIGHT PANEL (Image Origin & Preset Gallery) */}
        <div className="lg:col-span-3 bg-slate-900/60 border-l border-slate-800 p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-60px)]">
          
          {/* File Upload Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Origen de Imagen</label>
            <p className="text-[11px] text-slate-400">Sube tu propio logo o selecciona una plantilla</p>

            <label className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center">
              <Upload className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform mb-2" />
              <span className="text-xs font-bold text-slate-200">Subir Imagen Personalizada</span>
              <span className="text-[10px] text-slate-400 mt-1">PNG con fondo transparente funciona ideal</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-300 font-semibold">Remover Fondo Automáticamente</span>
              <input
                type="checkbox"
                checked={config.removeBackground}
                onChange={(e) => setConfig((prev) => ({ ...prev, removeBackground: e.target.checked }))}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Sample Gallery */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Galería de Muestra</label>
            <div className="grid grid-cols-2 gap-2">
              {COLLAR_SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    config.sampleId === sample.id
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <img src={sample.url} alt={sample.name} className="w-10 h-10 object-contain" />
                  <span className="text-[11px] font-bold truncate w-full">{sample.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Checkout & Pricing Action Box */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase block">Precio Unitario 3D</span>
                <span className="text-xl sm:text-2xl font-extrabold text-white font-outfit">{formatPrice(collarPriceCop, collarPriceUsd)}</span>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Impreso & Ensamblado
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => onAddToCart(createCartItem())}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Agregar al Carrito</span>
              </button>

              <button
                onClick={() => onBuyNow(createCartItem())}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Comprar Ahora por WhatsApp</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
