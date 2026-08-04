import React, { useEffect, useState } from 'react';
import { CartItem, LithophaneConfig, Order } from './types';
import { createPlaceholderImage, processImageForLithophane, ProcessedImageData } from './core/imageProcessor';
import { Header } from './components/Header';
import { LithophaneViewer } from './components/3d/LithophaneViewer';
import { ImageSection } from './components/editor/ImageSection';
import { ShapeSection } from './components/editor/ShapeSection';
import { BaseSection } from './components/editor/BaseSection';
import { PricingSummary, calculatePrice } from './components/ecommerce/PricingSummary';
import { CartDrawer } from './components/ecommerce/CartDrawer';
import { CheckoutModal } from './components/ecommerce/CheckoutModal';
import { HelpModal } from './components/HelpModal';
import { ImageIcon, Layers, Lightbulb, Sparkles, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  // Default Lithophane configuration (Arc shape with night light socket mount and Ultra HD resolution)
  const [config, setConfig] = useState<LithophaneConfig>({
    imageUrl: null,
    brightness: 10,
    contrast: 25,
    invert: false,
    shape: 'arc',
    resolutionMode: 'ultra',
    width: 120,
    height: 100,
    minThickness: 0.8,
    maxThickness: 1.7,
    arcAngle: 60,
    frameWidth: 3,
    baseType: 'night-light',
    material: 'white-pla',
    enableLight: true,
    lightWarmth: 40,
    lightIntensity: 85
  });

  const [processedData, setProcessedData] = useState<ProcessedImageData | null>(null);
  const [currentImageElement, setCurrentImageElement] = useState<HTMLImageElement | null>(null);

  // E-commerce state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Active control tab
  const [activeTab, setActiveTab] = useState<'image' | 'shape' | 'base'>('image');

  // Load default placeholder image on startup
  useEffect(() => {
    createPlaceholderImage().then((img) => {
      setCurrentImageElement(img);
    });
  }, []);

  // Re-process image whenever config adjustments change
  useEffect(() => {
    if (!currentImageElement) return;

    const gridRes =
      config.resolutionMode === 'ultra' ? 450 : config.resolutionMode === 'hd' ? 300 : 180;

    try {
      const processed = processImageForLithophane(currentImageElement, {
        brightness: config.brightness,
        contrast: config.contrast,
        invert: config.invert,
        gridResolution: gridRes
      });
      setProcessedData(processed);
    } catch (err) {
      console.error('Error processing image:', err);
    }
  }, [currentImageElement, config.brightness, config.contrast, config.invert, config.resolutionMode]);

  const updateConfig = (updates: Partial<LithophaneConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleToggleLight = () => {
    updateConfig({ enableLight: !config.enableLight });
  };

  // Add item to cart
  const handleAddToCart = (giftBox: boolean) => {
    if (!processedData) return;

    const priceCalc = calculatePrice(config, giftBox);

    const newItem: CartItem = {
      id: `ITEM-${Date.now()}`,
      config: { ...config },
      previewImageDataUrl: processedData.previewDataUrl,
      price: priceCalc.totalPrice,
      quantity: 1,
      createdAt: new Date().toISOString()
    };

    setCart((prev) => [...prev, newItem]);
  };

  const handleBuyNow = (giftBox: boolean) => {
    handleAddToCart(giftBox);
    setIsCheckoutOpen(true);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleOrderCompleted = (order: Order) => {
    console.log('Order created:', order);
    setCart([]); // Clear cart after order
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Navbar Header */}
      <Header
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: 3D Viewport & Interactive Preview */}
        <div className="lg:col-span-7 space-y-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
                <span>Visualizador de Litofanía 3D</span>
                <span className="text-xs font-normal text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                  Previsualización en tiempo real
                </span>
              </h2>
            </div>

            {/* Quick Shape Indicator Badge */}
            <div className="text-xs font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1 rounded-full uppercase tracking-wider">
              {config.shape === 'arc' ? 'Arco / Curva' : config.shape === 'flat' ? 'Plana' : 'Cilindro'} • {config.width}x{config.height}mm
            </div>
          </div>

          {/* 3D Viewer Canvas */}
          <LithophaneViewer
            config={config}
            processedData={processedData}
            onToggleLight={handleToggleLight}
          />

          {/* Feature Highlights beneath 3D viewport */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
              <Sparkles className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-200">Relieve Fotográfico</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Dispersión de luz milimétrica</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
              <Layers className="w-4 h-4 text-violet-400 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-200">Material Eco PLA</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Termoplástico no tóxico</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-200">Listo para Fabricar</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Exportación directa a STL</p>
            </div>
          </div>
        </div>

        {/* Right Column: Customizer Controls & E-Commerce Box */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Tab Navigation */}
          <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('image')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'image'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>1. Imagen</span>
            </button>

            <button
              onClick={() => setActiveTab('shape')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'shape'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2. Forma</span>
            </button>

            <button
              onClick={() => setActiveTab('base')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'base'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>3. Base & Luz</span>
            </button>
          </div>

          {/* Tab Contents */}
          {activeTab === 'image' && (
            <ImageSection
              config={config}
              onChange={updateConfig}
              onImageLoaded={(img) => setCurrentImageElement(img)}
            />
          )}

          {activeTab === 'shape' && (
            <ShapeSection
              config={config}
              onChange={updateConfig}
            />
          )}

          {activeTab === 'base' && (
            <BaseSection
              config={config}
              onChange={updateConfig}
            />
          )}

          {/* Pricing Summary & E-commerce Checkout CTAs */}
          <PricingSummary
            config={config}
            previewDataUrl={processedData?.previewDataUrl || null}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
          />
        </div>

      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        onOrderCompleted={handleOrderCompleted}
        onDownloadSTL={() => {
          // Trigger STL Export from active state
          alert('Generando y descargando el archivo STL 3D de alta resolución...');
        }}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-12 bg-slate-950 border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 LithoCraft Studio • Plataforma de Impresión 3D y Litofanías Personalizadas</p>
          <div className="flex gap-4 text-slate-400">
            <a href="#" onClick={(e) => { e.preventDefault(); setIsHelpOpen(true); }} className="hover:text-cyan-400">Guía de uso</a>
            <span>•</span>
            <a href="#" onClick={(e) => { e.preventDefault(); alert('Términos y condiciones de impresión 3D'); }} className="hover:text-cyan-400">Términos y Condiciones</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
