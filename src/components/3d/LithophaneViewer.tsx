import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LithophaneConfig } from '../../types';
import { ProcessedImageData } from '../../core/imageProcessor';
import { createBaseMesh, createFrameMesh, createLithophaneGeometry, createLithophaneMaterial } from '../../core/lithophaneBuilder';
import { exportToSTL } from '../../core/stlExporter';
import { Lightbulb, RotateCcw, Download, Eye, Maximize2, Sparkles } from 'lucide-react';

interface LithophaneViewerProps {
  config: LithophaneConfig;
  processedData: ProcessedImageData | null;
  onToggleLight: () => void;
}

export const LithophaneViewer: React.FC<LithophaneViewerProps> = ({
  config,
  processedData,
  onToggleLight
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);

  const [wireframe, setWireframe] = useState(false);
  const [isRotating, setIsRotating] = useState(false); // Default NO rotation as requested

  // Orbit state references for custom lightweight orbit control
  const isDraggingRef = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.05, y: 0.15 });
  const zoomRef = useRef(200);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene setup (ItsLitho style soft sky cyan background)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8bd4e5); // Soft Sky Cyan (ItsLitho style)

    // ItsLitho style Grid Helper floor
    const gridHelper = new THREE.GridHelper(600, 40, 0x4aaec4, 0x78cfdf);
    gridHelper.position.y = -85;
    scene.add(gridHelper);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(0, 0, zoomRef.current);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;

    // 4. Lighting setup
    const ambientLight = new THREE.AmbientLight(
      config.enableLight ? 0x444455 : 0xffffff,
      config.enableLight ? 0.8 : 1.3
    );
    scene.add(ambientLight);

    // Front soft directional light
    const frontLight = new THREE.DirectionalLight(0xffffff, config.enableLight ? 0.5 : 0.9);
    frontLight.position.set(100, 150, 200);
    scene.add(frontLight);

    // Backlight (LED light coming directly from the battery LED puck lamp cup!)
    const backLightColor = new THREE.Color(0xffffff).lerp(
      new THREE.Color(0xffa834),
      config.lightWarmth / 100
    );
    const puckY = -config.height / 2 + 15;
    const backLight = new THREE.PointLight(
      backLightColor,
      config.enableLight ? (config.lightIntensity / 100) * 5.0 : 0.0,
      400
    );
    backLight.position.set(0, puckY, -60);
    scene.add(backLight);

    // 5. Root Group for Lithophane Assembly
    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    // 6. Build 3D Lithophane Mesh if data available
    if (processedData) {
      // Load photographic texture map for ItsLitho photo rendering
      const textureLoader = new THREE.TextureLoader();
      const photoTexture = textureLoader.load(processedData.previewDataUrl, () => {
        renderer.render(scene, camera);
      });

      const geo = createLithophaneGeometry(processedData, config);
      const mat = createLithophaneMaterial(config, photoTexture);
      mat.wireframe = wireframe;

      const lithoMesh = new THREE.Mesh(geo, mat);
      lithoMesh.castShadow = true;
      lithoMesh.receiveShadow = true;
      rootGroup.add(lithoMesh);

      // Add Frame if enabled
      const frameMesh = createFrameMesh(config);
      if (frameMesh) {
        frameMesh.position.set(0, 0, 0);
        rootGroup.add(frameMesh);
      }

      // Add Base / Stand
      const baseGroup = createBaseMesh(config);
      rootGroup.add(baseGroup);

      const maxDim = Math.max(config.width, config.height);
      zoomRef.current = maxDim * 2.2;
    }

    // Animation Loop
    let animationFrameId: number;
    const renderLoop = () => {
      if (isRotating && !isDraggingRef.current) {
        rotationRef.current.y += 0.005; // Slow auto-rotation
      }

      rootGroup.rotation.x = rotationRef.current.x;
      rootGroup.rotation.y = rotationRef.current.y;
      camera.position.z = zoomRef.current;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [config, processedData, wireframe, isRotating]);

  // Mouse / Touch Interaction Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    rotationRef.current.y += deltaX * 0.01;
    rotationRef.current.x += deltaY * 0.01;

    // Clamp vertical rotation so it doesn't flip upside down
    rotationRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.x));

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    zoomRef.current += e.deltaY * 0.15;
    zoomRef.current = Math.max(60, Math.min(600, zoomRef.current));
  };

  const resetView = () => {
    rotationRef.current = { x: 0.15, y: 0 };
    if (config) {
      zoomRef.current = Math.max(config.width, config.height) * 2.2;
    }
  };

  const handleDownloadSTL = () => {
    if (rootGroupRef.current) {
      exportToSTL(rootGroupRef.current, `Litofania_${config.shape}_${Date.now()}.stl`);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] md:h-full min-h-[450px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating Toolbar & Overlays */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        {/* Title / Status Tag */}
        <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.8 rounded-full border border-slate-700/60 text-xs font-medium text-slate-200 flex items-center gap-2 pointer-events-auto shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Vista 3D Interactiva</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Light Toggle Switch */}
          <button
            onClick={onToggleLight}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 shadow-md ${
              config.enableLight
                ? 'bg-amber-400 text-slate-950 shadow-amber-400/20 shadow-lg scale-105'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Simular Luz Trasera LED (ON/OFF)"
          >
            <Lightbulb className={`w-4 h-4 ${config.enableLight ? 'fill-slate-950 animate-bounce' : ''}`} />
            <span>{config.enableLight ? 'Luz ENCENDIDA' : 'Encender Luz'}</span>
          </button>

          <button
            onClick={() => setWireframe(!wireframe)}
            className={`p-2 rounded-full border text-xs transition-all ${
              wireframe
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Malla Wireframe 3D"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-2 rounded-full border text-xs transition-all ${
              isRotating
                ? 'bg-slate-700 text-cyan-400 border-cyan-500/50'
                : 'bg-slate-800/90 text-slate-400 border-slate-700'
            }`}
            title="Giro automático"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={resetView}
            className="p-2 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Restablecer Cámara"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Left: STL Export Button */}
      <div className="absolute bottom-4 left-4 pointer-events-auto">
        <button
          onClick={handleDownloadSTL}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-xs font-semibold shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Descargar STL de Impresión</span>
        </button>
      </div>

      {/* Floating Bottom Right: Controls Guidance */}
      <div className="absolute bottom-4 right-4 pointer-events-none hidden sm:block">
        <div className="bg-slate-900/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400">
          Arrastra para rotar • Rueda para zoom
        </div>
      </div>
    </div>
  );
};
