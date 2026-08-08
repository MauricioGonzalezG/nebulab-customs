import React, { useEffect, useState } from 'react';
import { ClickerConfig, CartItem, LithophaneConfig } from '../../types';
import {
  processClickerImage,
  ProcessedClickerData,
  CLICKER_SAMPLE_IMAGES,
  createDefaultClickerConfig,
} from '../../core/clickerProcessor';
import { downloadClickerSTL } from '../../core/clickerStlExporter';
import { downloadClicker3MF } from '../../core/clicker3mfExporter';
import { ClickerViewer } from '../3d/ClickerViewer';
import {
  Upload,
  Settings,
  Download,
  ShoppingBag,
  ArrowLeft,
  Palette,
  ChevronDown,
  ChevronUp,
  Key,
} from 'lucide-react';
import { getPricingDataSync } from '../../lib/priceConfig';
import { useCurrency } from '../../context/CurrencyContext';
import { VIEWER_CONTROL_HINT } from '../3d/viewerControls';


interface ClickerStudioProps {
  onBackToHome: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
}

export const ClickerStudio: React.FC<ClickerStudioProps> = ({
  onBackToHome,
  onAddToCart,
  onBuyNow,
}) => {
  const { formatPrice } = useCurrency();
  const [config, setConfig] = useState<ClickerConfig>(createDefaultClickerConfig());
  const [processedData, setProcessedData] = useState<ProcessedClickerData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string>('colors');


  // Load and process image when config.imageUrl changes
  useEffect(() => {
    if (!config.imageUrl) return;

    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = config.imageUrl;

    img.onload = () => {
      try {
        const processed = processClickerImage(img, config);
        setProcessedData(processed);
      } catch (err) {
        console.error('Error processing clicker image:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      setIsProcessing(false);
    };
  }, [config.imageUrl, config.removeBackground, config.baseColor, config.outlineColor, config.size]);

  // Price calculation based on XML configuration
  const pData = getPricingDataSync();
  const unitPriceCop = config.type === 'clicker'
    ? pData.clicker.clickerBaseCop + (config.size > 40 ? pData.clicker.sizeExtraCop : 0)
    : pData.clicker.keychainBaseCop + (config.size > 40 ? pData.clicker.sizeExtraCop : 0);
  const unitPriceUsd = config.type === 'clicker'
    ? pData.clicker.clickerBaseUsd + (config.size > 40 ? pData.clicker.sizeExtraUsd : 0)
    : pData.clicker.keychainBaseUsd + (config.size > 40 ? pData.clicker.sizeExtraUsd : 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setConfig((prev) => ({
          ...prev,
          imageUrl: event.target!.result as string,
          sampleId: undefined,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const createCartItem = (): CartItem => {
    // Generate dummy LithophaneConfig for CartItem compatibility
    const dummyLithoConfig: LithophaneConfig = {
      imageUrl: config.imageUrl,
      brightness: 0,
      contrast: 0,
      invert: false,
      shape: 'flat',
      resolutionMode: 'hd',
      width: config.size,
      height: config.size,
      minThickness: 0.8,
      maxThickness: 3.2,
      arcAngle: 60,
      frameWidth: 3,
      baseType: 'none',
      material: 'white-pla',
      puckDiameter: 60,
      puckDepth: 25,
      puckAngle: 45,
      puckArcCoverage: 240,
      strutCount: 3,
      showLampPuck: false,
      enableLight: true,
      lightWarmth: 50,
      lightIntensity: 80,
    };

    return {
      id: `ITEM-CLICKER-${Date.now()}`,
      itemType: 'clicker',
      title: config.type === 'clicker' ? `Clicker MX 3D (${config.size}mm)` : `Llavero 3D (${config.size}mm)`,
      config: dummyLithoConfig,
      clickerConfig: config,
      previewImageDataUrl: processedData?.previewDataUrl || config.imageUrl || '',
      price: unitPriceUsd,
      quantity: 1,
      createdAt: new Date().toISOString(),
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter flex flex-col">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Volver a Inicio"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <h1 className="text-base font-bold text-white font-outfit flex items-center gap-2">
                <span>Clickers & Llaveros 3D</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/30 rounded-full">
                  Nebulab Studio
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Personaliza a partir de tus fotos o ilustraciones</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle Header */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setConfig((prev) => ({ ...prev, viewMode: 'assembled' }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  config.viewMode === 'assembled' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ensamblado
              </button>
              <button
                onClick={() => setConfig((prev) => ({ ...prev, viewMode: 'exploded' }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  config.viewMode === 'exploded' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Despiezado
              </button>
            </div>

            <button
              onClick={() => downloadClicker3MF(processedData, config)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
              title="Descargar modelo .3mf multi-color completo para Bambu Studio, OrcaSlicer o PrusaSlicer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .3MF (Multi-Color)</span>
            </button>

            <button
              onClick={() => downloadClickerSTL(processedData, config)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Descargar archivo STL clásico"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">STL</span>
            </button>

            <button
              onClick={() => onAddToCart(createCartItem())}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Agregar al Carrito</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Studio Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        
        {/* LEFT CONTROL PANEL (Visual & Geometry Settings) */}
        <div className="lg:col-span-3 bg-slate-900/60 border-r border-slate-800 p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-60px)]">
          
          {/* Toggle Box: Añadir Arandela de Llavero */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">Añadir Arandela para Llavero</span>
            </div>
            <input
              type="checkbox"
              checked={config.includeRing}
              onChange={(e) => setConfig((prev) => ({ ...prev, includeRing: e.target.checked }))}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
          </div>


          {/* Base Style: Outline vs Shape */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Estilo de Base</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'outline', label: 'Silueta' },
                { id: 'circle', label: 'Círculo' },
                { id: 'square', label: 'Cuadrado' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setConfig((prev) => ({ ...prev, baseStyle: style.id as any }))}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    config.baseStyle === style.id
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size Slider */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Tamaño (Ancho)</span>
              <span className="font-mono text-cyan-400 font-bold">{config.size} mm</span>
            </div>
            <input
              type="range"
              min={25}
              max={60}
              step={1}
              value={config.size}
              onChange={(e) => setConfig((prev) => ({ ...prev, size: Number(e.target.value) }))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Image Rotation & Flip */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Rotación de Imagen</span>
              <span className="font-mono text-cyan-400 font-bold">{config.imageRotation || 0}°</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() => setConfig((prev) => ({ ...prev, imageRotation: deg }))}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    (config.imageRotation || 0) === deg
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



          {/* Show MX Switch Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs font-bold text-slate-300">Ver Switch Mecánico MX</span>
            <input
              type="checkbox"
              checked={config.showSwitch}
              onChange={(e) => setConfig((prev) => ({ ...prev, showSwitch: e.target.checked }))}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
          </div>


          {/* Collapsible Accordions: Colors, More Settings, Switch */}
          <div className="space-y-3">
            
            {/* Accordion 1: Colors & Smoothing */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'colors' ? '' : 'colors')}
                className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  <span>1 • Colores y Filamento Multi-Material</span>
                </div>
                {activeAccordion === 'colors' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {activeAccordion === 'colors' && (
                <div className="p-4 border-t border-slate-800/60 space-y-4 text-xs">
                  
                  {/* Stroke Mode Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold block">Estilo de Relieve y Capas</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setConfig((prev) => ({ ...prev, strokeMode: 'multi' }))}
                        className={`py-1.5 rounded-lg font-bold transition-all ${
                          config.strokeMode === 'multi' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400'
                        }`}
                      >
                        Multicolor (4 Capas)
                      </button>
                      <button
                        onClick={() => setConfig((prev) => ({ ...prev, strokeMode: 'single' }))}
                        className={`py-1.5 rounded-lg font-bold transition-all ${
                          config.strokeMode === 'single' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400'
                        }`}
                      >
                        Trazo Único (Silueta)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block">Color 1: Tapa Base</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.baseColor}
                        onChange={(e) => setConfig((prev) => ({ ...prev, baseColor: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <span className="font-mono text-slate-300 uppercase">{config.baseColor}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block">Color 2: Trazo / Contorno</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.outlineColor}
                        onChange={(e) => setConfig((prev) => ({ ...prev, outlineColor: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <span className="font-mono text-slate-300 uppercase">{config.outlineColor}</span>
                    </div>
                  </div>

                  {config.strokeMode === 'multi' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-slate-400 block">Color 3: Capa Acento</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.accentColor}
                            onChange={(e) => setConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                          />
                          <span className="font-mono text-slate-300 uppercase">{config.accentColor}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 block">Color 4: Detalle Superior</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.detailColor}
                            onChange={(e) => setConfig((prev) => ({ ...prev, detailColor: e.target.value }))}
                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                          />
                          <span className="font-mono text-slate-300 uppercase">{config.detailColor}</span>
                        </div>
                      </div>
                    </>
                  )}

                </div>
              )}

            </div>

            {/* Accordion 2: Keychain Ring Settings */}
            {config.includeRing && (

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === 'keychain' ? '' : 'keychain')}
                  className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400" />
                    <span>2 • Posición de Argolla de Llavero</span>
                  </div>
                  {activeAccordion === 'keychain' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeAccordion === 'keychain' && (
                  <div className="p-4 border-t border-slate-800/60 space-y-4 text-xs">
                    
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block font-semibold">Posiciones Rápidas</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: 'Arriba', angle: 90, pos: 'top' },
                          { label: 'Arr-Izq', angle: 135, pos: 'top-left' },
                          { label: 'Arr-Der', angle: 45, pos: 'top-right' },
                          { label: 'Izquierda', angle: 180, pos: 'left' },
                          { label: 'Derecha', angle: 0, pos: 'right' },
                          { label: 'Abajo', angle: 270, pos: 'bottom' },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => setConfig((prev) => ({ ...prev, ringAngle: preset.angle, ringPosition: preset.pos as any }))}
                            className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                              (config.ringAngle ?? 90) === preset.angle
                                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Ángulo 360° de la Argolla</span>
                        <span className="font-mono text-cyan-400 font-bold">{config.ringAngle ?? 90}°</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={config.ringAngle ?? 90}
                        onChange={(e) => setConfig((prev) => ({ ...prev, ringAngle: Number(e.target.value) }))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    {/* D-Pad Arrows for X and Y fine displacement */}
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-300">Maniobrabilidad (Ejes X / Y)</span>
                        <button
                          onClick={() => setConfig((prev) => ({ ...prev, ringOffsetX: 0, ringOffsetY: 0 }))}
                          className="text-[10px] text-cyan-400 hover:underline font-mono"
                        >
                          Reset X/Y
                        </button>
                      </div>

                      <div className="flex flex-col items-center gap-1 py-1">
                        <button
                          onClick={() => setConfig((prev) => ({ ...prev, ringOffsetY: (prev.ringOffsetY || 0) - 1 }))}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                          title="Mover Arriba (Y+)"
                        >
                          ▲
                        </button>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setConfig((prev) => ({ ...prev, ringOffsetX: (prev.ringOffsetX || 0) - 1 }))}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                            title="Mover Izquierda (X-)"
                          >
                            ◀
                          </button>
                          <span className="font-mono text-[11px] text-slate-400">
                            X: {config.ringOffsetX || 0} | Y: {config.ringOffsetY || 0}
                          </span>
                          <button
                            onClick={() => setConfig((prev) => ({ ...prev, ringOffsetX: (prev.ringOffsetX || 0) + 1 }))}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                            title="Mover Derecha (X+)"
                          >
                            ▶
                          </button>
                        </div>
                        <button
                          onClick={() => setConfig((prev) => ({ ...prev, ringOffsetY: (prev.ringOffsetY || 0) + 1 }))}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                          title="Mover Abajo (Y-)"
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    {/* Height Slider Z */}
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Altura de Argolla (Eje Vertical Z)</span>
                        <span className="font-mono text-cyan-400 font-bold">{config.ringHeight || 0} mm</span>
                      </div>
                      <input
                        type="range"
                        min={-10}
                        max={15}
                        step={0.5}
                        value={config.ringHeight || 0}
                        onChange={(e) => setConfig((prev) => ({ ...prev, ringHeight: Number(e.target.value) }))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>


                  </div>
                )}
              </div>
            )}

            {/* Accordion 3: Switch Settings */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'switch' ? '' : 'switch')}
                className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-violet-400" />
                  <span>3 • Tipo de Switch Mecánico</span>
                </div>
                {activeAccordion === 'switch' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {activeAccordion === 'switch' && (
                <div className="p-4 border-t border-slate-800/60 space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-400 block">Tipo de Pulsador MX</label>
                    <select
                      value={config.switchType}
                      onChange={(e) => setConfig((prev) => ({ ...prev, switchType: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="red">Cherry MX Red (Lineal / Silencioso)</option>
                      <option value="blue">Cherry MX Blue (Clicky / Táctil)</option>
                      <option value="brown">Cherry MX Brown (Táctil Suave)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>



          </div>

        </div>

        {/* MIDDLE 3D VIEWPORT */}
        <div className="lg:col-span-6 bg-slate-950 relative flex flex-col items-center justify-center p-4">
          
          {/* Top Controls Overlay inside Viewport */}
          <div className="absolute top-6 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
            <button
              onClick={() => setConfig((prev) => ({ ...prev, renderStyle: 'color' }))}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                config.renderStyle === 'color' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Multi-Color
            </button>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, renderStyle: 'extrude' }))}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                config.renderStyle === 'extrude' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Extrusión 3D
            </button>
          </div>

          {/* 3D Canvas */}
          <div className="w-full h-full min-h-[420px] rounded-3xl overflow-hidden border border-slate-900 relative">
            {isProcessing && (
              <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-cyan-400 gap-3">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Vectorizando imagen a 3D...</span>
              </div>
            )}
            <ClickerViewer config={config} processedData={processedData} />
          </div>

          {/* Bottom Controls Hint Overlay */}
          <div className="absolute bottom-6 text-[11px] text-slate-500 bg-slate-900/70 px-4 py-1.5 rounded-full border border-slate-800 pointer-events-none">
            {VIEWER_CONTROL_HINT}
          </div>

        </div>

        {/* RIGHT SIDEBAR (Image Source & Presets) */}
        <div className="lg:col-span-3 bg-slate-900/60 border-l border-slate-800 p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-60px)]">
          
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Origen de Imagen</h3>
            <p className="text-[11px] text-slate-400">Sube tu propio archivo o selecciona una plantilla</p>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="relative border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-3xl p-6 text-center transition-all bg-slate-950/40 group">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="space-y-2 pointer-events-none">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-200">Subir Imagen Personalizada</p>
              <p className="text-[10px] text-slate-500">PNG con fondo transparente funciona ideal</p>
            </div>
          </div>

          {/* Background Removal Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs font-bold text-slate-300">Remover Fondo Automáticamente</span>
            <input
              type="checkbox"
              checked={config.removeBackground}
              onChange={(e) => setConfig((prev) => ({ ...prev, removeBackground: e.target.checked }))}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          {/* Sample Images Gallery */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Galería de Muestra</label>

            <div className="grid grid-cols-3 gap-2">
              {CLICKER_SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => setConfig((prev) => ({ ...prev, imageUrl: sample.url, sampleId: sample.id }))}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                    config.sampleId === sample.id
                      ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-500 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img src={sample.url} alt={sample.name} className="w-8 h-8 object-contain" />
                  <span className="text-[10px] font-semibold text-slate-300 truncate w-full text-center">{sample.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Summary & Direct Checkout Card */}
          <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">Precio Unitario 3D</span>
                <span className="text-xl sm:text-2xl font-extrabold text-white font-outfit">{formatPrice(unitPriceCop, unitPriceUsd)}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase">
                Impreso & Ensamblado
              </span>
            </div>

            <button
              onClick={() => onBuyNow(createCartItem())}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
            >
              Comprar Ahora por WhatsApp
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
