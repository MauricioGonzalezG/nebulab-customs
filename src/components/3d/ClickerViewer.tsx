import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ClickerConfig, ClickerBaseStyle } from '../../types';
import { ProcessedClickerData } from '../../core/clickerProcessor';
import { applyStandardOrbitControls } from './viewerControls';
import { playSwitchSound } from '../../lib/clickerAudio';
import { createEyeletShape, getClickerEyelet, shapeFromContour } from '../../core/clickerGeometry';
import { CLICKER_SOCKET, createHollowBaseParts, createHollowCapParts, createSwitchCoverGeometry, createSwitchLowerGeometry } from '../../core/clickerFit';

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
  bevelRadius: number = 2.0,
  margin: number = 0
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
      return shapeFromContour(pts, scale, margin);
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
  const switchStemGroupRef = useRef<THREE.Group | null>(null);
  const peiBedGroupRef = useRef<THREE.Group | null>(null);

  // Click Animation State
  const clickAnimRef = useRef<{ isPressed: boolean; currentY: number; velocity: number }>({
    isPressed: false,
    currentY: 0,
    velocity: 0,
  });

  // Preserve camera position and target across re-renders
  const cameraStateRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const lastImageUrlRef = useRef(config.imageUrl);

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
    if (lastImageUrlRef.current !== config.imageUrl) {
      cameraStateRef.current = null;
      lastImageUrlRef.current = config.imageUrl;
      clickAnimRef.current = { isPressed: false, currentY: 0, velocity: 0 };
    }

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111a29);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    cameraRef.current = camera;
    if (cameraStateRef.current) {
      camera.position.copy(cameraStateRef.current.position);
    } else {
      camera.position.set(0, 52, 78);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    // Absoluto: el canvas no debe aportar ancho propio al layout (móvil).
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    applyStandardOrbitControls(controls);
    controls.maxPolarAngle = Math.PI / 2 + 0.25;

    if (!cameraStateRef.current) {
      controls.target.set(0, 2.5, 0);
      controls.update();
    }

    if (cameraStateRef.current) {
      controls.target.copy(cameraStateRef.current.target);
      controls.update();
    }

    // Dynamic Lighting based on lightingMode
    const ambientLight = new THREE.AmbientLight(0xffffff, config.lightingMode === 'neon' ? 1.4 : 1.8);
    scene.add(ambientLight);
    scene.add(new THREE.HemisphereLight(0xdcecff, 0x65758e, 2.0));

    const keyLight = new THREE.DirectionalLight(
      config.lightingMode === 'warm' ? 0xffedd5 : config.lightingMode === 'neon' ? 0x38bdf8 : 0xffffff,
      3.0
    );
    keyLight.position.set(45, 80, 55);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(
      config.lightingMode === 'neon' ? 0xe879f9 : config.lightingMode === 'warm' ? 0xffc38a : 0xcbd5e1,
      2.0
    );
    fillLight.position.set(-45, 35, -45);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    rimLight.position.set(0, -30, 40);
    scene.add(rimLight);
    const inspectionLight = new THREE.DirectionalLight(0xe0f2fe, 1.8);
    scene.add(inspectionLight);

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
    const baseMargin = config.type === 'clicker'
      ? Math.max(CLICKER_SOCKET.minimumBaseMargin, config.baseMargin ?? CLICKER_SOCKET.minimumBaseMargin)
      : config.baseMargin ?? 1.1;
    const scale = config.size / 2 - baseMargin;
    const baseHeight = config.type === 'clicker' ? Math.max(12, config.baseHeight) : config.baseHeight;
    // The roof stays above the rim through the full 3.2 mm click travel;
    // its narrower skirt rests inside the housing even before pressing.
    const capRestY = config.type === 'clicker'
      ? -2.4 + 3.2 + 0.2 + CLICKER_SOCKET.capRoofThickness - 8 / 2
      : config.topHeight / 2 + 1;
    const isExtrudeOnly = config.renderStyle === 'extrude';

    const capShape = shapeFromContour(pts, scale);
    // Lift only very dark filament colors in the preview so their geometry
    // remains readable against the dark studio; exports keep the chosen color.
    const previewBaseColor = new THREE.Color(config.baseColor);
    if (previewBaseColor.getHSL({ h: 0, s: 0, l: 0 }).l < 0.16) {
      previewBaseColor.lerp(new THREE.Color(0x475569), 0.22);
    }

    const bodyMat = new THREE.MeshStandardMaterial({
      color: isExtrudeOnly ? 0xe2e8f0 : previewBaseColor,
      roughness: 0.35,
      metalness: 0.08,
    });

    const capGeometries = config.type === 'clicker'
      ? createHollowCapParts(capShape, config.topHeight, config.switchTolerance || 0)
      : (() => {
          const geometry = new THREE.ExtrudeGeometry(capShape, {
            depth: Math.max(2, config.topHeight - 0.8), bevelEnabled: true,
            bevelSegments: 3, bevelSize: 0.8, bevelThickness: 0.8,
          });
          geometry.center();
          return [geometry];
        })();
    for (const geometry of capGeometries) {
      const mesh = new THREE.Mesh(geometry, bodyMat);
      mesh.rotation.x = Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      topGroup.add(mesh);
    }

    // ----------------------------------------------------
    // 2. TOP FACE ARTWORK & MULTI-MATERIAL RELIEF
    // ----------------------------------------------------
    if (processedData && !isExtrudeOnly) {
      const topPlateGeo = new THREE.ShapeGeometry(capShape, 32);
      topPlateGeo.center();

      if (scale > 0) {
        const pos = topPlateGeo.attributes.position;
        const uvs = new Float32Array(pos.count * 2);

        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          // The processed artwork is centered on a square canvas. Keep the
          // same coordinates for the texture and the traced silhouette.
          uvs[i * 2] = 0.5 + x / (2 * scale) * 0.86;
          uvs[i * 2 + 1] = 0.5 - y / (2 * scale) * 0.86;
        }

        topPlateGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      }

      const texture = new THREE.CanvasTexture(processedData.canvas);
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
      const reliefZOffset = config.reliefStyle === 'embossed'
        ? (config.reliefDepth || 0.8) + 0.32
        : config.reliefStyle === 'debossed' ? 0.03 : 0.06;
      topPlateMesh.position.y = config.topHeight / 2 + (config.type === 'clicker' ? 0 : 0.8) + reliefZOffset;
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
        rimMesh.position.y = config.topHeight / 2 + (config.type === 'clicker' ? 0 : 0.8) + (config.reliefDepth || 0.8) / 2;
        topGroup.add(rimMesh);
      }
    }

    // ----------------------------------------------------
    // 3. BASE HOUSING MESH (PARAMETRIC STYLES & SWITCH SOCKET)
    // ----------------------------------------------------
    const baseScale = scale + baseMargin;
    const baseShape = createBaseShape(config.baseStyle, config.baseStyle === 'outline' ? scale : baseScale, pts, config.baseBevel, baseMargin);

    const housingMat = new THREE.MeshStandardMaterial({
      color: isExtrudeOnly ? 0xc8d0e0 : previewBaseColor,
      roughness: 0.25,
      metalness: 0.06,
    });

    const baseGeometries = config.type === 'clicker'
      ? createHollowBaseParts(baseShape, baseHeight)
      : (() => {
          const bevel = Math.min(1.0, config.baseBevel ?? 1.0);
          const geometry = new THREE.ExtrudeGeometry(baseShape, {
            depth: Math.max(4, baseHeight - bevel), bevelEnabled: bevel > 0,
            bevelSegments: 3, bevelSize: bevel, bevelThickness: bevel,
          });
          geometry.center();
          return [geometry];
        })();
    for (const geometry of baseGeometries) {
      const mesh = new THREE.Mesh(geometry, housingMat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = -baseHeight / 2 - 1.2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      baseGroup.add(mesh);
    }

    // ----------------------------------------------------
    // KEYCHAIN RING ATTACHMENT LOOP (Matching Housing Material)
    // ----------------------------------------------------
    let hardware: THREE.Group | null = null;
    let hardwareAnchor = { x: 0, y: 0 };
    if (config.includeRing || config.type === 'keychain') {
      const eyelet = getClickerEyelet(config, pts);
      hardwareAnchor = eyelet;
      const eyeletGeo = new THREE.ExtrudeGeometry(createEyeletShape(config, pts), {
        depth: 4.5, bevelEnabled: true, bevelSegments: 3,
        bevelSize: 0.35, bevelThickness: 0.35,
      });
      eyeletGeo.center();
      const eyeletMesh = new THREE.Mesh(eyeletGeo, housingMat);
      eyeletMesh.rotation.x = Math.PI / 2;
      eyeletMesh.position.set(eyelet.x, -2.2 + (config.ringHeight || 0), eyelet.y);
      eyeletMesh.castShadow = true;
      baseGroup.add(eyeletMesh);

      // Metal chain and split ring are presentation hardware. The printed
      // file contains the housing eyelet, ready for real hardware assembly.
      hardware = new THREE.Group();
      // The first link passes through the printable eyelet; every following
      // link overlaps its neighbour, including the split ring at the end.
      hardware.position.set(eyelet.x, eyeletMesh.position.y, eyelet.y);
      const metal = new THREE.MeshStandardMaterial({ color: 0xd9dce2, metalness: 0.95, roughness: 0.2 });
      // Centre the first link in the 4.5 mm-thick eyelet: its 5.25 mm
      // vertical span crosses both faces, so it is visibly threaded through.
      const linkCenter = 0;
      const linkSpacing = 3.7;
      for (let i = 0; i < 3; i++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.46, 10, 32), metal);
        link.scale.set(0.72, 1.25, 1);
        if (i % 2) link.rotation.y = Math.PI / 2;
        link.position.set(0, linkCenter + i * linkSpacing, 0);
        link.castShadow = true;
        hardware.add(link);
      }
      for (let i = 0; i < 2; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.55, 12, 72), metal);
        ring.position.set(0, linkCenter + 2 * linkSpacing + 10, (i - 0.5) * 0.75);
        ring.castShadow = true;
        hardware.add(ring);
      }
      baseGroup.add(hardware);
    }

    // ----------------------------------------------------
    // 4. DETAILED CHERRY MX MECHANICAL SWITCH MODEL
    // ----------------------------------------------------
    if (config.type === 'clicker' && config.showSwitch) {
      const switchColor = SWITCH_COLORS[config.switchType] || 0xef4444;

      // Switch Lower Base Casing (14x14x6mm)
      const swBaseGeo = createSwitchLowerGeometry();
      const swBaseMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
      const swBase = new THREE.Mesh(swBaseGeo, swBaseMat);
      swBase.rotation.x = Math.PI / 2;
      swBase.position.y = -0.3;
      switchGroup.add(swBase);

      // Switch Translucent Top Cover
      const swTopGeo = createSwitchCoverGeometry();
      const swTopMat = new THREE.MeshStandardMaterial({
        color: 0x3f3f46,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      });
      const swTop = new THREE.Mesh(swTopGeo, swTopMat);
      swTop.rotation.x = Math.PI / 2;
      swTop.position.y = 3.1;
      switchGroup.add(swTop);

      // Switch Stem with standard '+' Cross Mount
      const stemGroup = new THREE.Group();
      const swStemColorMat = new THREE.MeshStandardMaterial({
        color: switchColor,
        roughness: 0.3,
        metalness: 0.05,
      });

      const stemCenterGeo = new THREE.BoxGeometry(4.0, 2.8, 4.0);
      const stemCenter = new THREE.Mesh(stemCenterGeo, swStemColorMat);
      stemCenter.position.y = -1.8;

      const crossH = new THREE.BoxGeometry(4.0, 3.2, 1.15);
      const crossV = new THREE.BoxGeometry(1.15, 3.2, 4.0);
      const crossHMesh = new THREE.Mesh(crossH, swStemColorMat);
      const crossVMesh = new THREE.Mesh(crossV, swStemColorMat);
      crossHMesh.position.y = 1.2;
      crossVMesh.position.y = 1.2;

      // The central slider clears the cover's round well as the switch moves.
      stemGroup.add(stemCenter);
      stemGroup.add(crossHMesh);
      stemGroup.add(crossVMesh);
      stemGroup.position.y = 3.6;

      switchStemGroupRef.current = stemGroup;
      switchGroup.add(stemGroup);
    }

    // ----------------------------------------------------
    // ANIMATION & RENDER LOOP
    // ----------------------------------------------------
    // Start each rebuilt scene at its actual assembly position. This avoids
    // showing the switch through the face for a few frames after image changes.
    if (config.viewMode === 'exploded') {
      topGroup.position.y = 26;
      baseGroup.position.y = -12;
      switchGroup.position.y = 6;
    } else if (config.viewMode === 'assembled') {
      topGroup.position.y = capRestY;
      baseGroup.position.y = -1.2;
      switchGroup.position.y = -6.3;
    }
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
        anim.currentY = Math.max(-3.2, Math.min(0, anim.currentY));

        // Auto release press after 110ms
        if (anim.isPressed && anim.currentY <= -3.2) {
          anim.isPressed = false;
          anim.velocity = 0;
        }
      }

      // 2. View Mode Smooth Interpolation
      const isExploded = config.viewMode === 'exploded';
      const isPrintBed = config.viewMode === 'printbed';

      // Hide/Show PEI build plate & Grid
      peiBedGroup.visible = isPrintBed;
      gridHelper.visible = !isPrintBed;
      gridHelper.position.y = isExploded ? -28 : -15;
      if (hardware) {
        hardware.visible = !isPrintBed;
        // A real split ring swivels freely: face it toward the viewer while
        // keeping the first link centred through the fixed printed eyelet.
        hardware.rotation.y = Math.atan2(camera.position.x - hardwareAnchor.x, camera.position.z - hardwareAnchor.y)
          + Math.sin(performance.now() * 0.0015) * 0.02;
        hardware.rotation.z = Math.sin(performance.now() * 0.0011 + 0.7) * 0.025;
      }

      if (isPrintBed) {
        // Print the decorated face against the bed, with the open socket up.
        topGroup.rotation.z = Math.PI;
        const faceRelief = processedData && !isExtrudeOnly
          ? config.reliefStyle === 'embossed' ? (config.reliefDepth || 0.8) + 0.32
            : config.reliefStyle === 'debossed' ? 0.03 : 0.06
          : 0;
        topGroup.position.set(-scale * 1.1 - 4,
          config.topHeight / 2 + (config.type === 'clicker' ? 0 : 0.8) + faceRelief + 0.1, 0);
        baseGroup.position.set(baseScale * 1.1 + 4, baseHeight + 1.3, 0);
        switchGroup.position.set(0, -999, 0); // Hide switch in print bed
      } else {
        topGroup.rotation.z = 0;
        const baseTargetY = isExploded ? -12 : -1.2;
        const switchTargetY = isExploded ? 6 : -6.3;
        const topTargetY = (isExploded ? 26 : capRestY) + anim.currentY;

        topGroup.position.set(0, topGroup.position.y + (topTargetY - topGroup.position.y) * 0.15, 0);
        baseGroup.position.set(0, baseGroup.position.y + (baseTargetY - baseGroup.position.y) * 0.15, 0);
        switchGroup.position.set(0, switchGroup.position.y + (switchTargetY - switchGroup.position.y) * 0.15, 0);
        if (switchStemGroupRef.current) {
          switchStemGroupRef.current.position.y = 3.6 + (isExploded ? 0 : topGroup.position.y - capRestY);
        }
      }

      controls.update();
      inspectionLight.position.copy(camera.position);
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
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => {
        if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
        material.dispose();
      });
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [config, processedData, triggerClickAnimation]);

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none"
      title="Arrastra para rotar la cámara 3D • Haz clic sobre el keycap para probar la pulsación mecánica"
    />
  );
};
