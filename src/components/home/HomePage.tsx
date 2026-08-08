import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  Heart,
  Key,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { BRAND, getWhatsAppUrl } from '../../lib/brand';

interface HomePageProps {
  onOpenLithophaneStudio: () => void;
  onOpenClickerStudio: () => void;
  onOpenCollarStudio: () => void;
  onOpenAuth?: () => void;
  onOpenMyOrders: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onOpenLithophaneStudio,
  onOpenClickerStudio,
  onOpenCollarStudio,
}) => {
  const services: Array<{
    eyebrow: string;
    title: string;
    description: string;
    image: string;
    icon: React.ElementType;
    accent: string;
    actionLabel: string;
    onAction: () => void;
  }> = [
    {
      eyebrow: 'REGALOS PERSONALIZADOS',
      title: 'Litofanías 3D',
      description: 'Convierte tus fotos en piezas de luz con relieve, marco y base LED listos para regalar.',
      image: 'https://www.nebulab3d.com.co/images/lamparas/lampara-02.jpg',
      icon: Box,
      accent: 'text-violet-300',
      actionLabel: 'Abrir estudio',
      onAction: onOpenLithophaneStudio,
    },
    {
      eyebrow: 'HECHO A TU MEDIDA',
      title: 'Collares para mascotas',
      description: 'Placas tridimensionales con nombre y teléfono para acompañar a tu mascota todos los días.',
      image: '/brand/collares-kolla.png',
      icon: Heart,
      accent: 'text-pink-300',
      actionLabel: 'Diseñar collar',
      onAction: onOpenCollarStudio,
    },
    {
      eyebrow: 'POPULAR',
      title: 'Clickers & llaveros',
      description: 'Diseños funcionales, relieves y piezas con identidad para llevar tus ideas contigo.',
      image: '/brand/llavero-perro.png',
      icon: Key,
      accent: 'text-blue-300',
      actionLabel: 'Personalizar pieza',
      onAction: onOpenClickerStudio,
    },
  ];

  return (
    <div className="brand-page min-h-screen text-slate-100 font-inter selection:bg-violet-500 selection:text-white">
      <section className="brand-hero brand-grid relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,rgba(123,89,214,0.16),transparent_38%)]" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 text-center">
          <p className="brand-eyebrow mb-5">{BRAND.name} · Studio</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-outfit">
            Personaliza tu producto 3D
          </h1>
          <button
            onClick={onOpenLithophaneStudio}
            className="brand-primary mt-8 inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-all"
          >
            <Box className="w-4 h-4" />
            Entrar a personalizar
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-10">
          <div>
            <p className="brand-eyebrow mb-3">Lo que hacemos</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-outfit">
              Productos que no existen
              <br />
              <span className="text-violet-300">hasta que los imaginas.</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">
            Elige un punto de partida, personalízalo en línea y revisa tu pieza en 3D antes de pedirla.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article key={service.title} className="brand-card group rounded-2xl overflow-hidden transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    loading="lazy"
                    className="brand-card-image h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/20 to-transparent" />
                  <span className="brand-eyebrow absolute bottom-4 left-5">{service.eyebrow}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white font-outfit">{service.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{service.description}</p>
                    </div>
                    <Icon className={`w-5 h-5 shrink-0 ${service.accent}`} />
                  </div>
                  <button
                    onClick={service.onAction}
                    className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-violet-300 hover:text-white transition-colors"
                  >
                    {service.actionLabel}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="brand-contact mt-6 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-7">
          <div>
            <p className="brand-eyebrow mb-3">¿No ves lo que buscas?</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-outfit">Cuéntanos tu idea.</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              Desde una pieza para tu negocio hasta un regalo imposible de encontrar. Te ayudamos a convertirlo en un objeto real.
            </p>
          </div>
          <a
            href={getWhatsAppUrl('Hola Nebulab 3D, tengo una idea especial')}
            target="_blank"
            rel="noreferrer"
            className="brand-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] transition-all"
          >
            Pedir cotización
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <section className="brand-grid border-y border-white/10 bg-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="brand-stat pl-0 sm:pl-6">
            <div className="text-4xl font-black text-white font-outfit">4+</div>
            <div className="brand-eyebrow mt-2">Impresoras activas</div>
          </div>
          <div className="brand-stat pl-0 sm:pl-6">
            <div className="text-4xl font-black text-white font-outfit">100%</div>
            <div className="brand-eyebrow mt-2">Personalizados</div>
          </div>
          <div className="brand-stat pl-0 sm:pl-6">
            <div className="text-4xl font-black text-white font-outfit">2</div>
            <div className="brand-eyebrow mt-2">Ciudades conectadas</div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <Sparkles className="w-5 h-5 text-violet-300 mb-5" />
            <h4 className="text-lg font-bold text-white font-outfit">Innovador</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Creatividad aplicada para llevar la impresión 3D a soluciones originales y sorprendentes.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <Heart className="w-5 h-5 text-pink-300 mb-5" />
            <h4 className="text-lg font-bold text-white font-outfit">Cercano</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Comunicación directa y simple desde la primera idea hasta la entrega de tu pieza.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <ShieldCheck className="w-5 h-5 text-blue-300 mb-5" />
            <h4 className="text-lg font-bold text-white font-outfit">Confiable</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Calidad, cumplimiento y acompañamiento para que tu idea llegue bien hecha.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
