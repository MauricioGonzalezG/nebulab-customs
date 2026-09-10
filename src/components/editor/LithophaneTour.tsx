import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronRight,
  CreditCard,
  Eye,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';

type StepAction = 'upload' | 'next' | 'finish';

interface TourStep {
  id: 'upload' | 'preview' | 'add' | 'buy';
  target: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta: string;
  action: StepAction;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'upload',
    target: '[data-tour="litho-upload"]',
    icon: Camera,
    title: 'Paso 1 · Sube tu foto',
    body: 'Toca la zona resaltada y elige la imagen que quieres convertir en litofanía. Puedes usar JPG, PNG o WEBP.',
    cta: 'Elegir foto',
    action: 'upload',
  },
  {
    id: 'preview',
    target: '[data-tour="litho-preview"]',
    icon: Eye,
    title: 'Paso 2 · Mira cómo queda en 3D',
    body: 'Esta es tu litofanía en tiempo real. Arrastra el mouse para girarla y usa la rueda para hacer zoom.',
    cta: 'Siguiente',
    action: 'next',
  },
  {
    id: 'add',
    target: '[data-tour="litho-add"]',
    icon: ShoppingCart,
    title: 'Paso 3 · Añádela al carrito',
    body: 'Toca "Añadir al Carrito" y tu diseño quedará guardado con el precio ya calculado.',
    cta: 'Siguiente',
    action: 'next',
  },
  {
    id: 'buy',
    target: '[data-tour="litho-buy"]',
    icon: CreditCard,
    title: 'Paso 4 · ¡Listo! Paga y recíbela',
    body: 'Pulsa "Comprar Ahora" para finalizar el pago en línea. También puedes pagar por WhatsApp.',
    cta: '¡Entendido!',
    action: 'finish',
  },
];

interface LithophaneTourProps {
  isOpen: boolean;
  userPickedImage: boolean;
  editorOpen: boolean;
  cartCount: number;
  onClose: () => void;
  onStepChange?: (stepId: TourStep['id']) => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  centerY: number;
}

const TOOLTIP_WIDTH = 360;
const TOOLTIP_HEIGHT_ESTIMATE = 230;
const HIGHLIGHT_PADDING = 8;

export const LithophaneTour: React.FC<LithophaneTourProps> = ({
  isOpen,
  userPickedImage,
  editorOpen,
  cartCount,
  onClose,
  onStepChange,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cartBaselineRef = useRef<number | null>(null);
  const step = TOUR_STEPS[stepIndex];

  // Reinicia el tour al abrirse
  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
      cartBaselineRef.current = null;
    }
  }, [isOpen]);

  // Avance automático: cuando el usuario ya subió/procesó su foto, pasa a la vista previa
  useEffect(() => {
    if (isOpen && stepIndex === 0 && userPickedImage) {
      setStepIndex(1);
    }
  }, [isOpen, stepIndex, userPickedImage]);

  // Avance automático: cuando añade el producto, pasa al paso de pago
  useEffect(() => {
    if (!isOpen) return;
    if (stepIndex === 2) {
      if (cartBaselineRef.current === null) cartBaselineRef.current = cartCount;
      else if (cartCount > cartBaselineRef.current) setStepIndex(3);
    }
  }, [isOpen, stepIndex, cartCount]);

  const notifyStep = useCallback(
    (id: TourStep['id']) => {
      onStepChange?.(id);
    },
    [onStepChange]
  );

  useEffect(() => {
    if (isOpen) notifyStep(step.id);
  }, [isOpen, step.id, notifyStep]);

  // Mide el elemento objetivo y lo centra en pantalla
  const measure = useCallback(
    (scroll: boolean) => {
      const el = document.querySelector(step.target);
      if (!el) {
        setRect(null);
        return;
      }
      if (scroll) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
      const update = () => {
        const r = el.getBoundingClientRect();
        setRect({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
          bottom: r.bottom,
          centerY: r.top + r.height / 2,
        });
      };
      update();
      window.setTimeout(update, 320);
      window.setTimeout(update, 700);
    },
    [step.target]
  );

  useEffect(() => {
    if (isOpen && !editorOpen) measure(true);
  }, [isOpen, editorOpen, measure]);

  useEffect(() => {
    if (!isOpen || editorOpen) return;
    const remeasure = () => measure(false);
    window.addEventListener('scroll', remeasure, true);
    window.addEventListener('resize', remeasure);
    return () => {
      window.removeEventListener('scroll', remeasure, true);
      window.removeEventListener('resize', remeasure);
    };
  }, [isOpen, editorOpen, measure]);

  if (!isOpen || editorOpen) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const halfWidth = Math.min(TOOLTIP_WIDTH / 2, (vw - 32) / 2);
  const clampedCenterX = rect
    ? Math.min(Math.max(rect.left + rect.width / 2, halfWidth + 16), vw - halfWidth - 16)
    : vw / 2;

  const placeBelow = !rect || rect.centerY <= vh / 2;
  const tooltipTop = rect
    ? placeBelow
      ? Math.min(rect.bottom + HIGHLIGHT_PADDING + 12, vh - TOOLTIP_HEIGHT_ESTIMATE)
      : Math.max(rect.top - HIGHLIGHT_PADDING - 12 - TOOLTIP_HEIGHT_ESTIMATE, 16)
    : vh / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;

  const handleAdvance = () => {
    if (step.action === 'finish') {
      onClose();
      return;
    }
    if (step.action === 'upload') {
      if (userPickedImage) setStepIndex(1);
      else window.dispatchEvent(new Event('nebulab:open-litho-upload'));
      return;
    }
    setStepIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
  };

  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[95]" aria-live="polite">
      {/* Resalte del elemento objetivo (los clics atraviesan el oscurecido) */}
      {rect ? (
        <div
          className="pointer-events-none fixed z-[96] rounded-2xl border-2 border-cyan-400/90 transition-all duration-300"
          style={{
            top: rect.top - HIGHLIGHT_PADDING,
            left: rect.left - HIGHLIGHT_PADDING,
            width: rect.width + HIGHLIGHT_PADDING * 2,
            height: rect.height + HIGHLIGHT_PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.82), 0 0 34px rgba(34, 211, 238, 0.5)',
          }}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 z-[96] bg-slate-950/82" />
      )}

      {/* Tarjeta guía */}
      <div
        className="fixed z-[97] w-[min(360px,calc(100vw-2rem))] rounded-3xl border border-cyan-500/40 bg-slate-900 p-5 shadow-2xl shadow-cyan-950/60 transition-all duration-300"
        style={{ top: tooltipTop, left: clampedCenterX, transform: 'translateX(-50%)' }}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-2.5 text-white shadow-lg shadow-cyan-500/20">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Paso {stepIndex + 1} de {TOUR_STEPS.length}
              </span>
            </div>
            <h3 className="mt-1 text-base font-extrabold text-white font-outfit">{step.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{step.body}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progreso */}
        <div className="mt-4 flex items-center gap-1.5">
          {TOUR_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? 'w-8 bg-gradient-to-r from-cyan-400 to-blue-500' : 'w-3 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-200"
          >
            Saltar
          </button>
          <button
            type="button"
            onClick={handleAdvance}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500 active:scale-95"
          >
            <span>{step.cta}</span>
            {step.action !== 'finish' && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
