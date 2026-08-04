import React from 'react';
import { LithophaneConfig, LithophaneShape } from '../../types';
import { Maximize2, Shield, Circle, Layers } from 'lucide-react';

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

  const resolutions: { id: 'standard' | 'hd' | 'ultra'; name: string; points: string; desc: string }[] = [
    {
      id: 'ultra',
      name: 'Ultra HD 4K Litho',
      points: '450 px (Recomendado)',
      desc: 'Máximo detalle micrométrico para retratos y rostros'
    },
    {
      id: 'hd',
      name: 'Alta Definición HD',
      points: '300 px',
      desc: 'Excelente nivel de detalle y renderizado fluido'
    },
    {
      id: 'standard',
      name: 'Estándar',
      points: '180 px',
      desc: 'Resolución ligera para previsualizaciones rápidas'
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
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
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

      {/* Resolution Selector Cards */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-violet-400" />
          <span>Resolución y Nivel de Detalle 3D</span>
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {resolutions.map((r) => {
            const isSelected = config.resolutionMode === r.id;
            return (
              <button
                key={r.id}
                onClick={() => onChange({ resolutionMode: r.id })}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-violet-500/10 border-violet-500 text-white shadow-lg shadow-violet-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-200">{r.name}</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold mb-1">{r.points}</span>
                <p className="text-[10px] text-slate-400 leading-tight">{r.desc}</p>
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

        {/* Width Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Ancho Total</span>
            <span className="text-cyan-400 font-mono font-bold">{config.width} mm</span>
          </div>
          <input
            type="range"
            min="80"
            max="250"
            step="5"
            value={config.width}
            onChange={(e) => onChange({ width: Number(e.target.value) })}
            className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
        </div>

        {/* Height Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Alto Total</span>
            <span className="text-cyan-400 font-mono font-bold">{config.height} mm</span>
          </div>
          <input
            type="range"
            min="60"
            max="200"
            step="5"
            value={config.height}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
            className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
        </div>

        {/* Curvature Arc Angle Slider (only if Arc shape) */}
        {config.shape === 'arc' && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Grados de Curvatura (Arco)</span>
              <span className="text-cyan-400 font-mono font-bold">{config.arcAngle}°</span>
            </div>
            <input
              type="range"
              min="20"
              max="120"
              step="5"
              value={config.arcAngle}
              onChange={(e) => onChange({ arcAngle: Number(e.target.value) })}
              className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Min & Max Thickness */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Grosor Mín.</span>
              <span className="text-emerald-400 font-mono font-bold">{config.minThickness} mm</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.5"
              step="0.1"
              value={config.minThickness}
              onChange={(e) => onChange({ minThickness: Number(e.target.value) })}
              className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Grosor Máx.</span>
              <span className="text-cyan-400 font-mono font-bold">{config.maxThickness} mm</span>
            </div>
            <input
              type="range"
              min="2.5"
              max="5.0"
              step="0.1"
              value={config.maxThickness}
              onChange={(e) => onChange({ maxThickness: Number(e.target.value) })}
              className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Frame Width */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" /> Ancho del Marco Protector
            </span>
            <span className="text-slate-300 font-mono font-bold">{config.frameWidth} mm</span>
          </div>
          <input
            type="range"
            min="0"
            max="8"
            step="1"
            value={config.frameWidth}
            onChange={(e) => onChange({ frameWidth: Number(e.target.value) })}
            className="w-full accent-slate-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
