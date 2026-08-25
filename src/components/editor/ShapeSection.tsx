import React from 'react';
import { LithophaneConfig, LithophaneShape } from '../../types';
import { Maximize2, Shield, Circle, Layers, Compass } from 'lucide-react';
import { NumberSliderControl } from './NumberSliderControl';

interface ShapeSectionProps {
  config: LithophaneConfig;
  onChange: (updates: Partial<LithophaneConfig>) => void;
}

export const ShapeSection: React.FC<ShapeSectionProps> = ({ config, onChange }) => {
  const shapes: { id: LithophaneShape; name: string; desc: string; icon: any }[] = [
    {
      id: 'arc',
      name: 'Curvada / Arco',
      desc: 'Forma semicircular ideal para lámparas de noche (Referencia)',
      icon: Circle
    },
    {
      id: 'flat',
      name: 'Plana Rectangular',
      desc: 'Formato clásico de retrato plano con soporte de escritorio',
      icon: Layers
    },
    {
      id: 'cylinder',
      name: 'Cilíndrica 360°',
      desc: 'Lámpara circular completa de 360 grados',
      icon: Circle
    }
  ];

  return (
    <div className="space-y-6">
      {/* Shape Selector Cards */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Forma de la Litofanía</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {shapes.map((s) => {
            const Icon = s.icon;
            const isSelected = config.shape === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onChange({ shape: s.id })}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${isSelected
                    ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-200">{s.name}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dimensions Controls */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800/80 space-y-5">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-cyan-400" />
          <span>Dimensiones y Espesores (mm)</span>
        </h3>

        {/* Width Control */}
        <NumberSliderControl
          label="Ancho Total"
          value={config.width}
          min={80}
          max={200}
          step={5}
          unit="mm"
          color="cyan"
          description="Máximo 200 mm para impresión"
          onChange={(width) => onChange({ width })}
        />

        {/* Height Control */}
        <NumberSliderControl
          label="Alto Total"
          value={config.height}
          min={80}
          max={200}
          step={5}
          unit="mm"
          color="cyan"
          description="Máximo 200 mm para impresión"
          onChange={(height) => onChange({ height })}
        />

        {/* Curvature Arc Angle Slider (only if Arc shape) */}
        {config.shape === 'arc' && (
          <div className="pt-2 border-t border-slate-800">
            <NumberSliderControl
              label="Grados de Curvatura (Arco)"
              icon={Compass}
              value={config.arcAngle}
              min={20}
              max={120}
              step={5}
              unit="°"
              color="cyan"
              onChange={(arcAngle) => onChange({ arcAngle })}
            />
          </div>
        )}

        {/* Min & Max Thickness */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <NumberSliderControl
            label="Grosor Mínimo"
            value={config.minThickness}
            min={0.6}
            max={1.5}
            step={0.1}
            unit="mm"
            color="emerald"
            onChange={(minThickness) => onChange({ minThickness })}
          />

          <NumberSliderControl
            label="Grosor Máximo"
            value={config.maxThickness}
            min={1.2}
            max={4.0}
            step={0.1}
            unit="mm"
            color="cyan"
            onChange={(maxThickness) => onChange({ maxThickness })}
          />
        </div>

        {/* Frame Width & Thickness Controls */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <NumberSliderControl
            label="Ancho del Borde del Marco"
            icon={Shield}
            value={config.frameWidth}
            min={0}
            max={8}
            step={0.5}
            unit="mm"
            color="slate"
            onChange={(frameWidth) => onChange({ frameWidth })}
          />

          <NumberSliderControl
            label="Grosor / Profundidad Z del Marco"
            icon={Shield}
            value={config.frameThickness ?? 5}
            min={2}
            max={12}
            step={0.5}
            unit="mm"
            color="cyan"
            onChange={(frameThickness) => onChange({ frameThickness })}
          />
        </div>
      </div>
    </div>
  );
};
