import React, { useEffect, useState, useRef } from 'react';
import { CartItem, LithophaneConfig, Order } from './types';
import { createPlaceholderImage, processImageForLithophane, calculateLithophaneDimensions, ProcessedImageData } from './core/imageProcessor';
import { downloadLithophaneSTL } from './core/stlExporter';
import { Header } from './components/Header';
import { HomePage } from './components/home/HomePage';
import { LithophaneViewer } from './components/3d/LithophaneViewer';
import { ImageSection, LITHOPHANE_SAMPLE_IMAGES } from './components/editor/ImageSection';
import { ShapeSection } from './components/editor/ShapeSection';
import { BaseSection } from './components/editor/BaseSection';
import { PricingSummary, calculatePrice } from './components/ecommerce/PricingSummary';
import { CartDrawer } from './components/ecommerce/CartDrawer';
import { CheckoutModal } from './components/ecommerce/CheckoutModal';
import { HelpModal } from './components/HelpModal';
import { LoginModal } from './components/admin/LoginModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CustomerAuthModal } from './components/auth/CustomerAuthModal';
import { MyOrdersModal } from './components/customer/MyOrdersModal';
import { ClickerStudio } from './components/clicker/ClickerStudio';
import { CollarStudio } from './components/collar/CollarStudio';
import { useAuth } from './context/AuthContext';
import { ImageIcon, Layers, Lightbulb, Sparkles, CheckCircle2, ArrowLeft, Lock } from 'lucide-react';
import { BRAND, getWhatsAppUrl } from './lib/brand';

const getViewFromPath = (path: string): 'home' | 'studio' | 'clicker' | 'collar' | 'admin' => {
  const p = path.toLowerCase();
  if (p.includes('/collar') || p.includes('/mascota')) return 'collar';
  if (p.includes('/clicker') || p.includes('/llavero')) return 'clicker';
  if (p.includes('/litofania') || p.includes('/lithophane') || p.includes('/studio')) return 'studio';
  if (p.includes('/admin')) return 'admin';
  return 'home';
};

export const App: React.FC = () => {
  const { isAuthenticated, customerUser } = useAuth();

  // Navigation view state initialized from current URL path
  const [currentView, setCurrentView] = useState<'home' | 'studio' | 'clicker' | 'collar' | 'admin'>(() =>
    getViewFromPath(window.location.pathname)
  );


  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminViewOpen, setIsAdminViewOpen] = useState(() => window.location.pathname.toLowerCase().includes('/admin'));
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);

  const scrollToViewerOnMobile = () => {
    if (window.innerWidth < 1024 && viewerRef.current) {
      setTimeout(() => {
        viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  };


  // Default Lithophane configuration
  const [config, setConfig] = useState<LithophaneConfig>({
    imageUrl: LITHOPHANE_SAMPLE_IMAGES[1].url,
    sampleId: LITHOPHANE_SAMPLE_IMAGES[1].id,
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
    frameWidth: 4.5,
    frameThickness: 5,
    baseType: 'night-light',
    material: 'white-pla',
    puckDiameter: 70,
    puckDepth: 25,
    puckAngle: 55,
    puckArcCoverage: 180,
    strutCount: 4,
    strutLength: 60,
    strutWidth: 5,
    showLampPuck: true,
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

  // Start with the dog sample so the 3D viewer is useful immediately.
  useEffect(() => {
    const defaultImage = new Image();
    defaultImage.crossOrigin = 'Anonymous';
    defaultImage.onload = () => {
      setCurrentImageElement(defaultImage);
      const { width, height } = calculateLithophaneDimensions(
        defaultImage.naturalWidth || defaultImage.width,
        defaultImage.naturalHeight || defaultImage.height,
        120
      );
      setConfig((prev) => ({ ...prev, width, height }));
    };
    defaultImage.onerror = () => {
      createPlaceholderImage().then((img) => {
        setCurrentImageElement(img);
        const { width, height } = calculateLithophaneDimensions(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          120
        );
        setConfig((prev) => ({ ...prev, width, height }));
      });
    };
    defaultImage.src = LITHOPHANE_SAMPLE_IMAGES[1].url;
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

  // Add item to cart (supports Lithophane giftBox or direct CartItem)
  const handleAddToCart = (itemOrGiftBox?: CartItem | boolean) => {
    if (typeof itemOrGiftBox === 'object' && itemOrGiftBox !== null) {
      setCart((prev) => [...prev, itemOrGiftBox]);
      setIsCartOpen(true);
      return;
    }

    if (!processedData) return;
    const giftBox = typeof itemOrGiftBox === 'boolean' ? itemOrGiftBox : false;
    const priceCalc = calculatePrice(config, giftBox);

    const newItem: CartItem = {
      id: `ITEM-${Date.now()}`,
      itemType: 'lithophane',
      config: { ...config },
      previewImageDataUrl: processedData.previewDataUrl,
      price: priceCalc.totalPrice,
      quantity: 1,
      createdAt: new Date().toISOString()
    };

    setCart((prev) => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const handleBuyNow = (itemOrGiftBox?: CartItem | boolean) => {
    handleAddToCart(itemOrGiftBox);
    setIsCartOpen(false);
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

  const handleOrderCompleted = (_order: Order) => {
    setCart([]); // Clear cart after order
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Synchronize state with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const view = getViewFromPath(window.location.pathname);
      setCurrentView(view);
      if (view === 'admin') {
        if (isAuthenticated) {
          setIsAdminViewOpen(true);
        } else {
          setIsLoginModalOpen(true);
        }
      } else {
        setIsAdminViewOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

  const navigateTo = (view: 'home' | 'studio' | 'clicker' | 'collar' | 'admin') => {
    setCurrentView(view);
    const targetPath =
      view === 'collar'
        ? '/collares'
        : view === 'clicker'
          ? '/clickers'
          : view === 'studio'
            ? '/litofanias'
            : view === 'admin'
              ? '/admin'
              : '/';

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }

    if (view === 'admin') {
      if (isAuthenticated) {
        setIsAdminViewOpen(true);
      } else {
        setIsLoginModalOpen(true);
      }
    } else {
      setIsAdminViewOpen(false);
    }
  };

  const handleOpenAdmin = () => {
    navigateTo('admin');
  };

  if (isAdminViewOpen && isAuthenticated) {
    return <AdminDashboard onClose={() => navigateTo('home')} />;
  }

  return (
    <div className="brand-shell min-h-screen bg-slate-950 text-slate-100 font-inter flex flex-col selection:bg-cyan-500 selection:text-slate-950">

      {/* Navbar Header */}
      <Header
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenAdmin={handleOpenAdmin}
        onNavigateHome={() => navigateTo('home')}
        onNavigateStudio={() => navigateTo('studio')}
        onNavigateClicker={() => navigateTo('clicker')}
        onNavigateCollar={() => navigateTo('collar')}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
        onOpenCustomerAuth={() => setIsCustomerAuthOpen(true)}
        customerName={customerUser?.name || null}
        isAdminAuthenticated={isAuthenticated}
        currentView={currentView}
      />

      {/* Main Body View Switching */}
      {currentView === 'home' ? (
        <HomePage
          onOpenLithophaneStudio={() => navigateTo('studio')}
          onOpenClickerStudio={() => navigateTo('clicker')}
          onOpenCollarStudio={() => navigateTo('collar')}
          onOpenAuth={() => setIsCustomerAuthOpen(true)}
          onOpenMyOrders={() => setIsMyOrdersOpen(true)}
        />
      ) : currentView === 'clicker' ? (
        <ClickerStudio
          onBackToHome={() => navigateTo('home')}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      ) : currentView === 'collar' ? (
        <CollarStudio
          onBackToHome={() => navigateTo('home')}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      ) : (



        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">

          {/* Back to Home Bar */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <button
              onClick={() => navigateTo('home')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors"
            >

              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Volver al catálogo</span>
            </button>

            <span className="text-xs text-slate-400 font-mono">
              {BRAND.name} · {BRAND.workspaceName}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: 3D Viewport & Interactive Preview */}
            <div ref={viewerRef} className="lg:col-span-7 space-y-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
                    <span>Vista previa 3D</span>
                    <span className="text-xs font-normal text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                      En tiempo real
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
                imgElement={currentImageElement}
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
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'image'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>1. Imagen</span>
                </button>

                <button
                  onClick={() => setActiveTab('shape')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'shape'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>2. Forma</span>
                </button>

                <button
                  onClick={() => setActiveTab('base')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'base'
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
                  onImageLoaded={(img) => {
                    setCurrentImageElement(img);
                    scrollToViewerOnMobile();
                  }}
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
          </div>

        </main>
      )}

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
          if (processedData) {
            downloadLithophaneSTL(processedData, config, undefined, currentImageElement);
          }
        }}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Admin Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => setIsAdminViewOpen(true)}
      />

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        onClose={() => setIsCustomerAuthOpen(false)}
        onSuccess={() => setIsMyOrdersOpen(true)}
      />

      {/* My Orders Modal */}
      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
        onNavigateToStudio={() => setCurrentView('studio')}
        onOpenCustomerAuth={() => {
          setIsMyOrdersOpen(false);
          setIsCustomerAuthOpen(true);
        }}
      />


      {/* Footer */}
      <footer className="mt-12 bg-slate-950 border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <p>© 2026 {BRAND.name} · {BRAND.locations}</p>
            <span className="text-[10px] text-slate-600 font-mono">{BRAND.tagline.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href={getWhatsAppUrl()} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
            <span>•</span>
            <a href={BRAND.instagramUrl} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">{BRAND.instagramHandle}</a>
            <span>•</span>
            <a href="#" onClick={(e) => { e.preventDefault(); setIsHelpOpen(true); }} className="hover:text-cyan-400">Guía de uso</a>
            <span>•</span>
            <a href="#" onClick={(e) => { e.preventDefault(); alert('Términos y condiciones de impresión 3D'); }} className="hover:text-cyan-400">Términos y Condiciones</a>
            <span>•</span>
            <a href="#" onClick={(e) => { e.preventDefault(); handleOpenAdmin(); }} className="hover:text-slate-300 text-slate-600 transition-colors flex items-center gap-1 opacity-60 hover:opacity-100" title="Acceso de Administración">
              <Lock className="w-3 h-3" />
              <span>Admin</span>
            </a>
          </div>
        </div>
      </footer>


    </div>
  );
};

export default App;
