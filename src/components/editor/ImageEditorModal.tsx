import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  ZoomIn, 
  ZoomOut, 
  Crop, 
  Wand2, 
  Sliders, 
  Sun, 
  Contrast, 
  Sparkles, 
  RefreshCw, 
  Check, 
  Maximize2
} from 'lucide-react';
import { NumberSliderControl } from './NumberSliderControl';

interface ImageEditorModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onApply: (processedDataUrl: string, imgElement: HTMLImageElement) => void;
}

type AspectRatio = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | 'original';
type ActiveTab = 'crop' | 'bg' | 'adjust';
type BgMode = 'transparent' | 'white' | 'original';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onApply
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('crop');
  const [rawImage, setRawImage] = useState<HTMLImageElement | null>(null);

  // Transform & Crop state
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('original');
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);

  // Crop Box rect in normalized coords (0 to 1)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0.05,
    y: 0.05,
    w: 0.9,
    h: 0.9
  });

  // Background Removal state (Default: transparent as requested)
  const [removeBg, setRemoveBg] = useState<boolean>(false);
  const [bgTolerance, setBgTolerance] = useState<number>(45); // 10 to 100
  const [bgMode, setBgMode] = useState<BgMode>('transparent'); // 'transparent' | 'white' | 'original'

  // Image Adjustments
  const [brightness, setBrightness] = useState<number>(0); // -100 to 100
  const [contrast, setContrast] = useState<number>(15); // -100 to 100
  const [grayscale, setGrayscale] = useState<boolean>(true); // lithophanes work best in B&W
  const [sharpen, setSharpen] = useState<number>(20); // 0 to 100
  const [invert, setInvert] = useState<boolean>(false);

  // Canvas refs
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const cleanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging state for crop box & pan
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragAction, setDragAction] = useState<'pan' | 'crop-move' | 'crop-handle' | null>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 1, h: 1 });

  // Load source image
  useEffect(() => {
    if (!imageSrc || !isOpen) return;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      setRawImage(img);
      
      // Calculate initial crop box matching original image aspect ratio
      const imgW = img.naturalWidth || 600;
      const imgH = img.naturalHeight || 600;
      const targetRatio = imgW / imgH;
      let w = 0.85;
      let h = w / targetRatio;
      if (h > 0.85) {
        h = 0.85;
        w = h * targetRatio;
      }
      const x = Math.max(0.02, (1 - w) / 2);
      const y = Math.max(0.02, (1 - h) / 2);

      // Reset defaults with transparent background and original aspect ratio
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setRotation(0);
      setFlipH(false);
      setCropBox({ x, y, w, h });
      setRemoveBg(false);
      setBgTolerance(45);
      setBgMode('transparent');
      setBrightness(0);
      setContrast(15);
      setGrayscale(true);
      setSharpen(20);
      setInvert(false);
      setAspectRatio('original');
      setActiveTab('crop');
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Adjust crop box when aspect ratio changes
  const applyAspectRatio = useCallback((ratio: AspectRatio) => {
    setAspectRatio(ratio);
    if (!rawImage) return;

    if (ratio === 'free') {
      setCropBox({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
      return;
    }

    let targetRatio = 1;
    if (ratio === '1:1') targetRatio = 1;
    else if (ratio === '4:3') targetRatio = 4 / 3;
    else if (ratio === '3:4') targetRatio = 3 / 4;
    else if (ratio === '16:9') targetRatio = 16 / 9;
    else if (ratio === 'original') targetRatio = rawImage.naturalWidth / rawImage.naturalHeight;

    // Adapt to box within [0.05, 0.05, 0.9, 0.9]
    let w = 0.85;
    let h = w / targetRatio;
    if (h > 0.85) {
      h = 0.85;
      w = h * targetRatio;
    }
    const x = Math.max(0.02, (1 - w) / 2);
    const y = Math.max(0.02, (1 - h) / 2);
    setCropBox({ x, y, w, h });
  }, [rawImage]);

  // Render clean image (for export) and preview image (with crop handles/grid)
  const renderPreview = useCallback(() => {
    if (!rawImage) return;

    const renderW = 800;
    const renderH = 800;

    // 1. Create or get clean offscreen canvas (NO HANDLES, NO CROP MARKS)
    let cleanCanvas = cleanCanvasRef.current;
    if (!cleanCanvas) {
      cleanCanvas = document.createElement('canvas');
      cleanCanvasRef.current = cleanCanvas;
    }
    cleanCanvas.width = renderW;
    cleanCanvas.height = renderH;
    const cleanCtx = cleanCanvas.getContext('2d', { willReadFrequently: true });
    if (!cleanCtx) return;

    cleanCtx.clearRect(0, 0, renderW, renderH);

    // Save context for transform (Zoom, Pan, Rotate, Flip)
    cleanCtx.save();
    cleanCtx.translate(renderW / 2 + (panX * (renderW / 600)), renderH / 2 + (panY * (renderH / 600)));
    cleanCtx.scale(zoom, zoom);

    if (flipH) {
      cleanCtx.scale(-1, 1);
    }
    if (rotation !== 0) {
      cleanCtx.rotate((rotation * Math.PI) / 180);
    }

    const imgW = rawImage.naturalWidth || 600;
    const imgH = rawImage.naturalHeight || 600;
    const aspect = imgW / imgH;

    let drawW = renderW * 0.85;
    let drawH = drawW / aspect;
    if (drawH > renderH * 0.85) {
      drawH = renderH * 0.85;
      drawW = drawH * aspect;
    }

    // Temporary canvas for color & background operations
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.max(100, Math.round(drawW));
    tempCanvas.height = Math.max(100, Math.round(drawH));
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    if (tempCtx) {
      tempCtx.drawImage(rawImage, 0, 0, tempCanvas.width, tempCanvas.height);
      const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imgData.data;

      // 1. Background removal algorithm
      if (removeBg) {
        // Sample corners to find background dominant color
        const cornerIndices = [
          0,
          (tempCanvas.width - 1) * 4,
          ((tempCanvas.height - 1) * tempCanvas.width) * 4,
          ((tempCanvas.height - 1) * tempCanvas.width + (tempCanvas.width - 1)) * 4
        ];
        let bgR = 0, bgG = 0, bgB = 0, cCount = 0;
        for (const idx of cornerIndices) {
          if (data[idx + 3] > 50) {
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
            cCount++;
          }
        }
        if (cCount > 0) {
          bgR = Math.round(bgR / cCount);
          bgG = Math.round(bgG / cCount);
          bgB = Math.round(bgB / cCount);

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 30) continue;

            const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
            if (dist < bgTolerance) {
              if (bgMode === 'transparent') {
                data[i + 3] = 0; // Pure transparent
              } else if (bgMode === 'white') {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 255;
              }
            }
          }
        }
      }

      // 2. Brightness & Contrast & Grayscale adjustments
      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const brightOffset = brightness * 2.55;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;

        let r = data[i] + brightOffset;
        let g = data[i + 1] + brightOffset;
        let b = data[i + 2] + brightOffset;

        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        r = Math.min(255, Math.max(0, r));
        g = Math.min(255, Math.max(0, g));
        b = Math.min(255, Math.max(0, b));

        if (grayscale) {
          // Standard ITU-R BT.601 luminance
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          if (invert) {
            gray = 255 - gray;
          }
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        } else {
          if (invert) {
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
          }
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }

      // 3. Sharpening Filter
      if (sharpen > 0 && tempCanvas.width > 2 && tempCanvas.height > 2) {
        const weight = (sharpen / 100) * 0.6;
        const copy = new Uint8ClampedArray(data);
        const w = tempCanvas.width;
        const h = tempCanvas.height;

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            if (copy[idx + 3] === 0) continue;

            const top = ((y - 1) * w + x) * 4;
            const bottom = ((y + 1) * w + x) * 4;
            const left = (y * w + (x - 1)) * 4;
            const right = (y * w + (x + 1)) * 4;

            for (let c = 0; c < 3; c++) {
              const val = copy[idx + c] * (1 + 4 * weight) - (copy[top + c] + copy[bottom + c] + copy[left + c] + copy[right + c]) * weight;
              data[idx + c] = Math.min(255, Math.max(0, val));
            }
          }
        }
      }

      tempCtx.putImageData(imgData, 0, 0);
      cleanCtx.drawImage(tempCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    }

    cleanCtx.restore();

    // 2. Render to visible previewCanvas (with checkerboard background + crop handles)
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
    if (!previewCtx) return;

    const displayW = 600;
    const displayH = 600;
    previewCanvas.width = displayW;
    previewCanvas.height = displayH;

    previewCtx.clearRect(0, 0, displayW, displayH);

    // Draw background (checkerboard if transparent, dark otherwise)
    if (removeBg && bgMode === 'transparent') {
      const checkSize = 16;
      for (let cy = 0; cy < displayH; cy += checkSize) {
        for (let cx = 0; cx < displayW; cx += checkSize) {
          previewCtx.fillStyle = ((cx / checkSize + cy / checkSize) % 2 === 0) ? '#1e293b' : '#0f172a';
          previewCtx.fillRect(cx, cy, checkSize, checkSize);
        }
      }
    } else {
      previewCtx.fillStyle = '#0f172a';
      previewCtx.fillRect(0, 0, displayW, displayH);
    }

    // Draw clean image onto preview canvas
    previewCtx.drawImage(cleanCanvas, 0, 0, displayW, displayH);

    // 3. Draw Crop Overlay ONLY on previewCanvas (Never drawn onto cleanCanvas)
    const cbX = cropBox.x * displayW;
    const cbY = cropBox.y * displayH;
    const cbW = cropBox.w * displayW;
    const cbH = cropBox.h * displayH;

    // Darkened outside mask
    previewCtx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    previewCtx.beginPath();
    previewCtx.rect(0, 0, displayW, displayH);
    previewCtx.rect(cbX + cbW, cbY, -cbW, cbH); // hole counter-clockwise
    previewCtx.fill();

    // Bright border
    previewCtx.strokeStyle = '#06b6d4';
    previewCtx.lineWidth = 2;
    previewCtx.strokeRect(cbX, cbY, cbW, cbH);

    // Rule of thirds grid lines
    previewCtx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    previewCtx.lineWidth = 1;
    previewCtx.setLineDash([4, 4]);

    // Horizontal lines
    previewCtx.beginPath();
    previewCtx.moveTo(cbX, cbY + cbH / 3);
    previewCtx.lineTo(cbX + cbW, cbY + cbH / 3);
    previewCtx.moveTo(cbX, cbY + (cbH * 2) / 3);
    previewCtx.lineTo(cbX + cbW, cbY + (cbH * 2) / 3);
    // Vertical lines
    previewCtx.moveTo(cbX + cbW / 3, cbY);
    previewCtx.lineTo(cbX + cbW / 3, cbY + cbH);
    previewCtx.moveTo(cbX + (cbW * 2) / 3, cbY);
    previewCtx.lineTo(cbX + (cbW * 2) / 3, cbY + cbH);
    previewCtx.stroke();
    previewCtx.setLineDash([]);

    // Corner Handles
    const handleSize = 14;
    previewCtx.fillStyle = '#ffffff';
    previewCtx.strokeStyle = '#0891b2';
    previewCtx.lineWidth = 2;

    const corners = [
      { x: cbX, y: cbY },
      { x: cbX + cbW, y: cbY },
      { x: cbX, y: cbY + cbH },
      { x: cbX + cbW, y: cbY + cbH },
      { x: cbX + cbW / 2, y: cbY },
      { x: cbX + cbW / 2, y: cbY + cbH },
      { x: cbX, y: cbY + cbH / 2 },
      { x: cbX + cbW, y: cbY + cbH / 2 }
    ];

    for (const c of corners) {
      previewCtx.beginPath();
      previewCtx.arc(c.x, c.y, handleSize / 2, 0, Math.PI * 2);
      previewCtx.fill();
      previewCtx.stroke();
    }
  }, [
    rawImage,
    zoom,
    panX,
    panY,
    rotation,
    flipH,
    cropBox,
    removeBg,
    bgTolerance,
    bgMode,
    brightness,
    contrast,
    grayscale,
    sharpen,
    invert
  ]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Mouse / Touch handlers for Crop Box and Panning
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasCoords(e);
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const cbX = cropBox.x * canvas.width;
    const cbY = cropBox.y * canvas.height;
    const cbW = cropBox.w * canvas.width;
    const cbH = cropBox.h * canvas.height;
    const tol = 24;

    // Check corner handles
    if (Math.hypot(x - cbX, y - cbY) < tol) {
      setIsDragging(true);
      setDragAction('crop-handle');
      setActiveHandle('tl');
    } else if (Math.hypot(x - (cbX + cbW), y - cbY) < tol) {
      setIsDragging(true);
      setDragAction('crop-handle');
      setActiveHandle('tr');
    } else if (Math.hypot(x - cbX, y - (cbY + cbH)) < tol) {
      setIsDragging(true);
      setDragAction('crop-handle');
      setActiveHandle('bl');
    } else if (Math.hypot(x - (cbX + cbW), y - (cbY + cbH)) < tol) {
      setIsDragging(true);
      setDragAction('crop-handle');
      setActiveHandle('br');
    } else if (x >= cbX && x <= cbX + cbW && y >= cbY && y <= cbY + cbH) {
      // Inside crop box -> move crop box
      setIsDragging(true);
      setDragAction('crop-move');
    } else {
      // Outside -> pan image
      setIsDragging(true);
      setDragAction('pan');
    }

    setDragStart({ x, y });
    setCropStart({ ...cropBox });
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const { x, y } = getCanvasCoords(e);
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const dxNorm = (x - dragStart.x) / canvas.width;
    const dyNorm = (y - dragStart.y) / canvas.height;

    if (dragAction === 'pan') {
      setPanX((prev) => prev + (x - dragStart.x));
      setPanY((prev) => prev + (y - dragStart.y));
      setDragStart({ x, y });
    } else if (dragAction === 'crop-move') {
      let newX = cropStart.x + dxNorm;
      let newY = cropStart.y + dyNorm;
      newX = Math.max(0, Math.min(1 - cropStart.w, newX));
      newY = Math.max(0, Math.min(1 - cropStart.h, newY));
      setCropBox({ ...cropStart, x: newX, y: newY });
    } else if (dragAction === 'crop-handle' && activeHandle) {
      let { x: cx, y: cy, w: cw, h: ch } = cropStart;

      if (activeHandle === 'br') {
        cw = Math.max(0.1, Math.min(1 - cx, cropStart.w + dxNorm));
        ch = Math.max(0.1, Math.min(1 - cy, cropStart.h + dyNorm));
      } else if (activeHandle === 'tl') {
        const nextX = Math.max(0, Math.min(cropStart.x + cropStart.w - 0.1, cropStart.x + dxNorm));
        const nextY = Math.max(0, Math.min(cropStart.y + cropStart.h - 0.1, cropStart.y + dyNorm));
        cw = cropStart.w + (cropStart.x - nextX);
        ch = cropStart.h + (cropStart.y - nextY);
        cx = nextX;
        cy = nextY;
      } else if (activeHandle === 'tr') {
        const nextY = Math.max(0, Math.min(cropStart.y + cropStart.h - 0.1, cropStart.y + dyNorm));
        cw = Math.max(0.1, Math.min(1 - cx, cropStart.w + dxNorm));
        ch = cropStart.h + (cropStart.y - nextY);
        cy = nextY;
      } else if (activeHandle === 'bl') {
        const nextX = Math.max(0, Math.min(cropStart.x + cropStart.w - 0.1, cropStart.x + dxNorm));
        cw = cropStart.w + (cropStart.x - nextX);
        ch = Math.max(0.1, Math.min(1 - cy, cropStart.h + dyNorm));
        cx = nextX;
      }

      // Maintain aspect ratio if not free
      if (aspectRatio !== 'free') {
        let targetRatio = 1;
        if (aspectRatio === '1:1') targetRatio = 1;
        else if (aspectRatio === '4:3') targetRatio = 4 / 3;
        else if (aspectRatio === '3:4') targetRatio = 3 / 4;
        else if (aspectRatio === '16:9') targetRatio = 16 / 9;
        else if (aspectRatio === 'original' && rawImage) {
          targetRatio = rawImage.naturalWidth / rawImage.naturalHeight;
        }
        ch = cw / targetRatio;
      }

      setCropBox({ x: cx, y: cy, w: cw, h: ch });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragAction(null);
    setActiveHandle(null);
  };

  // Final export and apply to lithophane (CRITICAL: Exports from cleanCanvas WITHOUT ANY CROP MARKS)
  const handleApply = () => {
    const cleanCanvas = cleanCanvasRef.current;
    if (!cleanCanvas || !rawImage) return;

    // Read crop box bounds relative to cleanCanvas dimensions
    const cbX = Math.round(cropBox.x * cleanCanvas.width);
    const cbY = Math.round(cropBox.y * cleanCanvas.height);
    const cbW = Math.round(cropBox.w * cleanCanvas.width);
    const cbH = Math.round(cropBox.h * cleanCanvas.height);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.max(100, cbW);
    exportCanvas.height = Math.max(100, cbH);
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // Draw ONLY from cleanCanvas -> 100% clean of crop handles, borders, or marks!
    exportCtx.drawImage(
      cleanCanvas,
      cbX,
      cbY,
      cbW,
      cbH,
      0,
      0,
      exportCanvas.width,
      exportCanvas.height
    );

    // If background was removed and transparent mode is active, export as PNG
    const isPng = removeBg && bgMode === 'transparent';
    const finalDataUrl = isPng
      ? exportCanvas.toDataURL('image/png')
      : exportCanvas.toDataURL('image/jpeg', 0.95);

    const finalImg = new Image();
    finalImg.crossOrigin = 'Anonymous';
    finalImg.onload = () => {
      onApply(finalDataUrl, finalImg);
      onClose();
    };
    finalImg.src = finalDataUrl;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overscroll-contain">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[95vh] focus:outline-none">

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-outfit text-white">
                Preparar Fotografía para Litofanía
              </h3>
              <p className="text-xs text-slate-400">
                Recorta, aísla el fondo y ajusta el contraste para el mejor relieve 3D.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto">

          {/* Left Canvas Viewport */}
          <div 
            ref={containerRef}
            className="lg:col-span-7 bg-slate-950 p-4 sm:p-6 flex flex-col items-center justify-center relative select-none border-b lg:border-b-0 lg:border-r border-slate-800/80 min-h-[320px] sm:min-h-[420px]"
          >
            <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900/60">
              <canvas
                ref={previewCanvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                className="w-full h-full object-contain cursor-crosshair touch-none"
              />
            </div>

            {/* Canvas Quick Controls Pill */}
            <div className="flex items-center gap-1.5 mt-3 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs shadow-lg">
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                title="Girar 90° Antihorario"
                className="p-2 rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Girar 90° Horario"
                className="p-2 rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setFlipH(!flipH)}
                title="Espejo Horizontal"
                className={`p-2 rounded-xl transition-colors ${
                  flipH ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800'
                }`}
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-5 bg-slate-800 mx-1" />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(1))))}
                title="Alejar Zoom"
                className="p-2 rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] font-bold text-cyan-400 px-1">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.2).toFixed(1))))}
                title="Acercar Zoom"
                className="p-2 rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Tools & Adjustments Panel */}
          <div className="lg:col-span-5 p-4 sm:p-6 space-y-5 overflow-y-auto">

            {/* Navigation Tabs */}
            <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'crop'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>1. Encuadre</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bg')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'bg'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>2. Fondo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('adjust')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'adjust'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>3. Relieve</span>
              </button>
            </div>

            {/* TAB 1: CROP & ASPECT RATIO */}
            {activeTab === 'crop' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Proporción de Recorte:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'original', label: 'Original ⭐' },
                      { id: 'free', label: 'Libre' },
                      { id: '1:1', label: '1:1 Cuadrado' },
                      { id: '4:3', label: '4:3 Horizontal' },
                      { id: '3:4', label: '3:4 Vertical' },
                      { id: '16:9', label: '16:9 Cine' }
                    ].map((asp) => (
                      <button
                        key={asp.id}
                        type="button"
                        onClick={() => applyAspectRatio(asp.id as AspectRatio)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                          aspectRatio === asp.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {asp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom & Pan Sliders */}
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-4">
                  <NumberSliderControl
                    label="Nivel de Zoom"
                    value={Math.round(zoom * 100)}
                    min={50}
                    max={300}
                    step={5}
                    unit="%"
                    color="cyan"
                    onChange={(z) => setZoom(z / 100)}
                  />

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span>Arrastra sobre la imagen para moverla</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPanX(0);
                        setPanY(0);
                        setZoom(1);
                      }}
                      className="text-cyan-400 hover:underline"
                    >
                      Centrar Imagen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: REMOVE BACKGROUND (Default transparent) */}
            {activeTab === 'bg' && (
              <div className="space-y-4">
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        Quitar Fondo Automático
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Aísla personas, mascotas u objetos del fondo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRemoveBg(!removeBg)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        removeBg
                          ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {removeBg ? 'Fondo Quitado ✓' : 'Detectar y Quitar'}
                    </button>
                  </div>

                  {removeBg && (
                    <div className="space-y-4 pt-3 border-t border-slate-800">
                      {/* Tolerance */}
                      <NumberSliderControl
                        label="Tolerancia de Color"
                        value={bgTolerance}
                        min={10}
                        max={90}
                        step={1}
                        color="cyan"
                        description="Ajusta si se borra de más o quedan restos del fondo."
                        onChange={(val) => setBgTolerance(val)}
                      />

                      {/* Replace mode */}
                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-semibold text-slate-300 block">
                          Fondo Resultante para la Litofanía:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setBgMode('transparent')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left ${
                              bgMode === 'transparent'
                                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/50'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="block font-bold">Transparente ⭐</span>
                            <span className="text-[10px] text-slate-400 font-normal">Recorte limpio PNG (Por defecto)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setBgMode('white')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left ${
                              bgMode === 'white'
                                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/50'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="block font-bold">Blanco Puro</span>
                            <span className="text-[10px] text-slate-400 font-normal">Fondo blanco sólido</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ADJUSTMENTS */}
            {activeTab === 'adjust' && (
              <div className="space-y-4">
                {/* 1-Click B&W Litho Preset */}
                <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-cyan-200 block">Modo Blanco y Negro 3D</span>
                      <p className="text-[10px] text-slate-400">Escala tonal calibrada para impresión 3D</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGrayscale(!grayscale)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                      grayscale
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {grayscale ? 'Activado' : 'Color Original'}
                  </button>
                </div>

                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-4">
                  <NumberSliderControl
                    label="Brillo"
                    icon={Sun}
                    value={brightness}
                    min={-100}
                    max={100}
                    step={1}
                    color="amber"
                    onChange={(b) => setBrightness(b)}
                  />

                  <NumberSliderControl
                    label="Contraste"
                    icon={Contrast}
                    value={contrast}
                    min={-100}
                    max={100}
                    step={1}
                    color="violet"
                    onChange={(c) => setContrast(c)}
                  />

                  <NumberSliderControl
                    label="Nitidez / Claridad de Relieve"
                    icon={Maximize2}
                    value={sharpen}
                    min={0}
                    max={100}
                    step={5}
                    unit="%"
                    color="emerald"
                    onChange={(s) => setSharpen(s)}
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPanX(0);
                  setPanY(0);
                  setRotation(0);
                  setFlipH(false);
                  if (rawImage) {
                    const imgW = rawImage.naturalWidth || 600;
                    const imgH = rawImage.naturalHeight || 600;
                    const targetRatio = imgW / imgH;
                    let w = 0.85;
                    let h = w / targetRatio;
                    if (h > 0.85) {
                      h = 0.85;
                      w = h * targetRatio;
                    }
                    const x = Math.max(0.02, (1 - w) / 2);
                    const y = Math.max(0.02, (1 - h) / 2);
                    setCropBox({ x, y, w, h });
                  } else {
                    setCropBox({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
                  }
                  setAspectRatio('original');
                  setRemoveBg(false);
                  setBgTolerance(45);
                  setBgMode('transparent');
                  setBrightness(0);
                  setContrast(15);
                  setSharpen(20);
                }}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar a la Litofanía</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
