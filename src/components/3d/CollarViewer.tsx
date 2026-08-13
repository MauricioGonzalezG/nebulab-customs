import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CollarConfig, CollarPlateStyle } from '../../types';
import { ProcessedCollarData } from '../../core/collarProcessor';
import { applyStandardOrbitControls } from './viewerControls';

interface CollarViewerProps {
  config: CollarConfig;
  processedData: ProcessedCollarData | null;
}

const STRAP_COLORS: Record<string, number> = {
  olive: 0x4d5d36,   // Military Olive Green
  crimson: 0x991b1b, // Crimson Red
  black: 0x1e293b,   // Slate Black
  navy: 0x1e3a8a,    // Navy Blue
  pink: 0xbe185d,    // Hot Pink
  brown: 0x78350f,   // Saddle Leather Brown
  yellow: 0xeab308,  // Neon Yellow
};

/**
 * Builds 2D shape for Pet ID Tag plates in XY plane (Up is +Y, Right is +X)
 */
export function createCollarPlateShape(
  style: CollarPlateStyle,
  width: number,
  height: number,
  pts: Array<{ x: number; y: number }> = [],
  bevelRadius: number = 2.0
): THREE.Shape {
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const halfH = height / 2;

  switch (style) {
    case 'bone': {
      // Classic dog bone silhouette in XY plane
      const knobR = halfH * 0.52;
      const neckW = halfW * 0.40;
      const neckH = halfH * 0.45;

      shape.moveTo(-neckW, neckH);
      shape.lineTo(-halfW + knobR, neckH);
      shape.absarc(-halfW + knobR, halfH - knobR, knobR, Math.PI / 2, Math.PI, false);
      shape.absarc(-halfW + knobR, -halfH + knobR, knobR, Math.PI, -Math.PI / 2, false);
      shape.lineTo(-neckW, -neckH);
      shape.lineTo(neckW, -neckH);
      shape.lineTo(halfW - knobR, -neckH);
      shape.absarc(halfW - knobR, -halfH + knobR, knobR, -Math.PI / 2, 0, false);
      shape.absarc(halfW - knobR, halfH - knobR, knobR, 0, Math.PI / 2, false);
      shape.lineTo(neckW, neckH);
      shape.closePath();
      break;
    }

    case 'circle': {
      const r = Math.min(halfW, halfH);
      shape.absarc(0, 0, r, 0, Math.PI * 2, false);
      break;
    }

    case 'shield': {
      const sX = halfW;
      const sY = halfH;
      shape.moveTo(-sX * 0.9, sY * 0.9);
      shape.lineTo(sX * 0.9, sY * 0.9);
      shape.lineTo(sX * 0.9, -sY * 0.1);
      shape.bezierCurveTo(sX * 0.9, -sY * 0.7, 0, -sY * 1.05, 0, -sY * 1.05);
      shape.bezierCurveTo(0, -sY * 1.05, -sX * 0.9, -sY * 0.7, -sX * 0.9, -sY * 0.1);
      shape.closePath();
      break;
    }

    case 'heart': {
      const s = Math.min(halfW, halfH) * 0.038;
      shape.moveTo(0, 15 * s);
      shape.bezierCurveTo(25 * s, 35 * s, 35 * s, 10 * s, 35 * s, -10 * s);
      shape.bezierCurveTo(35 * s, -25 * s, 20 * s, -35 * s, 0, -45 * s);
      shape.bezierCurveTo(-20 * s, -35 * s, -35 * s, -25 * s, -35 * s, -10 * s);
      shape.bezierCurveTo(-35 * s, 10 * s, -25 * s, 35 * s, 0, 15 * s);
      shape.closePath();
      break;
    }

    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(angle) * (halfW * 0.95);
        const y = Math.sin(angle) * (halfH * 0.95);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      break;
    }

    case 'pill': {
      const r = halfH * 0.85;
      shape.moveTo(-halfW + r, -r);
      shape.lineTo(halfW - r, -r);
      shape.absarc(halfW - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
      shape.lineTo(-halfW + r, r);
      shape.absarc(-halfW + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
      shape.closePath();
      break;
    }

    case 'silhouette': {
      if (pts.length > 2) {
        shape.moveTo(pts[0].x * halfW, -pts[0].y * halfH);
        for (let i = 1; i < pts.length; i++) {
          shape.lineTo(pts[i].x * halfW, -pts[i].y * halfH);
        }
        shape.closePath();
      } else {
        shape.absarc(0, 0, Math.min(halfW, halfH), 0, Math.PI * 2, false);
      }
      break;
    }

    case 'rectangle': {
      shape.moveTo(-halfW, -halfH);
      shape.lineTo(halfW, -halfH);
      shape.lineTo(halfW, halfH);
      shape.lineTo(-halfW, halfH);
      shape.closePath();
      break;
    }

    case 'rounded':
    default: {
      const r = Math.min(bevelRadius * 3, halfH * 0.4, halfW * 0.4);
      shape.moveTo(-halfW + r, -halfH);
      shape.lineTo(halfW - r, -halfH);
      shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
      shape.lineTo(halfW, halfH - r);
      shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
      shape.lineTo(-halfW + r, halfH);
      shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
      shape.lineTo(-halfW, -halfH + r);
      shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);
      shape.closePath();
      break;
    }
  }

  return shape;
}

export const CollarViewer: React.FC<CollarViewerProps> = ({ config, processedData }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraStateRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // slate-900

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    if (cameraStateRef.current) {
      camera.position.copy(cameraStateRef.current.position);
    } else {
      camera.position.set(0, 30, 85);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    applyStandardOrbitControls(controls);
    controls.maxPolarAngle = Math.PI / 2 + 0.25;

    if (cameraStateRef.current) {
      controls.target.copy(cameraStateRef.current.target);
      controls.update();
    }

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.4);
    dirLight1.position.set(45, 75, 55);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.0);
    dirLight2.position.set(-45, 30, -45);
    scene.add(dirLight2);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(140, 35, 0x334155, 0x1e293b);
    gridHelper.position.y = -16;
    scene.add(gridHelper);

    // 3. Main Collar Group (Cylinder Strap, Buckle, D-Ring, Badge)
    const collarGroup = new THREE.Group();
    scene.add(collarGroup);

    const neckRadius = 38;
    const strapHeight = 16;
    const strapHex = STRAP_COLORS[config.strapColor] || 0x4d5d36;

    // A. Curved Nylon/Fabric Strap Loop around Neck
    const strapGeo = new THREE.CylinderGeometry(neckRadius, neckRadius, strapHeight, 64, 1, true);
    const strapMat = new THREE.MeshStandardMaterial({
      color: strapHex,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const strapMesh = new THREE.Mesh(strapGeo, strapMat);
    collarGroup.add(strapMesh);

    // B. Back Safety Buckle Clip
    const buckleGeo = new THREE.BoxGeometry(8, strapHeight + 4, 12);
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.7 });
    const buckleMesh = new THREE.Mesh(buckleGeo, buckleMat);
    buckleMesh.position.set(0, 0, -neckRadius);
    collarGroup.add(buckleMesh);

    // C. Side Leather Patch with D-Ring
    const patchGeo = new THREE.BoxGeometry(18, 12, 1);
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });
    const patchMesh = new THREE.Mesh(patchGeo, patchMat);
    patchMesh.position.set(-neckRadius * 0.7, -1, neckRadius * 0.7);
    patchMesh.rotation.y = Math.PI / 4;
    collarGroup.add(patchMesh);

    // D. Metal D-Ring Loop on Side
    const dRingGeo = new THREE.TorusGeometry(3.5, 1.0, 16, 24, Math.PI * 1.3);
    const dRingMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.2 });
    const dRingMesh = new THREE.Mesh(dRingGeo, dRingMat);
    dRingMesh.position.set(-neckRadius * 0.7 - 7, -1, neckRadius * 0.7 + 7);
    dRingMesh.rotation.y = Math.PI / 4;
    dRingMesh.rotation.x = Math.PI / 2;
    collarGroup.add(dRingMesh);

    // 4. FRONT 3D PLATE BADGE (Mounted on Front face of Collar at +Z)
    const pW = config.plateWidth || 50;
    const pH = config.plateHeight || 35;
    const pDepth = config.plateThickness || 4.5;
    const pBevel = Math.min(1.0, config.plateBevel || 0.8);

    const pts = processedData?.contourPoints || [];
    const plateShape = createCollarPlateShape(config.plateStyle, pW, pH, pts, pBevel);

    const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
      depth: pDepth,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: pBevel,
      bevelThickness: pBevel,
    });
    plateGeo.center();
    plateGeo.computeVertexNormals();

    const isMetallic = config.plateColor === '#D4AF37' || config.plateColor === '#EAB308';
    const plateColorNum = parseInt((config.plateColor || '#1E293B').replace('#', ''), 16) || 0x1e293b;
    const plateMat = new THREE.MeshStandardMaterial({
      color: plateColorNum,
      roughness: isMetallic ? 0.25 : 0.35,
      metalness: isMetallic ? 0.8 : 0.1,
    });

    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.castShadow = true;
    plateMesh.receiveShadow = true;

    // Position on front of collar
    const isExploded = config.viewMode === 'exploded';
    const plateZ = isExploded ? neckRadius + pDepth / 2 + 25 : neckRadius + pDepth / 2;
    plateMesh.position.set(0, 0, plateZ);
    collarGroup.add(plateMesh);

    // 5. FRONT ENGRAVED EMBOSS/PRINT TEXTURE (LOGO + PET NAME + PHONE)
    const topPlateGeo = new THREE.ShapeGeometry(plateShape);
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

        // Front-facing UV coordinates (natural upright)
        uvs[i * 2] = config.flipHorizontal ? (1 - normU) : normU;
        uvs[i * 2 + 1] = normV;
      }

      topPlateGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }

    // Render 2D canvas with logo, pet name and phone
    const cW = 512;
    const cH = 384;
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = cW;
    overlayCanvas.height = cH;
    const oCtx = overlayCanvas.getContext('2d');

    if (oCtx) {
      oCtx.clearRect(0, 0, cW, cH);

      // Logo / Graphic in upper section
      const activeImg = processedData?.originalCanvas || processedData?.canvas;
      if (activeImg) {
        const imgSize = 180;
        oCtx.drawImage(activeImg, (cW - imgSize) / 2, 25, imgSize, 140);
      }

      // Pet Name in middle section
      if (config.petName) {
        oCtx.fillStyle = config.textColor || '#FFFFFF';
        oCtx.font = '900 42px Outfit, Inter, sans-serif';
        oCtx.textAlign = 'center';
        oCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        oCtx.shadowBlur = 6;
        oCtx.fillText(config.petName.toUpperCase(), cW / 2, 235);
        oCtx.shadowBlur = 0;
      }

      // Phone Number in lower section
      if (config.phoneText) {
        oCtx.fillStyle = config.textColor || '#CBD5E1';
        oCtx.font = 'bold 28px Inter, sans-serif';
        oCtx.textAlign = 'center';
        oCtx.fillText(config.phoneText, cW / 2, 285);
      }
    }

    const texture = new THREE.CanvasTexture(overlayCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const topPlateMat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.25,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const topPlateMesh = new THREE.Mesh(topPlateGeo, topPlateMat);
    topPlateMesh.position.set(0, 0, plateZ + pDepth / 2 + pBevel + 0.15);
    collarGroup.add(topPlateMesh);

    // 6. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
      renderer.dispose();
    };
  }, [config, processedData]);

  return <div ref={mountRef} className="w-full h-full min-h-[420px]" />;
};
