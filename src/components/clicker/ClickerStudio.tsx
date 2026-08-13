import React, { useEffect, useState, useRef } from 'react';
import {
  ClickerConfig,
  CartItem,
  LithophaneConfig,
  ClickerBaseStyle,
  ClickerReliefStyle,
  ClickerLightingMode,
  ClickerSwitchType,
} from '../../types';
import {
  processClickerImage,
  ProcessedClickerData,
  CLICKER_SAMPLE_IMAGES,
  createDefaultClickerConfig,
} from '../../core/clickerProcessor';
import { downloadClickerSTL } from '../../core/clickerStlExporter';
import { downloadClicker3MF } from '../../core/clicker3mfExporter';
import { useAuth } from '../../context/AuthContext';
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
  Volume2,
  VolumeX,
  Sparkles,
  Printer,
  Sliders,
} from 'lucide-react';
import { getPricingDataSync } from '../../lib/priceConfig';
import { useCurrency } from '../../context/CurrencyContext';
import { playSwitchSound } from '../../lib/clickerAudio';

interface ClickerStudioProps {
  onBackToHome: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
}

const COLOR_PRESETS = [
  {
    name: 'Bambu Classic',
    base: '#eab308',
    outline: '#0f172a',
    accent: '#ffffff',
    detail: '#ef4444',
  },
  {
    name: 'Cyberpunk Neon',
    base: '#06b6d4',
    outline: '#1e1b4b',
    accent: '#d946ef',
    detail: '#f43f5e',
  },
  {
    name: 'Stealth Black',
    base: '#334155',
    outline: '#090d16',
    accent: '#64748b',
    detail: '#38bdf8',
  },
  {
    name: 'Pastel Cute',
    base: '#fbcfe8',
    outline: '#4a044e',
    accent: '#bae6fd',
    detail: '#f472b6',
  },
  {
    name: 'Oro & Obsidiana',
    base: '#ca8a04',
    outline: '#171717',
    accent: '#fef08a',
    detail: '#eab308',
  },
];

const BASE_STYLES: Array<{ id: ClickerBaseStyle; label: string; icon: string }> = [
  { id: 'outline', label: 'Silueta', icon: '✦' },
  { id: 'circle', label: 'Círculo', icon: '●' },
  { id: 'rounded-square', label: 'Redondeado', icon: '▢' },
  { id: 'square', label: 'Cuadrado', icon: '■' },
  { id: 'hexagon', label: 'Hexágono', icon: '⬡' },
  { id: 'pill', label: 'Cápsula', icon: '⬭' },
  { id: 'heart', label: 'Corazón', icon: '♥' },
  { id: 'shield', label: 'Escudo', icon: '🛡' },
];

export const ClickerStudio: React.FC<ClickerStudioProps> = ({
  onBackToHome,
  onAddToCart,
  onBuyNow,
}) => {
  const { formatPrice } = useCurrency();
  const { isAuthenticated } = useAuth();
  const [config, setConfig] = useState<ClickerConfig>(createDefaultClickerConfig());
  const [processedData, setProcessedData] = useState<ProcessedClickerData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string>('geometry');

  const viewerRef = useRef<HTMLDivElement>(null);

  const scrollToViewerOnMobile = () => {
    if (window.innerWidth < 1024 && viewerRef.current) {
      setTimeout(() => {
        viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  };

  // Load and process image when image parameters change
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
  }, [
    config.imageUrl,
    config.removeBackground,
    config.baseColor,
    config.outlineColor,
    config.accentColor,
    config.detailColor,
    config.strokeMode,
    config.size,
    config.imageRotation,
    config.flipHorizontal,
  ]);

  // Pricing calculation
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
        scrollToViewerOnMobile();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyDominantColors = () => {
    if (!processedData?.dominantColors || processedData.dominantColors.length < 2) return;
    const dom = processedData.dominantColors;
    setConfig((prev) => ({
      ...prev,
      baseColor: dom[0] || prev.baseColor,
      outlineColor: dom[1] || prev.outlineColor,
      accentColor: dom[2] || prev.accentColor,
      detailColor: dom[3] || prev.detailColor,
    }));
  };

  const handleTestClick = () => {
    if (config.soundEnabled) {
      playSwitchSound(config.switchType);
    }
  };

  const createCartItem = (): CartItem => {
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
      title: config.type === 'clicker' ? `Clicker Teclado MX 3D (${config.size}mm)` : `Llavero 3D (${config.size}mm)`,
      config: dummyLithoConfig,
      clickerConfig: config,
      previewImageDataUrl: processedData?.previewDataUrl || config.imageUrl || '',
      price: unitPriceUsd,
      quantity: 1,
      createdAt: new Date().toISOString(),
    };
  };

  // Estimated 3D Print Specs
  const estWeightGrams = Math.round(((config.size * config.size * (config.topHeight + config.baseHeight)) / 1000) * 0.45);
  const estPrintMins = Math.round(18 + config.size * 0.45 + (config.topHeight + config.baseHeight) * 0.6);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter flex flex-col">
      
      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
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
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
                  Nebulab Studio Pro
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Personaliza llaveros y pulsadores mecánicos Cherry MX</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setConfig((prev) => ({ ...prev, viewMode: 'assembled' }))}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  config.viewMode === 'assembled' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ensamblado
              </button>
              <button
                onClick={() => setConfig((prev) => ({ ...prev, viewMode: 'exploded' }))}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  config.viewMode === 'exploded' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Despiezado
              </button>
              <button
                onClick={() => setConfig((prev) => ({ ...prev, viewMode: 'printbed' }))}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  config.viewMode === 'printbed' ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md' : 'text-amber-400/80 hover:text-amber-300'
                }`}
                title="Ver orientación óptima en Cama de Impresión PEI"
              >
                <Printer className="w-3 h-3" />
                <span>Cama PEI 3D</span>
              </button>
            </div>

            {isAuthenticated && (
              <>
                <button
                  onClick={() => downloadClicker3MF(processedData, config)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
                  title="Descargar archivo multi-color para Bambu Studio, OrcaSlicer o PrusaSlicer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Descargar .3MF (Multi-Color)</span>
                  <span className="sm:hidden">.3MF</span>
                </button>

                <button
                  onClick={() => downloadClickerSTL(processedData, config)}
                  className="px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                  title="Descargar archivo STL sólido listo para imprimir"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>STL</span>
                </button>
              </>
            )}

            <button
              onClick={() => onAddToCart(createCartItem())}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Agregar al Carrito</span>
            </button>
          </div>

        </div>
      </header>

      {/* MAIN STUDIO WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        
        {/* LEFT CONTROL PANEL (Geometría, Acabados & Parámetros 3D) */}
        <div className="lg:col-span-3 bg-slate-900/60 border-r border-slate-800 p-4 sm:p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-60px)]">
          
          {/* Base Style Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block flex items-center justify-between">
              <span>Forma de la Base</span>
              <span className="text-[10px] text-cyan-400 font-mono font-semibold">8 Geometrías</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {BASE_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setConfig((prev) => ({ ...prev, baseStyle: style.id }))}
                  className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all border ${
                    config.baseStyle === style.id
                      ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-md ring-1 ring-cyan-500/50'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  title={style.label}
                >
                  <span className="text-sm">{style.icon}</span>
                  <span className="text-[10px] truncate w-full text-center">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Size (Width) Slider */}
          <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Tamaño Exterior</span>
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
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Compacto (25mm)</span>
              <span>Estándar (35mm)</span>
              <span>Grande (60mm)</span>
            </div>
          </div>

          {/* Accordion 1: Geometría y Acabado 3D */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 'geometry' ? '' : 'geometry')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>1 • Geometría y Acabado de Relieve</span>
              </div>
              {activeAccordion === 'geometry' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {activeAccordion === 'geometry' && (
              <div className="p-4 border-t border-slate-800/60 space-y-4 text-xs">
                
                {/* Estilo de Relieve */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Estilo de Relieve Superior</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {[
                      { id: 'inlaid', label: 'Rasante (Plano)' },
                      { id: 'embossed', label: 'En Relieve' },
                      { id: 'debossed', label: 'Grabado' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setConfig((prev) => ({ ...prev, reliefStyle: mode.id as ClickerReliefStyle }))}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          config.reliefStyle === mode.id
                            ? 'bg-cyan-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Altura de Tapa Keycap */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">Altura del Keycap</span>
                    <span className="font-mono text-cyan-400 font-bold">{config.topHeight} mm</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={14}
                    step={0.5}
                    value={config.topHeight}
                    onChange={(e) => setConfig((prev) => ({ ...prev, topHeight: Number(e.target.value) }))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Altura de Base Housing */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">Altura de Base (Housing)</span>
                    <span className="font-mono text-cyan-400 font-bold">{config.baseHeight} mm</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={20}
                    step={0.5}
                    value={config.baseHeight}
                    onChange={(e) => setConfig((prev) => ({ ...prev, baseHeight: Number(e.target.value) }))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Bisel de Base */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">Bisel y Suavizado de Bordes</span>
                    <span className="font-mono text-cyan-400 font-bold">{config.baseBevel} mm</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.2}
                    value={config.baseBevel}
                    onChange={(e) => setConfig((prev) => ({ ...prev, baseBevel: Number(e.target.value) }))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Tolerancia de Encaje del Switch */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">Tolerancia Cruz MX (3D Printer)</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {config.switchTolerance > 0 ? `+${config.switchTolerance}` : config.switchTolerance} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-0.2}
                    max={0.3}
                    step={0.05}
                    value={config.switchTolerance}
                    onChange={(e) => setConfig((prev) => ({ ...prev, switchTolerance: Number(e.target.value) }))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Ajustado (-0.2mm)</span>
                    <span className="text-emerald-400 font-semibold">Estándar (0.0mm)</span>
                    <span>Holgado (+0.3mm)</span>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Accordion 2: Colores & Filamento AMS Multi-Material */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 'colors' ? '' : 'colors')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-violet-400" />
                <span>2 • Colores y Filamento Multi-Material</span>
              </div>
              {activeAccordion === 'colors' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {activeAccordion === 'colors' && (
              <div className="p-4 border-t border-slate-800/60 space-y-4 text-xs">
                
                {/* Auto Dominant Color Extractor Button */}
                {processedData?.dominantColors && processedData.dominantColors.length > 0 && (
                  <button
                    onClick={handleApplyDominantColors}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600/30 to-cyan-600/30 border border-violet-500/40 hover:border-violet-400 text-violet-300 font-bold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>✨ Auto-Detectar Paleta de la Imagen</span>
                  </button>
                )}

                {/* Quick Palette Presets */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-semibold">Paletas Rápidas</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => setConfig((prev) => ({
                          ...prev,
                          baseColor: p.base,
                          outlineColor: p.outline,
                          accentColor: p.accent,
                          detailColor: p.detail,
                        }))}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center gap-2 text-[11px] font-semibold text-slate-300"
                      >
                        <div className="flex -space-x-1">
                          <span className="w-3 h-3 rounded-full border border-slate-900" style={{ backgroundColor: p.base }} />
                          <span className="w-3 h-3 rounded-full border border-slate-900" style={{ backgroundColor: p.outline }} />
                          <span className="w-3 h-3 rounded-full border border-slate-900" style={{ backgroundColor: p.accent }} />
                          <span className="w-3 h-3 rounded-full border border-slate-900" style={{ backgroundColor: p.detail }} />
                        </div>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stroke Mode Toggle */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Modo de Capas</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
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
                      Trazo Único
                    </button>
                  </div>
                </div>

                {/* 4 Color Pickers */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <label className="text-[11px] text-slate-400 block font-semibold">1. Tapa Base</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.baseColor}
                        onChange={(e) => setConfig((prev) => ({ ...prev, baseColor: e.target.value }))}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <span className="font-mono text-[11px] text-slate-300 uppercase">{config.baseColor}</span>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <label className="text-[11px] text-slate-400 block font-semibold">2. Trazo / Borde</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.outlineColor}
                        onChange={(e) => setConfig((prev) => ({ ...prev, outlineColor: e.target.value }))}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <span className="font-mono text-[11px] text-slate-300 uppercase">{config.outlineColor}</span>
                    </div>
                  </div>

                  {config.strokeMode === 'multi' && (
                    <>
                      <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <label className="text-[11px] text-slate-400 block font-semibold">3. Acento</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.accentColor}
                            onChange={(e) => setConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                            className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                          />
                          <span className="font-mono text-[11px] text-slate-300 uppercase">{config.accentColor}</span>
                        </div>
                      </div>

                      <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <label className="text-[11px] text-slate-400 block font-semibold">4. Detalle Fino</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.detailColor}
                            onChange={(e) => setConfig((prev) => ({ ...prev, detailColor: e.target.value }))}
                            className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                          />
                          <span className="font-mono text-[11px] text-slate-300 uppercase">{config.detailColor}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Accordion 3: Switch Mecánico & Tactilidad */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 'switch' ? '' : 'switch')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>3 • Switch Mecánico & Tactilidad</span>
              </div>
              {activeAccordion === 'switch' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {activeAccordion === 'switch' && (
              <div className="p-4 border-t border-slate-800/60 space-y-4 text-xs">
                
                {/* Tipo de Switch */}
                <div className="space-y-1">
                  <label className="text-slate-400 block font-semibold">Modelo de Pulsador MX</label>
                  <select
                    value={config.switchType}
                    onChange={(e) => setConfig((prev) => ({ ...prev, switchType: e.target.value as ClickerSwitchType }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-semibold"
                  >
                    <option value="red">Cherry MX Red (Lineal Suave 45g)</option>
                    <option value="blue">Cherry MX Blue (Clicky Sonoro 60g)</option>
                    <option value="brown">Cherry MX Brown (Táctil Bump 55g)</option>
                    <option value="black">Cherry MX Black (Lineal Firme 60g)</option>
                    <option value="yellow">Gateron Yellow (Lineal Veloz 50g)</option>
                  </select>
                </div>

                {/* Sound & Interactive Test Button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {config.soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                    <span className="font-semibold text-slate-300">Sonido de Click Táctil</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.soundEnabled}
                    onChange={(e) => setConfig((prev) => ({ ...prev, soundEnabled: e.target.checked }))}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleTestClick}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold border border-cyan-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                >
                  <span>⚡ Probar Pulsación Mecánica</span>
                </button>

              </div>
            )}
          </div>

          {/* Accordion 4: Argolla de Llavero (Keychain Ring) */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 'keychain' ? '' : 'keychain')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>4 • Argolla para Llavero</span>
              </div>
              <div className="flex items-center gap-2">
                {config.includeRing && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">Activo</span>
                )}
                {activeAccordion === 'keychain' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {activeAccordion === 'keychain' && (
              <div className="p-4 border-t border-slate-800/60 space-y-4 text-xs">
                
                {/* Toggle Include Ring */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="font-bold text-slate-200">Añadir Argolla al Modelo</span>
                  <input
                    type="checkbox"
                    checked={config.includeRing}
                    onChange={(e) => setConfig((prev) => ({ ...prev, includeRing: e.target.checked }))}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {config.includeRing && (
                  <>
                    {/* Quick Positions */}
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

                    {/* Ring Angle 360 */}
                    <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">Ángulo 360°</span>
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

                    {/* Ring Hole Diameter & Thickness */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold">Agujero</span>
                          <span className="font-mono text-cyan-400">{config.ringHoleDiameter || 4.5}mm</span>
                        </div>
                        <input
                          type="range"
                          min={3}
                          max={6}
                          step={0.5}
                          value={config.ringHoleDiameter || 4.5}
                          onChange={(e) => setConfig((prev) => ({ ...prev, ringHoleDiameter: Number(e.target.value) }))}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold">Grosor</span>
                          <span className="font-mono text-cyan-400">{config.ringThickness || 2.2}mm</span>
                        </div>
                        <input
                          type="range"
                          min={1.5}
                          max={3.5}
                          step={0.2}
                          value={config.ringThickness || 2.2}
                          onChange={(e) => setConfig((prev) => ({ ...prev, ringThickness: Number(e.target.value) }))}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}
          </div>

          {/* Orientation & Mirror */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
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

        </div>

        {/* MIDDLE 3D VIEWPORT */}
        <div ref={viewerRef} className="lg:col-span-6 bg-slate-950 relative flex flex-col items-center justify-center p-3 sm:p-4">
          
          {/* Top Controls Overlay in 3D Viewport */}
          <div className="absolute top-5 z-10 flex flex-wrap items-center gap-2 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-2xl max-w-[95%]">
            
            {/* Render Mode */}
            <div className="flex bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setConfig((prev) => ({ ...prev, renderStyle: 'color' }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  config.renderStyle === 'color' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Multi-Color
              </button>
              <button
                onClick={() => setConfig((prev) => ({ ...prev, renderStyle: 'extrude' }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  config.renderStyle === 'extrude' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Extrusión 3D
              </button>
            </div>

            {/* Lighting Preset */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
              {[
                { id: 'studio', label: 'Estudio' },
                { id: 'neon', label: 'Neón' },
                { id: 'warm', label: 'Cálido' },
              ].map((light) => (
                <button
                  key={light.id}
                  onClick={() => setConfig((prev) => ({ ...prev, lightingMode: light.id as ClickerLightingMode }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    config.lightingMode === light.id ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {light.label}
                </button>
              ))}
            </div>

            {/* Quick Test Click Button */}
            <button
              onClick={handleTestClick}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold shadow-md flex items-center gap-1 transition-all active:scale-95"
              title="Probar pulsación mecánica con sonido y animación"
            >
              <span>⚡ Probar Click</span>
            </button>

          </div>

          {/* 3D Canvas */}
          <div className="w-full h-full min-h-[440px] rounded-3xl overflow-hidden border border-slate-900 relative shadow-inner">
            {isProcessing && (
              <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-cyan-400 gap-3">
                <div className="w-9 h-9 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold tracking-wide">Vectorizando y optimizando contornos 3D...</span>
              </div>
            )}
            <ClickerViewer config={config} processedData={processedData} />
          </div>

          {/* Bottom Hint */}
          <div className="absolute bottom-5 text-[11px] text-slate-400 bg-slate-900/85 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-800 pointer-events-none flex items-center gap-2">
            <span>🖱️ Arrastrar para rotar</span>
            <span className="text-slate-600">•</span>
            <span>Rueda para zoom</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-semibold">Clic en Keycap para pulsar</span>
          </div>

        </div>

        {/* RIGHT SIDEBAR (Imagen, Muestras & Asistente de Impresión 3D) */}
        <div className="lg:col-span-3 bg-slate-900/60 border-l border-slate-800 p-4 sm:p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-60px)]">
          
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Origen de Imagen</h3>
            <p className="text-[11px] text-slate-400">Sube tu logo, diseño o elige una plantilla</p>
          </div>

          {/* Upload Drag & Drop Box */}
          <div className="relative border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-3xl p-5 text-center transition-all bg-slate-950/40 group">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="space-y-2 pointer-events-none">
              <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-200">Subir Imagen Personalizada</p>
              <p className="text-[10px] text-slate-500">PNG transparente o SVG vectorizado ideal</p>
            </div>
          </div>

          {/* Background Removal Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs font-bold text-slate-300">Remover Fondo Automáticamente</span>
            <input
              type="checkbox"
              checked={config.removeBackground}
              onChange={(e) => setConfig((prev) => ({ ...prev, removeBackground: e.target.checked }))}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          {/* Sample Images Gallery */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Galería de Muestras</label>
            <div className="grid grid-cols-3 gap-2">
              {CLICKER_SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => setConfig((prev) => ({ ...prev, imageUrl: sample.url, sampleId: sample.id }))}
                  className={`p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                    config.sampleId === sample.id
                      ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-500 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img src={sample.url} alt={sample.name} className="w-7 h-7 object-contain" />
                  <span className="text-[10px] font-semibold text-slate-300 truncate w-full text-center">{sample.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3D PRINTING SPECS & SLICER ASSISTANT CARD */}
          <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-cyan-400">
                <Printer className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Parámetros de Impresión 3D</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                Bambu / FDM
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Dimensiones</span>
                <span className="font-mono text-slate-200 font-bold">{config.size} × {config.size} × {config.topHeight + config.baseHeight}mm</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Peso Filamento</span>
                <span className="font-mono text-emerald-400 font-bold">~{estWeightGrams} g</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Altura de Capa</span>
                <span className="font-mono text-cyan-300 font-bold">0.16 mm (Óptimo)</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Tiempo Estimado</span>
                <span className="font-mono text-amber-300 font-bold">~{estPrintMins} min</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/40">
              💡 <strong>Consejo Nebulab:</strong> Imprime la tapa boca abajo directamente sobre la placa PEI texturizada para lograr una superficie lisa y sedosa sin líneas de soporte.
            </p>
          </div>

          {/* Price Summary & Purchase Card */}
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
