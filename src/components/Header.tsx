import React from 'react';
import { ShoppingBag, Box, ShieldCheck, Sparkles, HelpCircle } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenHelp
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-violet-600 to-fuchsia-500 shadow-lg shadow-cyan-500/25">
            <Box className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-outfit">
                Litho<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">Craft</span> Studio
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
                MVP Commercial
              </span>
            </div>
            <p className="text-xs text-slate-400 font-inter hidden sm:block">
              Diseña, personaliza y compra litofanías 3D de alta precisión
            </p>
          </div>
        </div>

        {/* Value Badges (Hidden on mobile) */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Filtro de Luz LED Realista</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Garantía de Fabricación 3D</span>
          </div>
        </div>

        {/* Right CTA / Cart Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenHelp}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Ayuda y guía"
          >
            <HelpCircle className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            <ShoppingBag className="w-5 h-5" />
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
