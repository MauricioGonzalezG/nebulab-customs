import React from 'react';
import { BaseType, LithophaneConfig, MaterialType } from '../../types';
import { Lightbulb, Box, Palette, Zap, Sparkles } from 'lucide-react';

interface BaseSectionProps {
  config: LithophaneConfig;
  onChange: (updates: Partial<LithophaneConfig>) => void;
}

export const BaseSection: React.FC<BaseSectionProps> = ({ config, onChange }) => {
  const bases: { id: BaseType; name: string; price: number; desc: string }[] = [
    {
      id: 'night-light',
      name: 'Luz de Noche LED (Socket)',
      price: 8.50,
      desc: 'Soporte con conector directo a enchufe de pared (Como en la foto de referencia)'
    },
    {
      id: 'led-wooden-base',
      name: 'Base de Madera LED RGB',
      price: 14.00,
      desc: 'Base elegante de madera natural con iluminación LED USB recargable'
    },
    {
      id: 'flat-stand',
      name: 'Soporte de Escritorio',
      price: 4.00,
      desc: 'Patas de plástico para exhibir en mesas o repisas'
    },
    {
      id: 'none',
      name: 'Sin Base (Solo Litofanía)',
      price: 0,
      desc: 'Solo el panel 3D para colgar o instalar por tu cuenta'
    }
  ];

  const materials: { id: MaterialType; name: string; color: string; desc: string }[] = [
    {
      id: 'white-pla',
      name: 'Blanco Ártico PLA',
      color: '#ffffff',
      desc: 'Recomendado. Mayor nitidez y paso de luz uniforme.'
    },
    {
      id: 'warm-ivory',
      name: 'Marfil Cálido',
      color: '#fff8e7',
      desc: 'Tono marfil suave con estética retro vintage.'
    },
    {
      id: 'marble',
      name: 'Efecto Mármol',
      color: '#e2e8f0',
      desc: 'Acabado texturizado con microveteado elegante.'
    },
    {
      id: 'glow-blue',
      name: 'Celeste Lumínico',
      color: '#bae6fd',
      desc: 'Pigmento fluorescente reactivo a la luz.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Base Type Selector */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Box className="w-4 h-4 text-cyan-400" />
          <span>Soporte y Base de Iluminación</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bases.map((b) => {
            const isSelected = config.baseType === b.id;
            return (
              <button
                key={b.id}
                onClick={() => onChange({ baseType: b.id })}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-100">{b.name}</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {b.price === 0 ? 'Incluido' : `+$${b.price.toFixed(2)}`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{b.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Puck Socket Parametrization (Shown when Night Light LED option selected) */}
      {config.baseType === 'night-light' && (
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-cyan-500/30 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <Box className="w-4 h-4 text-cyan-400" />
            <span>Parametrización del Socket LED Puck (Lámpara)</span>
          </h3>

          {/* Puck Diameter */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Diámetro del Vaso Puck</span>
              <span className="text-cyan-400 font-mono font-bold">{config.puckDiameter || 60} mm</span>
            </div>
            <input
              type="range"
              min="48"
              max="80"
              step="1"
              value={config.puckDiameter || 60}
              onChange={(e) => onChange({ puckDiameter: Number(e.target.value) })}
              className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Puck Depth */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Profundidad del Vaso</span>
              <span className="text-cyan-400 font-mono font-bold">{config.puckDepth || 26} mm</span>
            </div>
            <input
              type="range"
              min="15"
              max="40"
              step="1"
              value={config.puckDepth || 26}
              onChange={(e) => onChange({ puckDepth: Number(e.target.value) })}
              className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Puck Angle */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Ángulo de Inclinación</span>
              <span className="text-cyan-400 font-mono font-bold">{config.puckAngle || 45}°</span>
            </div>
            <input
              type="range"
              min="30"
              max="70"
              step="5"
              value={config.puckAngle || 45}
              onChange={(e) => onChange({ puckAngle: Number(e.target.value) })}
              className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Strut Count Selection */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-300 block">Número de Brazos de Soporte</span>
            <div className="grid grid-cols-2 gap-2">
              {[3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => onChange({ strutCount: count })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    (config.strutCount || 4) === count
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {count} Brazos (Como en CAD)
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Material Selection */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Palette className="w-4 h-4 text-violet-400" />
          <span>Material de Impresión 3D</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          {materials.map((m) => {
            const isSelected = config.material === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onChange({ material: m.id })}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-violet-500/10 border-violet-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full border border-slate-600 shrink-0 mt-0.5 shadow-sm"
                  style={{ backgroundColor: m.color }}
                />
                <div>
                  <div className="text-xs font-bold text-slate-200">{m.name}</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Light Simulation Controls */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800/80 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Simulación de Luz LED</span>
          </h3>
          <button
            onClick={() => onChange({ enableLight: !config.enableLight })}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              config.enableLight
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {config.enableLight ? 'Luz ON' : 'Luz OFF'}
          </button>
        </div>

        {config.enableLight && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            {/* Light Warmth */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Temperatura de Luz
                </span>
                <span className="text-amber-400 font-mono text-[11px]">
                  {config.lightWarmth < 30 ? 'Blanco Frío (6500K)' : config.lightWarmth < 70 ? 'Neutro (4000K)' : 'Cálido Ámbar (2700K)'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.lightWarmth}
                onChange={(e) => onChange({ lightWarmth: Number(e.target.value) })}
                className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Light Intensity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" /> Intensidad Lumínica
                </span>
                <span className="text-cyan-400 font-mono text-[11px]">{config.lightIntensity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={config.lightIntensity}
                onChange={(e) => onChange({ lightIntensity: Number(e.target.value) })}
                className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
