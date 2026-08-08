import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold font-outfit">¿Cómo funciona Nebulab Studio?</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <h4 className="font-bold text-slate-200">Elige tu producto</h4>
              <p className="text-slate-400 mt-0.5">
                Desde el inicio puedes abrir el estudio de <strong>litofanías</strong>, <strong>collares para mascotas</strong> o <strong>clickers y llaveros</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <h4 className="font-bold text-slate-200">Sube tu imagen y personaliza</h4>
              <p className="text-slate-400 mt-0.5">
                Ajusta forma, colores, tamaños y textos. En el visor 3D: <strong>clic izquierdo</strong> rota, <strong>clic derecho</strong> desplaza y la <strong>rueda</strong> hace zoom.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <h4 className="font-bold text-slate-200">Pide o descarga tu archivo</h4>
              <p className="text-slate-400 mt-0.5">
                Agrega al carrito y paga en línea, o descarga el <strong>STL / 3MF</strong> listo para imprimir. Consulta el estado de tus pedidos desde tu cuenta.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
