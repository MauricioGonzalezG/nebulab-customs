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
import { LithophaneTour } from './components/editor/LithophaneTour';
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
import { useCurrency } from './context/CurrencyContext';
import { ImageIcon, Layers, Lightbulb, Sparkles, CheckCircle2, ArrowLeft, Lock, Upload, ShoppingCart } from 'lucide-react';
import { BRAND, getWhatsAppUrl } from './lib/brand';
import { captureAttribution, trackPageView, pathForView, trackAddToCart, trackBeginCheckout, trackPurchase, trackViewItem } from './lib/analytics';

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
  const { formatPrice } = useCurrency();

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

  // Guided tour & simplified client flow
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [userPickedImage, setUserPickedImage] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleTourClose = () => {
    setIsTourOpen(false);
  };

  // Oculta el botón flotante móvil cuando la tarjeta de subida ya está en pantalla
  const [isUploadZoneVisible, setIsUploadZoneVisible] = useState(false);
  useEffect(() => {
    if (isAuthenticated || currentView !== 'studio') {
      setIsUploadZoneVisible(false);
      return;
    }
    const target = document.querySelector('[data-tour="litho-upload"]');
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsUploadZoneVisible(entry.isIntersecting && entry.intersectionRatio >= 0.35),
      { threshold: [0, 0.35, 0.75] }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [isAuthenticated, currentView, isEditorOpen]);

  // GA4: captura atribución (UTMs/fbclid/referrer) una sola vez al entrar
  useEffect(() => {
    captureAttribution();
  }, []);

  // GA4: page_view manual en cada cambio de vista (SPA con pushState)
  useEffect(() => {
    trackPageView(pathForView(currentView));
    if (currentView === 'studio') trackViewItem({ item_id: 'litofania', item_name: 'Litofanía personalizada' });
    if (currentView === 'clicker') trackViewItem({ item_id: 'clicker', item_name: 'Clicker personalizado' });
    if (currentView === 'collar') trackViewItem({ item_id: 'collar', item_name: 'Collar para mascota' });
  }, [currentView]);

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
      trackAddToCart({
        item_id: itemOrGiftBox.itemType || 'producto',
        item_name: itemOrGiftBox.itemType || 'Producto Nebulab',
        price: itemOrGiftBox.price,
        quantity: itemOrGiftBox.quantity || 1,
      });
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
    trackAddToCart({
      item_id: 'litofania',
      item_name: 'Litofanía personalizada',
      price: priceCalc.totalPrice,
      quantity: 1,
    });
  };

  // GA4: inicio de checkout cuando se abre el modal con productos
  const checkoutTrackedRef = useRef(false);
  useEffect(() => {
    if (isCheckoutOpen && cart.length > 0 && !checkoutTrackedRef.current) {
      const value = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const numItems = cart.reduce((acc, item) => acc + item.quantity, 0);
      trackBeginCheckout({ value, num_items: numItems });
      checkoutTrackedRef.current = true;
    }
    if (!isCheckoutOpen) {
      checkoutTrackedRef.current = false;
    }
  }, [isCheckoutOpen, cart]);

  const handleBuyNow = (itemOrGiftBox?: CartItem | boolean) => {
    handleAddToCart(itemOrGiftBox);
    if (isTourOpen) handleTourClose();
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
    try {
      const value = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const numItems = cart.reduce((acc, item) => acc + item.quantity, 0);
      trackPurchase({
        transaction_id: _order?.id || `ORDER-${Date.now()}`,
        value,
        num_items: numItems,
      });
    } catch {
      /* no bloquear el flujo de compra si falla analytics */
    }
    setCart([]); // Clear cart after order
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Precio visible en la barra inferior móvil (total con envío estimado, sin caja de regalo)
  const lithoBarPrice = calculatePrice(config, false);
  const lithoBarPriceLabel = formatPrice(lithoBarPrice.grandTotalCop, lithoBarPrice.grandTotal);

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
            <div ref={viewerRef} data-tour="litho-preview" className="lg:col-span-7 space-y-6 lg:sticky lg:top-24">
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
                  <Layers className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-200">Material Eco PLA</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Termoplástico no tóxico</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-200">Listo para Fabricar</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Exportación directa a STL</p>
                </div>
              </div>
            </div>

            {/* Right Column: Customizer Controls & E-Commerce Box */}
            <div className="lg:col-span-5 space-y-6">

              {isAuthenticated ? (
                <>
                  {/* Tab Navigation (solo administradores) */}
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
                </>
              ) : (
                <div className="space-y-4">
                  {/* Encabezado del flujo simple para clientes */}
                  <div className="relative overflow-hidden rounded-2xl border border-cyan-800/50 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold font-outfit text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span>Crea tu litofanía en 3 sencillos pasos</span>
                        </h2>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          Sube tu foto, revisa la vista previa 3D y añádela al carrito. Nosotros la imprimimos y te la enviamos.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsTourOpen(true)}
                        className="shrink-0 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[11px] font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
                      >
                        Ver tutorial
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        { n: '1', label: 'Sube tu foto' },
                        { n: '2', label: 'Previsualiza en 3D' },
                        { n: '3', label: 'Añade y paga' },
                      ].map((s) => (
                        <div key={s.n} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-300">{s.n}</span>
                          <span className="text-[10px] font-semibold text-slate-300">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ImageSection
                    config={config}
                    onChange={updateConfig}
                    simple
                    onEditorOpenChange={setIsEditorOpen}
                    onImageLoaded={(img) => {
                      setCurrentImageElement(img);
                      setUserPickedImage(true);
                      scrollToViewerOnMobile();
                    }}
                  />
                </div>
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

          {/* Mobile: barra inferior grande para subir la foto / comprar */}
          {!isAuthenticated && !isUploadZoneVisible && (
            <>
              <div className="h-32 lg:hidden" />
              <button
                type="button"
                onClick={() =>
                  userPickedImage ? handleBuyNow(false) : window.dispatchEvent(new Event('nebulab:open-litho-upload'))
                }
                className={`fixed bottom-0 left-0 right-0 z-40 flex items-center gap-2.5 rounded-t-3xl border-t px-6 pt-4 pb-[max(1.1rem,env(safe-area-inset-bottom))] text-white lg:hidden ${
                  userPickedImage
                    ? 'justify-between border-violet-400/40 bg-violet-600 shadow-[0_-10px_36px_rgba(139,92,246,0.45)]'
                    : 'justify-center border-cyan-400/40 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_-10px_36px_rgba(34,211,238,0.45)]'
                }`}
              >
                {userPickedImage ? (
                  <>
                    <span className="flex flex-col items-start leading-tight">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-200/90">Total</span>
                      <span className="text-base font-extrabold">{lithoBarPriceLabel}</span>
                    </span>
                    <span className="flex items-center gap-2 text-base font-extrabold">
                      <ShoppingCart className="h-5 w-5" />
                      <span>Comprar</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span className="text-base font-extrabold">Subir mi foto</span>
                  </>
                )}
              </button>
            </>
          )}

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

      {/* Guided Tour for Lithophane Studio (clientes) */}
      {currentView === 'studio' && !isAuthenticated && (
        <LithophaneTour
          isOpen={isTourOpen}
          userPickedImage={userPickedImage}
          editorOpen={isEditorOpen}
          cartCount={cartCount}
          onClose={handleTourClose}
          onStepChange={(id) => {
            if (id === 'buy') setIsCartOpen(false);
          }}
        />
      )}

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
