import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CollarConfig } from '../../types';
import { ProcessedCollarData } from '../../core/collarProcessor';
import { buildCollarModel } from '../../core/collarModel';
import { COLLAR_REAR_PASSAGE, COLLAR_SIZES, collarRearPassageLength } from '../../core/collarSizing';
import { loadPlateEngine } from '../../core/plateBuilder';
import { applyStandardOrbitControls } from './viewerControls';

interface CollarViewerProps {
  config: CollarConfig;
  processedData: ProcessedCollarData | null;
}

export const COLLAR_STRAP_COLORS: Record<CollarConfig['strapColor'], number> = {
  olive: 0x4d5d36, crimson: 0x991b1b, black: 0x1e293b,
  navy: 0x1e3a8a, pink: 0xbe185d, brown: 0x78350f, yellow: 0xeab308,
};
const color = (hex: string, fallback: number) => {
  const parsed = Number.parseInt(hex.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const CollarViewer: React.FC<CollarViewerProps> = ({ config, processedData }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraStateRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const viewModeRef = useRef<CollarConfig['viewMode'] | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanupScene: (() => void) | undefined;
    loadPlateEngine().then(api => {
      if (cancelled) return;
      const model = buildCollarModel(api, config, processedData);
      if (cancelled) { model.dispose(); return; }
      if (errorRef.current) errorRef.current.textContent = '';
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f172a);
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
      const modeChanged = viewModeRef.current !== config.viewMode;
      const compactView = container.clientWidth < 500;
      const defaultPosition: Record<CollarConfig['viewMode'], THREE.Vector3> = {
        assembled: new THREE.Vector3(0, 24, 125),
        exploded: new THREE.Vector3(0, 24, 150),
        plate: new THREE.Vector3(0, 8, 80),
        back: compactView ? new THREE.Vector3(92, 22, -66) : new THREE.Vector3(72, 18, -50),
        printbed: new THREE.Vector3(0, 68, 72),
      };
      camera.position.copy(!modeChanged && cameraStateRef.current?.position
        ? cameraStateRef.current.position : defaultPosition[config.viewMode]);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      container.replaceChildren(renderer.domElement);
      const controls = new OrbitControls(camera, renderer.domElement);
      applyStandardOrbitControls(controls);
      controls.minDistance = 35;
      controls.maxDistance = 240;
      controls.maxPolarAngle = Math.PI * .86;
      if (!modeChanged && cameraStateRef.current) controls.target.copy(cameraStateRef.current.target);
      viewModeRef.current = config.viewMode;
      controls.update();

      const lighting: Record<CollarConfig['lightingMode'], { ambient: number; key: number; color: number }> = {
        studio: { ambient: 1.7, key: 2.2, color: 0xffffff },
        daylight: { ambient: 2.0, key: 2.6, color: 0xfff4de },
        warm: { ambient: 1.5, key: 2.4, color: 0xffbd80 },
        neon: { ambient: 1.1, key: 2.2, color: 0x38bdf8 },
      };
      const light = lighting[config.lightingMode] ?? lighting.studio;
      scene.add(new THREE.AmbientLight(0xffffff, light.ambient));
      const key = new THREE.DirectionalLight(light.color, light.key);
      key.position.set(45, 65, 80);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x8b5cf6, config.lightingMode === 'neon' ? 1.8 : .65);
      fill.position.set(-45, 15, -25);
      scene.add(fill);
      const rear = new THREE.DirectionalLight(0xdbeafe, 3.1);
      rear.position.set(65, 35, -70);
      scene.add(rear);

      const mode = config.viewMode;
      const showStrap = mode === 'assembled' || mode === 'exploded';
      const size = COLLAR_SIZES[config.size] ?? COLLAR_SIZES.M;
      const ownedGeometry: THREE.BufferGeometry[] = [];
      const ownedMaterial: THREE.Material[] = [];
      const plateGroup = new THREE.Group();
      scene.add(plateGroup);
      const addPart = (geometry: THREE.BufferGeometry, hex: number, metalness = .1, roughness = .5) => {
        const material = new THREE.MeshStandardMaterial({ color: hex, metalness, roughness, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        ownedMaterial.push(material);
        plateGroup.add(mesh);
      };
      addPart(model.base, color(config.plateColor, 0x1e293b), .12, .47);
      if (model.border.getAttribute('position')?.count) addPart(model.border, color(config.borderColor, 0xd4af37), .6, .3);
      if (model.text.getAttribute('position')?.count) addPart(model.text, color(config.textColor, 0xffffff), .05, .5);
      if (model.logo.getAttribute('position')?.count) {
        addPart(model.logo, color(processedData?.dominantColors[0] || config.borderColor, 0xd4af37), .05, .5);
      }
      if (mode === 'back' && config.mountType === 'slide') {
        // The short ribbon illustrates the route through the manufactured
        // rear loops; it is a preview prop and is never included in exports.
        const ribbonGeo = new THREE.BoxGeometry(config.plateWidth + 24, size.width, 0.9);
        const ribbonColor = COLLAR_STRAP_COLORS[config.strapColor] ?? COLLAR_STRAP_COLORS.olive;
        const ribbonMat = new THREE.MeshStandardMaterial({
          color: ribbonColor, emissive: ribbonColor, emissiveIntensity: 0.2,
          roughness: .9, side: THREE.DoubleSide,
        });
        const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbon.position.z = -COLLAR_REAR_PASSAGE.gap / 2;
        plateGroup.add(ribbon);
        ownedGeometry.push(ribbonGeo);
        ownedMaterial.push(ribbonMat);
      }
      if (showStrap) {
        const strapMat = new THREE.MeshStandardMaterial({
          color: COLLAR_STRAP_COLORS[config.strapColor] ?? COLLAR_STRAP_COLORS.olive,
          roughness: .85, metalness: 0, side: THREE.DoubleSide,
        });
        ownedMaterial.push(strapMat);
        const strapGeo = new THREE.CylinderGeometry(size.radius, size.radius, size.width, 80, 1, true);
        if (config.mountType === 'slide') {
          // A fabric strap lies flat where it passes through the rear sleeve.
          const positions = strapGeo.getAttribute('position');
          const halfPassage = collarRearPassageLength(config.plateWidth) / 2;
          for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            if (z <= 0) continue;
            const blend = THREE.MathUtils.clamp((halfPassage + 6 - Math.abs(x)) / 6, 0, 1);
            positions.setZ(i, THREE.MathUtils.lerp(z, size.radius, blend));
          }
          strapGeo.computeVertexNormals();
        }
        ownedGeometry.push(strapGeo);
        scene.add(new THREE.Mesh(strapGeo, strapMat));
        const buckleGeo = new THREE.BoxGeometry(10, size.width + 2, 6);
        const buckleMat = new THREE.MeshStandardMaterial({ color: 0x263246, roughness: .45, metalness: .25 });
        ownedGeometry.push(buckleGeo);
        ownedMaterial.push(buckleMat);
        const buckle = new THREE.Mesh(buckleGeo, buckleMat);
        buckle.position.z = -size.radius;
        scene.add(buckle);
        const rearClearance = config.mountType === 'slide' ? COLLAR_REAR_PASSAGE.gap / 2 : 1;
        plateGroup.position.z = size.radius + (mode === 'exploded' ? 24 : rearClearance);
      } else if (mode === 'printbed') {
        plateGroup.rotation.x = -Math.PI / 2;
        plateGroup.position.y = -17;
      }
      if (mode === 'assembled' || mode === 'printbed') {
        const grid = new THREE.GridHelper(160, 40, 0x334155, 0x1e293b);
        grid.position.y = -17.1;
        ownedGeometry.push(grid.geometry);
        ownedMaterial.push(grid.material as THREE.Material);
        scene.add(grid);
      }
      const resize = () => {
        const w = Math.max(1, container.clientWidth);
        const h = Math.max(1, container.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(container);
      resize();
      let frame = 0;
      const animate = () => {
        frame = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
      cleanupScene = () => {
        cameraStateRef.current = { position: camera.position.clone(), target: controls.target.clone() };
        cancelAnimationFrame(frame);
        observer.disconnect();
        controls.dispose();
        renderer.forceContextLoss();
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
        ownedGeometry.forEach(geometry => geometry.dispose());
        ownedMaterial.forEach(material => material.dispose());
        model.dispose();
      };
    }).catch(error => {
      if (!cancelled && errorRef.current) errorRef.current.textContent = `No se pudo generar la vista 3D: ${String(error)}`;
    });
    return () => { cancelled = true; cleanupScene?.(); };
  }, [config, processedData]);

  return <div className="relative h-full w-full">
    <div ref={mountRef} className="absolute inset-0" />
    <div ref={errorRef} role="alert" className="pointer-events-none absolute inset-x-4 bottom-4 text-center text-xs text-rose-300" />
  </div>;
};
