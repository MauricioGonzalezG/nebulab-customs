import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ClickerConfig } from '../../types';
import { ProcessedClickerData } from '../../core/clickerProcessor';

interface ClickerViewerProps {
  config: ClickerConfig;
  processedData: ProcessedClickerData | null;
}

export const ClickerViewer: React.FC<ClickerViewerProps> = ({ config, processedData }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const topGroupRef = useRef<THREE.Group | null>(null);
  const baseGroupRef = useRef<THREE.Group | null>(null);
  const switchGroupRef = useRef<THREE.Group | null>(null);

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
      camera.position.set(0, 45, 65);
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
    controls.maxPolarAngle = Math.PI / 2 + 0.15;

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
    const gridHelper = new THREE.GridHelper(120, 30, 0x334155, 0x1e293b);
    gridHelper.position.y = -15;
    scene.add(gridHelper);

    // Build 3D Groups
    const topGroup = new THREE.Group();
    const baseGroup = new THREE.Group();
    const switchGroup = new THREE.Group();

    topGroupRef.current = topGroup;
    baseGroupRef.current = baseGroup;
    switchGroupRef.current = switchGroup;

    scene.add(topGroup);
    scene.add(baseGroup);
    scene.add(switchGroup);

    // Contour Points & Scale
    const pts = processedData?.contourPoints || [];
    const scale = config.size / 2;
    const isExtrudeOnly = config.renderStyle === 'extrude';

    // 1. TOP CAP BODY (SOLID EXTRUDED SHELL IN BASE/BORDER COLOR)
    const capShape = new THREE.Shape();
    if (pts.length > 0) {
      capShape.moveTo(pts[0].x * scale, -pts[0].y * scale);
      for (let i = 1; i < pts.length; i++) {
        capShape.lineTo(pts[i].x * scale, -pts[i].y * scale);
      }
      capShape.closePath();
    } else {
      capShape.absarc(0, 0, scale, 0, Math.PI * 2, false);
    }

    const bevelThick = 0.6;
    const capBodyGeo = new THREE.ExtrudeGeometry(capShape, {
      depth: config.topHeight,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.6,
      bevelThickness: bevelThick,
    });
    capBodyGeo.center();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: isExtrudeOnly ? 0xe2e8f0 : config.baseColor,
      roughness: 0.3,
      metalness: 0.1,
    });

    const capBodyMesh = new THREE.Mesh(capBodyGeo, bodyMat);
    capBodyMesh.rotation.x = Math.PI / 2;
    topGroup.add(capBodyMesh);

    // Cherry MX Stem Cross Socket Post (Underneath Cavity)
    if (config.type === 'clicker') {
      const stemPostGeo = new THREE.CylinderGeometry(2.8, 2.8, config.topHeight - 1.5, 16);
      const stemPostMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4 });
      const stemPost = new THREE.Mesh(stemPostGeo, stemPostMat);
      stemPost.position.y = -config.topHeight / 2 + 1.0;
      topGroup.add(stemPost);
    }

    // 2. TOP FACE ILLUSTRATION (CRISP FULL IMAGE TEXTURE PERFECTLY ALIGNED TO CAP SILHOUETTE)
    if (processedData && !isExtrudeOnly) {
      const topPlateGeo = new THREE.ShapeGeometry(capShape);
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

          uvs[i * 2] = config.flipHorizontal ? (1 - normU) : normU;
          uvs[i * 2 + 1] = 1 - normV;
        }



        topPlateGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      }

      const texture = new THREE.CanvasTexture(processedData.originalCanvas || processedData.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.center.set(0.5, 0.5);
      texture.rotation = ((config.imageRotation || 0) * Math.PI) / 180;
      texture.needsUpdate = true;


      const topPlateMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.2,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });

      const topPlateMesh = new THREE.Mesh(topPlateGeo, topPlateMat);
      topPlateMesh.rotation.x = Math.PI / 2;
      topPlateMesh.position.y = config.topHeight / 2 + bevelThick + 0.05;
      topGroup.add(topPlateMesh);
    }

    // 3. BASE HOUSING MESH WITH 14x14mm SWITCH CAVITY SOCKET
    const baseShape = new THREE.Shape();
    const baseScale = scale + 2.5;

    if (config.baseStyle === 'circle') {
      baseShape.absarc(0, 0, baseScale, 0, Math.PI * 2, false);
    } else if (config.baseStyle === 'square') {
      baseShape.moveTo(-baseScale, -baseScale);
      baseShape.lineTo(baseScale, -baseScale);
      baseShape.lineTo(baseScale, baseScale);
      baseShape.lineTo(-baseScale, baseScale);
      baseShape.closePath();
    } else {
      if (pts.length > 0) {
        baseShape.moveTo(pts[0].x * baseScale, -pts[0].y * baseScale);
        for (let i = 1; i < pts.length; i++) {
          baseShape.lineTo(pts[i].x * baseScale, -pts[i].y * baseScale);
        }
        baseShape.closePath();
      } else {
        baseShape.absarc(0, 0, baseScale, 0, Math.PI * 2, false);
      }
    }

    // Add 14x14mm Square Switch Socket Cavity in Base
    if (config.type === 'clicker') {
      const switchHole = new THREE.Path();
      const halfSw = 7.2;
      switchHole.moveTo(-halfSw, -halfSw);
      switchHole.lineTo(halfSw, -halfSw);
      switchHole.lineTo(halfSw, halfSw);
      switchHole.lineTo(-halfSw, halfSw);
      switchHole.closePath();
      baseShape.holes.push(switchHole);
    }

    const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
      depth: config.baseHeight,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.6,
      bevelThickness: 0.6,
    });
    baseGeo.center();

    const housingMat = new THREE.MeshStandardMaterial({
      color: isExtrudeOnly ? 0xc0c6d4 : 0xf8fafc,
      roughness: 0.2,
      metalness: 0.05,
    });

    const baseMesh = new THREE.Mesh(baseGeo, housingMat);
    baseMesh.rotation.x = Math.PI / 2;
    baseMesh.position.y = -config.baseHeight / 2 - 1;
    baseMesh.receiveShadow = true;
    baseGroup.add(baseMesh);

    // Keychain Ring Attachment Loop (Matches Base Housing Material / Color!)
    if (config.includeRing || config.type === 'keychain') {
      const ringGeo = new THREE.TorusGeometry(3.8, 1.3, 16, 32);
      const ringMesh = new THREE.Mesh(ringGeo, housingMat);

      const angleDeg = config.ringAngle ?? 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      const ringDist = baseScale + 1.8;

      // Polar base position + manual X/Y offsets and Z height slider
      const rx = Math.cos(angleRad) * ringDist + (config.ringOffsetX || 0);
      const rz = -Math.sin(angleRad) * ringDist + (config.ringOffsetY || 0);
      const ry = config.ringHeight || 0;

      ringMesh.position.set(rx, ry, rz);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.rotation.z = -angleRad + Math.PI / 2;
      baseGroup.add(ringMesh);
    }

    // 4. MECHANICAL CHERRY MX SWITCH MODEL
    if (config.type === 'clicker' && config.showSwitch) {
      const switchColor = config.switchType === 'blue' ? 0x0284c7 : config.switchType === 'brown' ? 0x78350f : 0xef4444;

      // Switch Body
      const switchBodyGeo = new THREE.BoxGeometry(14, 10, 14);
      const switchBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const switchBody = new THREE.Mesh(switchBodyGeo, switchBodyMat);
      switchBody.position.y = -3;
      switchGroup.add(switchBody);

      // Switch Stem
      const stemGeo = new THREE.BoxGeometry(4, 6, 4);
      const stemMat = new THREE.MeshStandardMaterial({ color: switchColor, roughness: 0.3 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 3;
      switchGroup.add(stem);
    }

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth Exploded View Animation
      const isExploded = config.viewMode === 'exploded';
      const targetTopY = isExploded ? 24 : 3;
      const targetBaseY = isExploded ? -12 : -1;
      const targetSwitchY = isExploded ? 6 : 0;

      topGroup.position.y += (targetTopY - topGroup.position.y) * 0.1;
      baseGroup.position.y += (targetBaseY - baseGroup.position.y) * 0.1;
      switchGroup.position.y += (targetSwitchY - switchGroup.position.y) * 0.1;

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

  return <div ref={mountRef} className="w-full h-full min-h-[380px]" />;
};
