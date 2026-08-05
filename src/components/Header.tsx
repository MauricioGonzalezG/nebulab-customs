import React from 'react';
import { ShoppingBag, Box, HelpCircle, LayoutDashboard, User, Package, Home, Key } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenHelp: () => void;
  onOpenAdmin: () => void;
  onNavigateHome: () => void;
  onNavigateStudio?: () => void;
  onNavigateClicker?: () => void;
  onOpenMyOrders: () => void;
  onOpenCustomerAuth: () => void;
  customerName?: string | null;
  isAdminAuthenticated?: boolean;
  currentView?: 'home' | 'studio' | 'clicker' | 'admin';
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
  onOpenMyOrders,
  onOpenCustomerAuth,
  customerName,
  isAdminAuthenticated = false,
  currentView = 'home'
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-violet-600 to-fuchsia-500 shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <Box className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-outfit">
                Nebulab <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">3D</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
                Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 font-inter hidden sm:block">
              Personalizaciones 3D & Litofanías Fotográficas
            </p>
          </div>
        </div>

        {/* Center navigation */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={onNavigateHome}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentView === 'home'
                ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </button>

          {onNavigateStudio && (
            <button
              onClick={onNavigateStudio}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'studio'
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>Litofanías 3D</span>
            </button>
          )}

          {onNavigateClicker && (
            <button
              onClick={onNavigateClicker}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'clicker'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-violet-400" />
              <span>Clickers & Llaveros</span>
            </button>
          )}
        </div>


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
              <span className="hidden sm:inline">Mis Pedidos</span>
            </button>
          ) : (
            <button
              onClick={onOpenCustomerAuth}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-all"
              title="Iniciar sesión / Registro"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Ingresar</span>
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
              <span className="hidden sm:inline">Admin Dashboard</span>
            </button>
          )}


          <button
            onClick={onOpenHelp}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Ayuda y guía"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Carrito</span>
            
            {cartCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-slate-950 text-xs font-extrabold">
                  {cartCount}
                </span>
                <span className="text-xs font-bold text-cyan-100 hidden md:inline">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
