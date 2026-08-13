import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ClickerConfig, ClickerBaseStyle } from '../../types';
import { ProcessedClickerData } from '../../core/clickerProcessor';
import { applyStandardOrbitControls } from './viewerControls';
import { playSwitchSound } from '../../lib/clickerAudio';

interface ClickerViewerProps {
  config: ClickerConfig;
  processedData: ProcessedClickerData | null;
  onTriggerClick?: () => void;
}

/**
 * Builds standard 2D shapes for base housing
 */
function createBaseShape(
  style: ClickerBaseStyle,
  scale: number,
  pts: Array<{ x: number; y: number }>,
  bevelRadius: number = 2.0
): THREE.Shape {
  const shape = new THREE.Shape();

  switch (style) {
    case 'circle':
      shape.absarc(0, 0, scale, 0, Math.PI * 2, false);
      break;

    case 'square': {
      shape.moveTo(-scale, -scale);
      shape.lineTo(scale, -scale);
      shape.lineTo(scale, scale);
      shape.lineTo(-scale, scale);
      shape.closePath();
      break;
    }

    case 'rounded-square': {
      const r = Math.min(bevelRadius * 2, scale * 0.4);
      const s = scale - r;
      shape.moveTo(-s, -scale);
      shape.lineTo(s, -scale);
      shape.absarc(s, -s, r, -Math.PI / 2, 0, false);
      shape.lineTo(scale, s);
      shape.absarc(s, s, r, 0, Math.PI / 2, false);
      shape.lineTo(-s, scale);
      shape.absarc(-s, s, r, Math.PI / 2, Math.PI, false);
      shape.lineTo(-scale, -s);
      shape.absarc(-s, -s, r, Math.PI, Math.PI * 1.5, false);
      shape.closePath();
      break;
    }

    case 'hexagon': {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(angle) * scale;
        const y = Math.sin(angle) * scale;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      break;
    }

    case 'pill': {
      const h = scale * 0.65;
      const w = scale;
      shape.moveTo(-w + h, -h);
      shape.lineTo(w - h, -h);
      shape.absarc(w - h, 0, h, -Math.PI / 2, Math.PI / 2, false);
      shape.lineTo(-w + h, h);
      shape.absarc(-w + h, 0, h, Math.PI / 2, Math.PI * 1.5, false);
      shape.closePath();
      break;
    }

    case 'heart': {
      const s = scale * 0.038;
      shape.moveTo(0, -15 * s);
      shape.bezierCurveTo(25 * s, -35 * s, 35 * s, -10 * s, 35 * s, 10 * s);
      shape.bezierCurveTo(35 * s, 25 * s, 20 * s, 35 * s, 0, 45 * s);
      shape.bezierCurveTo(-20 * s, 35 * s, -35 * s, 25 * s, -35 * s, 10 * s);
      shape.bezierCurveTo(-35 * s, -10 * s, -25 * s, -35 * s, 0, -15 * s);
      shape.closePath();
      break;
    }

    case 'shield': {
      const s = scale;
      shape.moveTo(-s * 0.9, -s * 0.9);
      shape.lineTo(s * 0.9, -s * 0.9);
      shape.lineTo(s * 0.9, s * 0.1);
      shape.bezierCurveTo(s * 0.9, s * 0.7, 0, s * 1.1, 0, s * 1.1);
      shape.bezierCurveTo(0, s * 1.1, -s * 0.9, s * 0.7, -s * 0.9, s * 0.1);
      shape.closePath();
      break;
    }

    case 'outline':
    default: {
      if (pts.length > 2) {
        shape.moveTo(pts[0].x * scale, pts[0].y * scale);
        for (let i = 1; i < pts.length; i++) {
          shape.lineTo(pts[i].x * scale, pts[i].y * scale);
        }
        shape.closePath();
      } else {
        shape.absarc(0, 0, scale, 0, Math.PI * 2, false);
      }
      break;
    }
  }

  return shape;
}

const SWITCH_COLORS: Record<string, number> = {
  red: 0xef4444,
  blue: 0x0284c7,
  brown: 0x854d0e,
  black: 0x0f172a,
  yellow: 0xeab308,
};

export const ClickerViewer: React.FC<ClickerViewerProps> = ({
  config,
  processedData,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const topGroupRef = useRef<THREE.Group | null>(null);
  const baseGroupRef = useRef<THREE.Group | null>(null);
  const switchGroupRef = useRef<THREE.Group | null>(null);
  const switchStemMeshRef = useRef<THREE.Mesh | null>(null);
  const peiBedGroupRef = useRef<THREE.Group | null>(null);

  // Click Animation State
  const clickAnimRef = useRef<{ isPressed: boolean; currentY: number; velocity: number }>({
    isPressed: false,
    currentY: 0,
    velocity: 0,
  });

  // Preserve camera position and target across re-renders
  const cameraStateRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  const triggerClickAnimation = useCallback(() => {
    if (config.soundEnabled) {
      playSwitchSound(config.switchType);
    }
    clickAnimRef.current.isPressed = true;
    clickAnimRef.current.velocity = -4.5;
  }, [config.soundEnabled, config.switchType]);

  // Handle Canvas Click for tactile switch press
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (config.viewMode === 'printbed') return;
    const container = mountRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    if (topGroupRef.current) {
      const intersects = raycaster.intersectObjects(topGroupRef.current.children, true);
      if (intersects.length > 0) {
        triggerClickAnimation();
      }
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    cameraRef.current = camera;
    if (cameraStateRef.current) {
      camera.position.copy(cameraStateRef.current.position);
    } else {
      camera.position.set(0, 48, 70);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    applyStandardOrbitControls(controls);
    controls.maxPolarAngle = Math.PI / 2 + 0.25;

    if (cameraStateRef.current) {
      controls.target.copy(cameraStateRef.current.target);
      controls.update();
    }

    // Dynamic Lighting based on lightingMode
    const ambientLight = new THREE.AmbientLight(0xffffff, config.lightingMode === 'neon' ? 1.0 : 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(
      config.lightingMode === 'warm' ? 0xffedd5 : config.lightingMode === 'neon' ? 0x38bdf8 : 0xffffff,
      2.4
    );
    keyLight.position.set(45, 80, 55);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(
      config.lightingMode === 'neon' ? 0xd946ef : config.lightingMode === 'warm' ? 0xfb923c : 0x94a3b8,
      1.2
    );
    fillLight.position.set(-45, 35, -45);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, -30, 40);
    scene.add(rimLight);

    // Build 3D Root Groups
    const topGroup = new THREE.Group();
    const baseGroup = new THREE.Group();
    const switchGroup = new THREE.Group();
    const peiBedGroup = new THREE.Group();

    topGroupRef.current = topGroup;
    baseGroupRef.current = baseGroup;
    switchGroupRef.current = switchGroup;
    peiBedGroupRef.current = peiBedGroup;

    scene.add(topGroup);
    scene.add(baseGroup);
    scene.add(switchGroup);
    scene.add(peiBedGroup);

    // Standard Grid Floor (Active in Assembled & Exploded modes)
    const gridHelper = new THREE.GridHelper(140, 35, 0x334155, 0x1e293b);
    gridHelper.position.y = -15;
    scene.add(gridHelper);

    // ----------------------------------------------------
    // BAMBU LAB STYLE TEXTURED PEI BUILD PLATE (Print Bed Mode)
    // ----------------------------------------------------
    const peiSize = 130;
    const peiGeo = new THREE.BoxGeometry(peiSize, 2, peiSize);
    const peiMat = new THREE.MeshStandardMaterial({
      color: 0xd4a359, // Golden Textured PEI sheet
      roughness: 0.7,
      metalness: 0.3,
    });
    const peiMesh = new THREE.Mesh(peiGeo, peiMat);
    peiMesh.position.y = -1;
    peiMesh.receiveShadow = true;
    peiBedGroup.add(peiMesh);

    // Bed Grid Lines & Border
    const peiGrid = new THREE.GridHelper(peiSize - 10, 24, 0x92652b, 0xb88842);
    peiGrid.position.y = 0.05;
    peiBedGroup.add(peiGrid);

    // ----------------------------------------------------
    // 1. TOP CAP SHAPE & 3D GEOMETRY
    // ----------------------------------------------------
    const pts = processedData?.contourPoints || [];
    const scale = config.size / 2;
    const isExtrudeOnly = config.renderStyle === 'extrude';

    const capShape = new THREE.Shape();
    if (pts.length > 2) {
      capShape.moveTo(pts[0].x * scale, pts[0].y * scale);
      for (let i = 1; i < pts.length; i++) {
        capShape.lineTo(pts[i].x * scale, pts[i].y * scale);
      }
      capShape.closePath();
    } else {
      capShape.absarc(0, 0, scale, 0, Math.PI * 2, false);
    }

    const bevelSize = 0.8;
    const bevelThick = 0.8;
    const capBodyGeo = new THREE.ExtrudeGeometry(capShape, {
      depth: Math.max(2, config.topHeight - bevelThick),
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: bevelSize,
      bevelThickness: bevelThick,
    });
    capBodyGeo.center();
    capBodyGeo.computeVertexNormals();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: isExtrudeOnly ? 0xe2e8f0 : config.baseColor,
      roughness: 0.35,
      metalness: 0.08,
    });

    const capBodyMesh = new THREE.Mesh(capBodyGeo, bodyMat);
    capBodyMesh.rotation.x = Math.PI / 2;
    capBodyMesh.castShadow = true;
    capBodyMesh.receiveShadow = true;
    topGroup.add(capBodyMesh);

    // ----------------------------------------------------
    // CHERRY MX STANDARD FEMALE CROSS STEM (Underneath Keycap)
    // ----------------------------------------------------
    if (config.type === 'clicker') {
      const stemGroup = new THREE.Group();

      // Outer cylindrical stem post (5.5mm diameter)
      const postRadius = 2.8;
      const postHeight = Math.max(3.5, config.topHeight - 1.5);
      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 24);
      const stemMat = new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        roughness: 0.4,
        metalness: 0.1,
      });
      const postMesh = new THREE.Mesh(postGeo, stemMat);
      postMesh.position.y = -config.topHeight / 2 + postHeight / 2;
      stemGroup.add(postMesh);

      // Cherry MX '+' Cross Fit Slot details
      const tol = config.switchTolerance || 0;
      const crossSlotMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
      const barGeo1 = new THREE.BoxGeometry(4.15 + tol, 1.25 + tol, 3.8);
      const barGeo2 = new THREE.BoxGeometry(1.25 + tol, 4.15 + tol, 3.8);
      const bar1 = new THREE.Mesh(barGeo1, crossSlotMat);
      const bar2 = new THREE.Mesh(barGeo2, crossSlotMat);
      bar1.position.y = -config.topHeight / 2 + 1.8;
      bar2.position.y = -config.topHeight / 2 + 1.8;
      bar1.rotation.x = Math.PI / 2;
      bar2.rotation.x = Math.PI / 2;
      stemGroup.add(bar1);
      stemGroup.add(bar2);

      topGroup.add(stemGroup);
    }

    // ----------------------------------------------------
    // 2. TOP FACE ARTWORK & MULTI-MATERIAL RELIEF
    // ----------------------------------------------------
    if (processedData && !isExtrudeOnly) {
      const topPlateGeo = new THREE.ShapeGeometry(capShape, 32);
      topPlateGeo.center();

      topPlateGeo.computeBoundingBox();
      const bb = topPlateGeo.boundingBox;
      if (bb) {
        const sizeX = bb.max.x - bb.min.x || 1;
        const sizeY = bb.max.y - bb.min.y || 1;
        const pos = topPlateGeo.attributes.position;
        const uvs = new Float32Array(pos.count * 2);

        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const normU = (x - bb.min.x) / sizeX;
          const normV = (y - bb.min.y) / sizeY;

          uvs[i * 2] = normU;
          uvs[i * 2 + 1] = 1 - normV;
        }

        topPlateGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      }

      const texture = new THREE.CanvasTexture(processedData.originalCanvas || processedData.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const topPlateMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.22,
        metalness: 0.04,
        side: THREE.DoubleSide,
      });

      const topPlateMesh = new THREE.Mesh(topPlateGeo, topPlateMat);
      topPlateMesh.rotation.x = Math.PI / 2;

      // Relief style elevation
      const reliefZOffset = config.reliefStyle === 'embossed' ? 0.4 : config.reliefStyle === 'debossed' ? -0.2 : 0.06;
      topPlateMesh.position.y = config.topHeight / 2 + bevelThick + reliefZOffset;
      topPlateMesh.castShadow = true;
      topGroup.add(topPlateMesh);

      // Embossed Relief Border Rim
      if (config.reliefStyle === 'embossed') {
        const rimGeo = new THREE.ExtrudeGeometry(capShape, {
          depth: config.reliefDepth || 0.8,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 0.25,
          bevelThickness: 0.25,
        });
        rimGeo.center();
        const rimMat = new THREE.MeshStandardMaterial({
          color: config.outlineColor,
          roughness: 0.3,
        });
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        rimMesh.rotation.x = Math.PI / 2;
        rimMesh.position.y = config.topHeight / 2 + bevelThick + (config.reliefDepth || 0.8) / 2;
        topGroup.add(rimMesh);
      }
    }

    // ----------------------------------------------------
    // 3. BASE HOUSING MESH (PARAMETRIC STYLES & SWITCH SOCKET)
    // ----------------------------------------------------
    const baseMargin = config.baseMargin ?? 2.5;
    const baseScale = scale + baseMargin;
    const baseShape = createBaseShape(config.baseStyle, baseScale, pts, config.baseBevel);

    // Standard 14.0mm x 14.0mm Cherry MX Switch Socket Cutout
    if (config.type === 'clicker') {
      const switchHole = new THREE.Path();
      const halfSw = 7.1; // 14.2mm for tight slip-fit without slack
      switchHole.moveTo(-halfSw, -halfSw);
      switchHole.lineTo(halfSw, -halfSw);
      switchHole.lineTo(halfSw, halfSw);
      switchHole.lineTo(-halfSw, halfSw);
      switchHole.closePath();
      baseShape.holes.push(switchHole);
    }

    const baseBevelThick = Math.min(1.0, config.baseBevel || 1.0);
    const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
      depth: Math.max(4, config.baseHeight - baseBevelThick),
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: baseBevelThick,
      bevelThickness: baseBevelThick,
    });
    baseGeo.center();
    baseGeo.computeVertexNormals();

    const housingMat = new THREE.MeshStandardMaterial({
      color: isExtrudeOnly ? 0xc8d0e0 : 0xf8fafc,
      roughness: 0.25,
      metalness: 0.06,
    });

    const baseMesh = new THREE.Mesh(baseGeo, housingMat);
    baseMesh.rotation.x = Math.PI / 2;
    baseMesh.position.y = -config.baseHeight / 2 - 1.2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseGroup.add(baseMesh);

    // ----------------------------------------------------
    // KEYCHAIN RING ATTACHMENT LOOP (Matching Housing Material)
    // ----------------------------------------------------
    if (config.includeRing || config.type === 'keychain') {
      const holeDiam = config.ringHoleDiameter || 4.5;
      const ringThick = config.ringThickness || 2.2;
      const majorRadius = holeDiam / 2 + ringThick / 2;
      const minorRadius = ringThick / 2;

      const ringGeo = new THREE.TorusGeometry(majorRadius, minorRadius, 20, 36);
      const ringMesh = new THREE.Mesh(ringGeo, housingMat);

      const angleDeg = config.ringAngle ?? 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      const ringDist = baseScale + majorRadius * 0.75;

      const rx = Math.cos(angleRad) * ringDist + (config.ringOffsetX || 0);
      const rz = -Math.sin(angleRad) * ringDist + (config.ringOffsetY || 0);
      const ry = config.ringHeight || 0;

      ringMesh.position.set(rx, ry, rz);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.rotation.z = -angleRad + Math.PI / 2;
      ringMesh.castShadow = true;
      baseGroup.add(ringMesh);
    }

    // ----------------------------------------------------
    // 4. DETAILED CHERRY MX MECHANICAL SWITCH MODEL
    // ----------------------------------------------------
    if (config.type === 'clicker' && config.showSwitch) {
      const switchColor = SWITCH_COLORS[config.switchType] || 0xef4444;

      // Switch Lower Base Casing (14x14x6mm)
      const swBaseGeo = new THREE.BoxGeometry(14, 5.8, 14);
      const swBaseMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
      const swBase = new THREE.Mesh(swBaseGeo, swBaseMat);
      swBase.position.y = -3.2;
      switchGroup.add(swBase);

      // Switch Translucent Top Cover
      const swTopGeo = new THREE.BoxGeometry(13.6, 4.2, 13.6);
      const swTopMat = new THREE.MeshStandardMaterial({
        color: 0x3f3f46,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      });
      const swTop = new THREE.Mesh(swTopGeo, swTopMat);
      swTop.position.y = 1.0;
      switchGroup.add(swTop);

      // Switch Stem with standard '+' Cross Mount
      const stemGroup = new THREE.Group();
      const swStemColorMat = new THREE.MeshStandardMaterial({
        color: switchColor,
        roughness: 0.3,
        metalness: 0.05,
      });

      const stemCenterGeo = new THREE.BoxGeometry(4.0, 5.5, 4.0);
      const stemCenter = new THREE.Mesh(stemCenterGeo, swStemColorMat);

      const crossH = new THREE.BoxGeometry(4.0, 3.6, 1.15);
      const crossV = new THREE.BoxGeometry(1.15, 3.6, 4.0);
      const crossHMesh = new THREE.Mesh(crossH, swStemColorMat);
      const crossVMesh = new THREE.Mesh(crossV, swStemColorMat);
      crossHMesh.position.y = 1.8;
      crossVMesh.position.y = 1.8;

      stemGroup.add(stemCenter);
      stemGroup.add(crossHMesh);
      stemGroup.add(crossVMesh);
      stemGroup.position.y = 3.6;

      switchStemMeshRef.current = stemCenter;
      switchGroup.add(stemGroup);
    }

    // ----------------------------------------------------
    // ANIMATION & RENDER LOOP
    // ----------------------------------------------------
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // 1. Spring-loaded Click Animation Physics
      const anim = clickAnimRef.current;
      if (anim.isPressed || Math.abs(anim.currentY) > 0.05 || Math.abs(anim.velocity) > 0.05) {
        const springK = 0.32;
        const damping = 0.72;
        const targetDisplacement = anim.isPressed ? -3.6 : 0;

        const force = (targetDisplacement - anim.currentY) * springK;
        anim.velocity = (anim.velocity + force) * damping;
        anim.currentY += anim.velocity;

        // Auto release press after 110ms
        if (anim.isPressed && anim.currentY <= -3.2) {
          anim.isPressed = false;
        }
      }

      // 2. View Mode Smooth Interpolation
      const isExploded = config.viewMode === 'exploded';
      const isPrintBed = config.viewMode === 'printbed';

      // Hide/Show PEI build plate & Grid
      peiBedGroup.visible = isPrintBed;
      gridHelper.visible = !isPrintBed;

      if (isPrintBed) {
        // Place Cap and Base flat side-by-side on build plate
        topGroup.position.set(-scale * 1.1 - 4, config.topHeight / 2 + 0.1, 0);
        baseGroup.position.set(baseScale * 1.1 + 4, config.baseHeight / 2 + 0.1, 0);
        switchGroup.position.set(0, -999, 0); // Hide switch in print bed
      } else {
        const baseTargetY = isExploded ? -12 : -1.2;
        const switchTargetY = isExploded ? 6 : 0;
        const topTargetY = (isExploded ? 26 : 3.0) + anim.currentY;

        topGroup.position.set(0, topGroup.position.y + (topTargetY - topGroup.position.y) * 0.15, 0);
        baseGroup.position.set(0, baseGroup.position.y + (baseTargetY - baseGroup.position.y) * 0.15, 0);
        switchGroup.position.set(0, switchGroup.position.y + (switchTargetY - switchGroup.position.y) * 0.15, 0);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth || 500;
      const newHeight = container.clientHeight || 450;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (controls && camera) {
        cameraStateRef.current = {
          position: camera.position.clone(),
          target: controls.target.clone(),
        };
      }
      controls.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [config, processedData, triggerClickAnimation]);

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      title="Arrastra para rotar la cámara 3D • Haz clic sobre el keycap para probar la pulsación mecánica"
    />
  );
};
