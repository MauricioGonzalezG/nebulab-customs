import React, { useState } from 'react';
import { ShoppingBag, Box, HelpCircle, LayoutDashboard, User, Package, Home, Key, Heart, MessageCircle, Menu, X } from 'lucide-react';
import { CurrencySelector, useCurrency } from '../context/CurrencyContext';
import { BRAND, getWhatsAppUrl } from '../lib/brand';


interface HeaderProps {
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenHelp: () => void;
  onOpenAdmin: () => void;
  onNavigateHome: () => void;
  onNavigateStudio?: () => void;
  onNavigateClicker?: () => void;
  onNavigateCollar?: () => void;
  onOpenMyOrders: () => void;
  onOpenCustomerAuth: () => void;
  customerName?: string | null;
  isAdminAuthenticated?: boolean;
  currentView?: 'home' | 'studio' | 'clicker' | 'collar' | 'admin';
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenHelp,
  onOpenAdmin,
  onNavigateHome,
  onNavigateStudio,
  onNavigateClicker,
  onNavigateCollar,
  onOpenMyOrders,
  onOpenCustomerAuth,
  customerName,
  isAdminAuthenticated = false,
  currentView = 'home'
}) => {
  const { formatPriceUsdOnly } = useCurrency();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="brand-header relative sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img
            src={BRAND.logoDarkUrl}
            alt={BRAND.name}
            className="brand-logo group-hover:scale-[1.02] transition-transform"
          />
          <h1 className="sr-only">{BRAND.workspaceName}</h1>
        </div>

        {/* Center navigation */}
        <nav className="brand-nav hidden lg:flex items-center gap-0.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800" aria-label="Navegación principal">
          <button
            onClick={() => { onNavigateHome(); closeMobileMenu(); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              currentView === 'home'
                ? 'brand-nav-active'
                : 'brand-nav-inactive'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </button>

          {onNavigateStudio && (
            <button
              onClick={() => { onNavigateStudio(); closeMobileMenu(); }}
              title="Litofanías 3D"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                currentView === 'studio'
                  ? 'brand-nav-active'
                  : 'brand-nav-inactive'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>Litofanías</span>
            </button>
          )}

          {onNavigateClicker && (
            <button
              onClick={() => { onNavigateClicker(); closeMobileMenu(); }}
              title="Clickers y llaveros"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                currentView === 'clicker'
                  ? 'brand-nav-active'
                  : 'brand-nav-inactive'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-violet-400" />
              <span>Clickers</span>
            </button>
          )}

          {onNavigateCollar && (
            <button
              onClick={() => { onNavigateCollar(); closeMobileMenu(); }}
              title="Collares para mascotas"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                currentView === 'collar'
                  ? 'brand-nav-active'
                  : 'brand-nav-inactive'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Collares</span>
            </button>
          )}
        </nav>



        {/* Right CTA / Customer, Admin & Cart Buttons */}
        <div className="flex items-center gap-2.5">
          
          {/* Customer Account / Orders Button */}
          {customerName ? (
            <button
              onClick={onOpenMyOrders}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 text-xs font-semibold transition-all"
              title="Ver mis pedidos"
            >
              <Package className="w-4 h-4 text-cyan-400" />
              <span className="hidden xl:inline">Mis pedidos</span>
            </button>
          ) : (
            <button
              onClick={onOpenCustomerAuth}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-all"
              title="Iniciar sesión / Registro"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span className="hidden xl:inline">Ingresar</span>
            </button>
          )}

          {/* Admin Dashboard Button (Only visible when already authenticated as admin) */}
          {isAdminAuthenticated && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 text-xs font-semibold transition-all"
              title="Panel de Administración"
            >
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
              <span className="hidden xl:inline">Panel Admin</span>
            </button>
          )}


          <CurrencySelector />

          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noreferrer"
            className="brand-quote-button hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            title="Cotizar por WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Cotizar</span>
          </a>

          <button
            onClick={onOpenHelp}
            className="hidden sm:flex p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Ayuda y guía"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
              <span className="hidden md:inline">Carrito</span>
            
            {cartCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-slate-950 text-xs font-extrabold">
                  {cartCount}
                </span>
                <span className="text-xs font-bold text-cyan-100 hidden md:inline">
                  {formatPriceUsdOnly(cartTotal)}
                </span>
              </div>
            )}
          </button>

          <button
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="lg:hidden p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {isMobileMenuOpen && (
        <nav className="brand-mobile-menu lg:hidden" aria-label="Navegación móvil">
          <button onClick={() => { onNavigateHome(); closeMobileMenu(); }} className="brand-mobile-item">
            <Home className="w-4 h-4" /> Inicio
          </button>
          {onNavigateStudio && (
            <button onClick={() => { onNavigateStudio(); closeMobileMenu(); }} className="brand-mobile-item">
              <Box className="w-4 h-4" /> Litofanías 3D
            </button>
          )}
          {onNavigateClicker && (
            <button onClick={() => { onNavigateClicker(); closeMobileMenu(); }} className="brand-mobile-item">
              <Key className="w-4 h-4" /> Clickers y llaveros
            </button>
          )}
          {onNavigateCollar && (
            <button onClick={() => { onNavigateCollar(); closeMobileMenu(); }} className="brand-mobile-item">
              <Heart className="w-4 h-4" /> Collares para mascotas
            </button>
          )}
          <a href={getWhatsAppUrl()} target="_blank" rel="noreferrer" className="brand-mobile-item brand-mobile-quote">
            <MessageCircle className="w-4 h-4" /> Cotizar por WhatsApp
          </a>
        </nav>
      )}
    </header>
  );
};
