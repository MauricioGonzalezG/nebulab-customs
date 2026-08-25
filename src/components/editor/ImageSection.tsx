import React, { useState, useRef } from 'react';
import { LithophaneConfig } from '../../types';
import { Upload, Image as ImageIcon, Sliders, RefreshCw, Sun, Contrast, ArrowLeftRight, Sparkles, X } from 'lucide-react';
import { NumberSliderControl } from './NumberSliderControl';
import { ImageEditorModal } from './ImageEditorModal';

import { calculateLithophaneDimensions } from '../../core/imageProcessor';

interface ImageSectionProps {
  config: LithophaneConfig;
  onChange: (updates: Partial<LithophaneConfig>) => void;
  onImageLoaded: (imgElement: HTMLImageElement) => void;
}

export const LITHOPHANE_SAMPLE_IMAGES = [
  {
    id: 'portrait',
    name: 'Pareja / Retrato',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'dog',
    name: 'Mascota / Perro',
    url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'landscape',
    name: 'Paisaje / Montañas',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80'
  }
] as const;

export const ImageSection: React.FC<ImageSectionProps> = ({
  config,
  onChange,
  onImageLoaded
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editorSourceUrl, setEditorSourceUrl] = useState<string>('');

  const [showUploadHint, setShowUploadHint] = useState(() => {
    try {
      return window.localStorage.getItem('nebulab_lithophane_upload_hint_seen') !== 'true';
    } catch {
      return true;
    }
  });

  const dismissUploadHint = () => {
    setShowUploadHint(false);
    try {
      window.localStorage.setItem('nebulab_lithophane_upload_hint_seen', 'true');
    } catch {
      // Ignore storage restrictions; the hint can still be dismissed for this visit.
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      dismissUploadHint();
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        // Open interactive preparation editor with the uploaded photo
        setEditorSourceUrl(url);
        setIsEditorModalOpen(true);
      };
      reader.readAsDataURL(file);
      // Reset input value so same file can be re-selected if desired
      e.target.value = '';
    }
  };

  const handleLoadSample = (sampleId: string, sampleUrl: string) => {
    dismissUploadHint();
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const { width, height } = calculateLithophaneDimensions(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        100
      );
      onChange({ imageUrl: sampleUrl, sampleId, width, height });
      onImageLoaded(img);
    };
    img.src = sampleUrl;
  };

  const handleEditorApply = (processedDataUrl: string, imgElement: HTMLImageElement) => {
    const { width, height } = calculateLithophaneDimensions(
      imgElement.naturalWidth || imgElement.width,
      imgElement.naturalHeight || imgElement.height,
      100
    );
    onChange({ imageUrl: processedDataUrl, sampleId: undefined, width, height });
    onImageLoaded(imgElement);
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Upload className="w-4 h-4 text-cyan-400" />
          <span>Fotografía para la Litofanía</span>
        </label>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500/80 bg-slate-900/60 hover:bg-slate-900 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 group shadow-inner"
        >
          {showUploadHint && (
            <div
              className="absolute z-20 -top-3 right-3 w-[min(250px,calc(100%-1.5rem))] rounded-xl border border-violet-400/60 bg-slate-950 px-3.5 py-3 text-left shadow-2xl shadow-violet-950/40"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 border-b border-r border-violet-400/60 bg-slate-950" />
              <div className="relative flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                <div className="pr-4">
                  <p className="text-xs font-bold text-white">Empieza aquí</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                    Haz clic en esta zona para cargar tu propia foto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismissUploadHint}
                  className="absolute -right-1 -top-1 rounded-md p-1 text-slate-500 hover:text-white"
                  aria-label="Cerrar indicación"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-cyan-500/10 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300">
                Haz clic para subir tu foto o arrástrala aquí
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos recomendados: JPG, PNG o WEBP (Paso previo de recorte incluido)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Samples */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          O prueba con una foto de muestra:
        </span>
        <div className="grid grid-cols-3 gap-2">
          {LITHOPHANE_SAMPLE_IMAGES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleLoadSample(sample.id, sample.url)}
              className={`group relative h-16 rounded-xl overflow-hidden border transition-all text-left ${config.sampleId === sample.id
                ? 'border-violet-400 ring-1 ring-violet-400/50'
                : 'border-slate-800 hover:border-cyan-500'
                }`}
            >
              <img
                src={sample.url}
                alt={sample.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-1.5">
                <span className="text-[10px] font-medium text-slate-200 truncate">
                  {sample.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Image Adjustments */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800/80 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-400" />
            <span>Ajustes Finos de Relieve 3D</span>
          </h3>
          <button
            onClick={() => onChange({ brightness: 0, contrast: 20, invert: false })}
            className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Restablecer</span>
          </button>
        </div>

        {/* Brightness Control */}
        <NumberSliderControl
          label="Brillo"
          icon={Sun}
          value={config.brightness}
          min={-100}
          max={100}
          step={1}
          color="amber"
          onChange={(brightness) => onChange({ brightness })}
        />

        {/* Contrast Control */}
        <NumberSliderControl
          label="Contraste"
          icon={Contrast}
          value={config.contrast}
          min={-100}
          max={100}
          step={1}
          color="violet"
          onChange={(contrast) => onChange({ contrast })}
        />

        {/* Invert Color Switch */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div>
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" /> Invertir Relieve
            </span>
            <p className="text-[11px] text-slate-400">
              {config.invert
                ? 'Áreas claras más gruesas (Negativo)'
                : 'Áreas oscuras más gruesas (Recomendado estándar)'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ invert: !config.invert })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.invert ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.invert ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>
      </div>

      {/* Image Preparation Modal */}
      <ImageEditorModal
        isOpen={isEditorModalOpen}
        imageSrc={editorSourceUrl}
        onClose={() => setIsEditorModalOpen(false)}
        onApply={handleEditorApply}
      />
    </div>
  );
};

