import React, { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

interface NumberSliderControlProps {
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  color?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'slate';
  description?: string;
  onChange: (value: number) => void;
  className?: string;
}

export const NumberSliderControl: React.FC<NumberSliderControlProps> = ({
  label,
  icon: Icon,
  value,
  min,
  max,
  step = 1,
  unit = '',
  color = 'cyan',
  description,
  onChange,
  className = ''
}) => {
  const [localInput, setLocalInput] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalInput(String(value));
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalInput(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    let parsed = parseFloat(localInput);
    if (isNaN(parsed)) {
      parsed = value;
    } else {
      parsed = Math.max(min, Math.min(max, parsed));
      if (step && step >= 1) {
        parsed = Math.round(parsed);
      } else if (step) {
        const decimals = step.toString().split('.')[1]?.length || 1;
        parsed = parseFloat(parsed.toFixed(decimals));
      }
    }
    setLocalInput(String(parsed));
    onChange(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const colorStyles = {
    cyan: {
      accent: 'accent-cyan-500',
      text: 'text-cyan-400',
      borderFocus: 'focus:border-cyan-400 focus:ring-cyan-500/30',
      badgeBg: 'bg-cyan-950/50 border-cyan-500/30 text-cyan-300',
      iconText: 'text-cyan-400'
    },
    emerald: {
      accent: 'accent-emerald-500',
      text: 'text-emerald-400',
      borderFocus: 'focus:border-emerald-400 focus:ring-emerald-500/30',
      badgeBg: 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300',
      iconText: 'text-emerald-400'
    },
    amber: {
      accent: 'accent-amber-500',
      text: 'text-amber-400',
      borderFocus: 'focus:border-amber-400 focus:ring-amber-500/30',
      badgeBg: 'bg-amber-950/50 border-amber-500/30 text-amber-300',
      iconText: 'text-amber-400'
    },
    violet: {
      accent: 'accent-violet-500',
      text: 'text-violet-400',
      borderFocus: 'focus:border-violet-400 focus:ring-violet-500/30',
      badgeBg: 'bg-violet-950/50 border-violet-500/30 text-violet-300',
      iconText: 'text-violet-400'
    },
    slate: {
      accent: 'accent-slate-400',
      text: 'text-slate-300',
      borderFocus: 'focus:border-slate-400 focus:ring-slate-500/30',
      badgeBg: 'bg-slate-900 border-slate-700 text-slate-300',
      iconText: 'text-slate-400'
    }
  }[color];

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-300 font-medium flex items-center gap-1.5 truncate">
          {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${colorStyles.iconText}`} />}
          <span className="truncate">{label}</span>
        </span>

        {/* Direct numeric input badge */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative flex items-center">
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={localInput}
              onFocus={() => setIsFocused(true)}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              aria-label={label}
              className={`w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs bg-slate-950/90 border border-slate-700/80 rounded-md text-white transition-all outline-none focus:ring-2 ${colorStyles.borderFocus} shadow-inner hover:border-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
          </div>
          {unit && (
            <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${colorStyles.badgeBg}`}>
              {unit}
            </span>
          )}
        </div>
      </div>

      {description && (
        <p className="text-[11px] text-slate-400 leading-tight">{description}</p>
      )}

      {/* Synchronized Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const num = Number(e.target.value);
          setLocalInput(String(num));
          onChange(num);
        }}
        aria-label={label}
        className={`w-full ${colorStyles.accent} bg-slate-800 h-2 rounded-lg cursor-pointer transition-all hover:bg-slate-700/80`}
      />
    </div>
  );
};
