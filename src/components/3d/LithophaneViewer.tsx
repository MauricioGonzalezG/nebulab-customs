import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LithophaneConfig } from '../../types';
import { ProcessedImageData } from '../../core/imageProcessor';
import { createBaseMesh, createFrameMesh, createLithophaneGeometry, createLithophaneMaterial } from '../../core/lithophaneBuilder';
import { exportToSTL, downloadLithophaneSTL } from '../../core/stlExporter';
import { Lightbulb, RotateCcw, Download, Eye, Maximize2, Sparkles } from 'lucide-react';
import { VIEWER_CONTROL_HINT, applyStandardOrbitControls } from './viewerControls';

interface LithophaneViewerProps {
  config: LithophaneConfig;
  processedData: ProcessedImageData | null;
  onToggleLight?: () => void;
}

export const LithophaneViewer: React.FC<LithophaneViewerProps> = ({
  config,
  processedData,
  onToggleLight
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Preserve camera between parameter changes so the view does not jump
  const cameraStateRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  const [wireframe, setWireframe] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const mount = mountRef.current;
    if (!container || !mount) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    // Scene with a light pastel background for stronger model contrast
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb7e3ef);

    const gridHelper = new THREE.GridHelper(600, 40, 0x5caebe, 0x8ccfdb);
    gridHelper.position.y = -85;
    scene.add(gridHelper);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height || 1, 1, 2000);
    cameraRef.current = camera;

    const maxDim = Math.max(config.width, config.height);
    const defaultDistance = maxDim * 2.2;

    if (cameraStateRef.current) {
      camera.position.copy(cameraStateRef.current.position);
    } else {
      camera.position.set(0, maxDim * 0.15, defaultDistance);
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // OrbitControls — same mouse map as Clicker / Collar
    const controls = new OrbitControls(camera, renderer.domElement);
    applyStandardOrbitControls(controls);
    controls.minDistance = 60;
    controls.maxDistance = 600;
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    if (cameraStateRef.current) {
      controls.target.copy(cameraStateRef.current.target);
      controls.update();
    } else {
      controls.target.set(0, 0, 0);
      controls.update();
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(
      config.enableLight ? 0x444455 : 0xffffff,
      config.enableLight ? 0.8 : 1.3
    );
    scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, config.enableLight ? 0.5 : 0.9);
    frontLight.position.set(100, 150, 200);
    scene.add(frontLight);

    const backLightColor = new THREE.Color(0xffffff).lerp(
      new THREE.Color(0xffa834),
      config.lightWarmth / 100
    );
    const beamLength = config.strutLength !== undefined ? config.strutLength : 60;
    const puckY = -config.height / 2 + 15;
    const rOut = (config.puckDiameter || 60) / 2;
    const tiltRad = ((config.puckAngle || 45) * Math.PI) / 180;
    const backLightZ = -beamLength - rOut * Math.cos(tiltRad);

    const backLight = new THREE.PointLight(
      backLightColor,
      config.enableLight ? (config.lightIntensity / 100) * 5.0 : 0.0,
      400
    );
    backLight.position.set(0, puckY, backLightZ);
    scene.add(backLight);

    // Root group
    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    if (processedData) {
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

      const frameMesh = createFrameMesh(config);
      if (frameMesh) {
        rootGroup.add(frameMesh);
      }

      const baseGroup = createBaseMesh(config);
      rootGroup.add(baseGroup);
    }

    let animationFrameId: number;
    const renderLoop = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const resizeRenderer = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    resizeRenderer();
    const resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(container);
    window.addEventListener('resize', resizeRenderer);

    return () => {
      cameraStateRef.current = {
        position: camera.position.clone(),
        target: controls.target.clone(),
      };
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeRenderer);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
    };
  }, [config, processedData, wireframe, isRotating]);

  const resetView = () => {
    const maxDim = Math.max(config.width, config.height);
    const distance = maxDim * 2.2;
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, maxDim * 0.15, distance);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
    cameraStateRef.current = null;
  };

  const handleDownloadSTL = () => {
    if (processedData) {
      downloadLithophaneSTL(processedData, config);
    } else if (rootGroupRef.current) {
      exportToSTL(rootGroupRef.current, `Litofania_${config.shape}_${Date.now()}.stl`);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] md:h-full min-h-[450px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 cursor-grab active:cursor-grabbing select-none"
    >
      {/* WebGL mount — kept separate so React overlays are not wiped */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Floating Toolbar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 text-xs font-medium text-slate-200 flex items-center gap-2 pointer-events-auto shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Vista 3D Interactiva</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleLight}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 shadow-md ${
              config.enableLight
                ? 'bg-amber-400 text-slate-950 shadow-amber-400/20 shadow-lg scale-105'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Simular luz trasera LED (ON/OFF)"
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
            title="Malla wireframe 3D"
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
            title="Restablecer cámara"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 pointer-events-auto z-10">
        <button
          onClick={handleDownloadSTL}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-xs font-semibold shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Descargar STL de Impresión</span>
        </button>
      </div>

      <div className="absolute bottom-4 right-4 pointer-events-none hidden sm:block z-10">
        <div className="bg-slate-900/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400">
          {VIEWER_CONTROL_HINT}
        </div>
      </div>
    </div>
  );
};
