import React from 'react';
import { Box, Sparkles, ShieldCheck, ArrowRight, Lightbulb, Key, Heart, Wrench, Lock, CheckCircle2 } from 'lucide-react';

interface HomePageProps {
  onOpenLithophaneStudio: () => void;
  onOpenClickerStudio: () => void;
  onOpenAuth?: () => void;
  onOpenMyOrders: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onOpenLithophaneStudio,
  onOpenClickerStudio,
  onOpenMyOrders,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-900">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/15 via-violet-600/15 to-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Estudio de Impresión 3D y Litofanías Personalizadas</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-outfit max-w-4xl mx-auto leading-tight">
            Transformamos tus recuerdos en{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400">
              Esculturas de Luz 3D
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-inter">
            Personaliza tus fotografías con filtros ópticos de luz LED, bases de madera tallada y relieves tridimensionales de alta precisión.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onOpenLithophaneStudio}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-bold text-base shadow-xl shadow-cyan-500/25 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Box className="w-5 h-5" />
              <span>Diseñar Litofanía 3D</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>

            <button
              onClick={onOpenMyOrders}
              className="px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm transition-all hover:scale-105"
            >
              Consultar Mis Pedidos
            </button>
          </div>
        </div>
      </section>

      {/* Catalog & Customization Options Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white font-outfit">Opciones de Personalización 3D</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Explora nuestras colecciones exclusivas fabricadas en eco-PLA con resolución milimétrica.
          </p>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Litofanías 3D (ACTIVE) */}
          <div className="group relative rounded-3xl bg-slate-900/90 border border-cyan-500/40 p-6 flex flex-col justify-between shadow-xl shadow-cyan-500/10 hover:border-cyan-400 transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                  <Box className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Disponible
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white font-outfit group-hover:text-cyan-300 transition-colors">
                  Litofanías 3D
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Paneles ópticos curvos, planos y cilíndricos con iluminación de noche LED y grabado fotográfico.
                </p>
              </div>

              <div className="pt-2 space-y-1 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Resolución Ultra HD (450 px)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Base LED Cálida / RGB incluida</span>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenLithophaneStudio}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Personalizar Ahora</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Collares Personalizados (IN CONSTRUCTION) */}
          <div className="relative rounded-3xl bg-slate-900/40 border border-slate-800/80 p-6 flex flex-col justify-between opacity-85 hover:opacity-100 transition-opacity">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-rose-400">
                  <Heart className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" />
                  En Construcción
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-200 font-outfit">
                  Collares con Litofanía
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Dijes micro-litográficos en miniatura con proyección de luz para llevar tus recuerdos contigo.
                </p>
              </div>

              <div className="pt-2 text-xs text-slate-500 italic">
                Próximamente disponible en Nebulab 3D.
              </div>
            </div>

            <button
              disabled
              className="mt-6 w-full py-3 px-4 rounded-xl bg-slate-800/80 text-slate-400 font-bold text-xs border border-slate-700/50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Próximamente</span>
            </button>
          </div>

          {/* Card 3: Clickers & Llaveros 3D (ACTIVE) */}
          <div className="group relative rounded-3xl bg-slate-900/90 border border-violet-500/40 p-6 flex flex-col justify-between shadow-xl shadow-violet-500/10 hover:border-violet-400 transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                  <Key className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Disponible
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white font-outfit group-hover:text-violet-300 transition-colors">
                  Clickers & Llaveros 3D
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Genera clickers mecánicos con switch MX o llaveros táctiles con relieve a partir de cualquier imagen.
                </p>
              </div>

              <div className="pt-2 space-y-1 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>Carcasa con Switch MX Cherry</span>
                </div>
                <div className="flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Impresión Multi-Filamento AMS</span>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenClickerStudio}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Personalizar Clicker 3D</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>


          {/* Card 4: Centros de Mesa LED (IN CONSTRUCTION) */}
          <div className="relative rounded-3xl bg-slate-900/40 border border-slate-800/80 p-6 flex flex-col justify-between opacity-85 hover:opacity-100 transition-opacity">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-fuchsia-400">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" />
                  En Construcción
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-200 font-outfit">
                  Centros de Mesa LED
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Lámparas cilíndricas y cubos 3D panorámicos para decoración de salas y dormitorios.
                </p>
              </div>

              <div className="pt-2 text-xs text-slate-500 italic">
                En desarrollo de soporte y circuitos.
              </div>
            </div>

            <button
              disabled
              className="mt-6 w-full py-3 px-4 rounded-xl bg-slate-800/80 text-slate-400 font-bold text-xs border border-slate-700/50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Próximamente</span>
            </button>
          </div>

        </div>

      </section>

      {/* Trust & Features Section */}
      <section className="py-16 bg-slate-900/60 border-t border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Presición Milimétrica</h4>
            <p className="text-xs text-slate-400">Algoritmo de relieve en escala de grises HD.</p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Garantía de Impresión 3D</h4>
            <p className="text-xs text-slate-400">Revisión de STL previo a cada fabricación.</p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Box className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Envíos Seguros a Todo el País</h4>
            <p className="text-xs text-slate-400">Empaque protegido anti-impactos para regalo.</p>
          </div>
        </div>
      </section>

    </div>
  );
};
