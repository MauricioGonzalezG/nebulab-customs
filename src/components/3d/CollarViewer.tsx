import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CollarConfig } from '../../types';
import { ProcessedCollarData } from '../../core/collarProcessor';

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
};

export const CollarViewer: React.FC<CollarViewerProps> = ({ config, processedData }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const collarGroupRef = useRef<THREE.Group | null>(null);

  // Preserve camera position and target between parameter changes to prevent reset
  const cameraStateRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // slate-900
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    if (cameraStateRef.current) {
      camera.position.copy(cameraStateRef.current.position);
    } else {
      camera.position.set(0, 45, 75);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.2;

    if (cameraStateRef.current) {
      controls.target.copy(cameraStateRef.current.target);
      controls.update();
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight1.position.set(40, 70, 50);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight2.position.set(-40, 30, -40);
    scene.add(dirLight2);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(140, 35, 0x334155, 0x1e293b);
    gridHelper.position.y = -15;
    scene.add(gridHelper);

    // Main Collar Group
    const collarGroup = new THREE.Group();
    collarGroupRef.current = collarGroup;
    scene.add(collarGroup);

    const strapHex = STRAP_COLORS[config.strapColor] || 0x4d5d36;

    // 1. CURVED FABRIC COLLAR STRAP (LOOP AROUND PET NECK)
    const neckRadius = 38;
    const strapHeight = 16;


    const strapGeo = new THREE.CylinderGeometry(neckRadius, neckRadius, strapHeight, 48, 1, true);
    const strapMat = new THREE.MeshStandardMaterial({
      color: strapHex,
      roughness: 0.8,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const strapMesh = new THREE.Mesh(strapGeo, strapMat);
    strapMesh.position.y = 0;
    collarGroup.add(strapMesh);

    // Metal Buckle & Adjustment Clip on back of collar strap
    const buckleGeo = new THREE.BoxGeometry(8, strapHeight + 4, 12);
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });
    const buckleMesh = new THREE.Mesh(buckleGeo, buckleMat);
    buckleMesh.position.set(0, 0, -neckRadius);
    collarGroup.add(buckleMesh);

    // Leather Side Patch with D-Ring (as seen in photo)
    const patchGeo = new THREE.BoxGeometry(18, 12, 1);
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });
    const patchMesh = new THREE.Mesh(patchGeo, patchMat);
    patchMesh.position.set(-neckRadius * 0.7, -1, neckRadius * 0.7);
    patchMesh.rotation.y = Math.PI / 4;
    collarGroup.add(patchMesh);

    // D-Ring Metal Loop on Side Patch
    const dRingGeo = new THREE.TorusGeometry(3.5, 1.0, 16, 24, Math.PI * 1.3);
    const dRingMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.2 });
    const dRingMesh = new THREE.Mesh(dRingGeo, dRingMat);
    dRingMesh.position.set(-neckRadius * 0.7 - 7, -1, neckRadius * 0.7 + 7);
    dRingMesh.rotation.y = Math.PI / 4;
    dRingMesh.rotation.x = Math.PI / 2;
    collarGroup.add(dRingMesh);

    // 2. FRONT 3D PLATE BADGE (MOUNTED SLIDING ON THE COLLAR STRAP)
    const pW = config.plateWidth || 48;
    const pH = config.plateHeight || 34;
    const pDepth = 4.5;

    let plateShape = new THREE.Shape();
    const halfW = pW / 2;
    const halfH = pH / 2;

    if (config.plateStyle === 'rounded') {
      const radius = 6;
      plateShape.moveTo(-halfW + radius, -halfH);
      plateShape.lineTo(halfW - radius, -halfH);
      plateShape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + radius);
      plateShape.lineTo(halfW, halfH - radius);
      plateShape.quadraticCurveTo(halfW, halfH, halfW - radius, halfH);
      plateShape.lineTo(-halfW + radius, halfH);
      plateShape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - radius);
      plateShape.lineTo(-halfW, -halfH + radius);
      plateShape.quadraticCurveTo(-halfW, -halfH, -halfW + radius, -halfH);
    } else if (config.plateStyle === 'bone') {
      // Classic dog bone silhouette: wide knobs at left/right ends, narrow center
      const knobR = halfH * 0.55;
      const neckW = halfW * 0.35;
      const neckH = halfH * 0.45;
      // Start at top-center-left
      plateShape.moveTo(-neckW, neckH);
      // Left knobs
      plateShape.lineTo(-halfW + knobR, neckH);
      plateShape.absarc(-halfW + knobR, halfH - knobR, knobR, -Math.PI / 2, Math.PI, true);
      plateShape.absarc(-halfW + knobR, -halfH + knobR, knobR, Math.PI, Math.PI / 2, true);
      plateShape.lineTo(-neckW, -neckH);
      // Bottom center
      plateShape.lineTo(neckW, -neckH);
      // Right knobs
      plateShape.lineTo(halfW - knobR, -neckH);
      plateShape.absarc(halfW - knobR, -halfH + knobR, knobR, -Math.PI / 2, 0, false);
      plateShape.absarc(halfW - knobR, halfH - knobR, knobR, 0, Math.PI / 2, false);
      plateShape.lineTo(neckW, neckH);
      plateShape.closePath();
    } else {
      plateShape.moveTo(-halfW, -halfH);
      plateShape.lineTo(halfW, -halfH);
      plateShape.lineTo(halfW, halfH);
      plateShape.lineTo(-halfW, halfH);
      plateShape.closePath();
    }

    const bevelThick = 0.8;
    const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
      depth: pDepth,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.8,
      bevelThickness: bevelThick,
    });
    plateGeo.center();

    const plateColorNum = parseInt(config.plateColor.replace('#', ''), 16) || 0x1e293b;
    const plateMat = new THREE.MeshStandardMaterial({
      color: plateColorNum,
      roughness: 0.25,
      metalness: config.plateColor === '#D4AF37' ? 0.7 : 0.1,
    });

    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    // Position on front face of collar strap (z = +neckRadius)
    plateMesh.position.set(0, 0, neckRadius + pDepth / 2);
    collarGroup.add(plateMesh);

    // Side Strap Slots on Plate Back
    const slotGeo = new THREE.BoxGeometry(4, strapHeight + 2, pDepth + 2);
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    const slotLeft = new THREE.Mesh(slotGeo, slotMat);
    slotLeft.position.set(-halfW + 5, 0, neckRadius + pDepth / 2);
    collarGroup.add(slotLeft);

    const slotRight = new THREE.Mesh(slotGeo, slotMat);
    slotRight.position.set(halfW - 5, 0, neckRadius + pDepth / 2);
    collarGroup.add(slotRight);

    // 3. FRONT PLATE EMBOSSED TEXTURE (CUSTOM IMAGE / LOGO + PET NAME + PHONE)
    if (processedData) {
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

          // Mirror U so text reads correctly when viewed from +Z (front)
          uvs[i * 2] = config.flipHorizontal ? normU : (1 - normU);
          uvs[i * 2 + 1] = 1 - normV;
        }

        topPlateGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      }

      // Combine image + petName + phoneText into high-res texture canvas
      const cW = 512;
      const cH = 384;
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = cW;
      overlayCanvas.height = cH;
      const oCtx = overlayCanvas.getContext('2d');

      if (oCtx) {
        oCtx.clearRect(0, 0, cW, cH);

        // Draw user uploaded image / logo in top 65% of badge
        if (processedData.originalCanvas || processedData.canvas) {
          oCtx.drawImage(processedData.originalCanvas || processedData.canvas, 106, 20, 300, 240);
        }

        // Draw Pet Name text if provided
        if (config.petName) {
          oCtx.fillStyle = config.textColor || '#FFFFFF';
          oCtx.font = 'bold 36px Outfit, sans-serif';
          oCtx.textAlign = 'center';
          oCtx.fillText(config.petName.toUpperCase(), cW / 2, 290);
        }

        // Draw Phone text if provided
        if (config.phoneText) {
          oCtx.fillStyle = config.textColor || '#CBD5E1';
          oCtx.font = 'bold 24px Inter, sans-serif';
          oCtx.textAlign = 'center';
          oCtx.fillText(config.phoneText, cW / 2, 335);
        }
      }

      const texture = new THREE.CanvasTexture(overlayCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.center.set(0.5, 0.5);
      texture.rotation = ((config.imageRotation ?? 0) * Math.PI) / 180;
      texture.needsUpdate = true;

      const topPlateMat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.05,
        roughness: 0.2,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });

      const topPlateMesh = new THREE.Mesh(topPlateGeo, topPlateMat);
      topPlateMesh.position.set(0, 0, neckRadius + pDepth + bevelThick + 0.1);
      collarGroup.add(topPlateMesh);
    }

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // No auto-rotation — let user control the orbit freely

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
      if (camera && controls) {
        cameraStateRef.current = {
          position: camera.position.clone(),
          target: controls.target.clone(),
        };
      }
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [config, processedData]);

  return <div ref={mountRef} className="w-full h-full min-h-[420px]" />;
};
