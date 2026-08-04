import * as THREE from 'three';
import { LithophaneConfig } from '../types';
import { ProcessedImageData } from './imageProcessor';

/**
 * Creates 3D Geometry for the Lithophane based on processed heightmap and config.
 */
export function createLithophaneGeometry(
  processedData: ProcessedImageData,
  config: LithophaneConfig
): THREE.BufferGeometry {
  const { width: gridW, height: gridH, luminanceMatrix } = processedData;
  const { shape, width, height, minThickness, maxThickness, arcAngle } = config;

  const segX = gridW - 1;
  const segY = gridH - 1;

  const numVertices = gridW * gridH * 2;
  const positions = new Float32Array(numVertices * 3);
  const uvs = new Float32Array(numVertices * 2);
  const indices: number[] = [];

  const arcRad = (arcAngle * Math.PI) / 180;
  const radius = arcRad > 0.01 ? width / arcRad : 1000;

  for (let y = 0; y < gridH; y++) {
    const v = y / segY;
    const posY = (0.5 - v) * height; // Centered vertically

    for (let x = 0; x < gridW; x++) {
      const u = x / segX;
      const posX = (u - 0.5) * width; // Centered horizontally

      const lum = luminanceMatrix[y * gridW + x];
      const currentThickness = minThickness + (1.0 - lum) * (maxThickness - minThickness);

      const frontIndex = (y * gridW + x);
      const backIndex = gridW * gridH + (y * gridW + x);

      let frontX = posX;
      let frontY = posY;
      let frontZ = currentThickness;

      let backX = posX;
      let backY = posY;
      let backZ = 0;

      if (shape === 'arc' && arcAngle > 0) {
        const angle = (u - 0.5) * arcRad;
        const rBack = radius;
        const rFront = radius + currentThickness;

        backX = Math.sin(angle) * rBack;
        backZ = Math.cos(angle) * rBack - radius;

        frontX = Math.sin(angle) * rFront;
        frontZ = Math.cos(angle) * rFront - radius;
      } else if (shape === 'cylinder') {
        const angle = u * Math.PI * 2;
        const cylRadius = width / (2 * Math.PI);
        const rFront = cylRadius + currentThickness;
        const rBack = cylRadius;

        backX = Math.sin(angle) * rBack;
        backZ = Math.cos(angle) * rBack;

        frontX = Math.sin(angle) * rFront;
        frontZ = Math.cos(angle) * rFront;
      }

      positions[frontIndex * 3] = frontX;
      positions[frontIndex * 3 + 1] = frontY;
      positions[frontIndex * 3 + 2] = frontZ;

      uvs[frontIndex * 2] = u;
      uvs[frontIndex * 2 + 1] = 1 - v;

      positions[backIndex * 3] = backX;
      positions[backIndex * 3 + 1] = backY;
      positions[backIndex * 3 + 2] = backZ;

      uvs[backIndex * 2] = u;
      uvs[backIndex * 2 + 1] = 1 - v;
    }
  }

  // Triangles for front surface
  for (let y = 0; y < segY; y++) {
    for (let x = 0; x < segX; x++) {
      const a = y * gridW + x;
      const b = y * gridW + (x + 1);
      const c = (y + 1) * gridW + x;
      const d = (y + 1) * gridW + (x + 1);

      indices.push(a, c, b);
      indices.push(b, c, d);

      const offset = gridW * gridH;
      indices.push(a + offset, b + offset, c + offset);
      indices.push(b + offset, c + offset, d + offset);
    }
  }

  // Edge closing
  const offset = gridW * gridH;

  for (let x = 0; x < segX; x++) {
    const f1 = x;
    const f2 = x + 1;
    const b1 = offset + x;
    const b2 = offset + x + 1;
    indices.push(f1, b1, f2);
    indices.push(f2, b1, b2);
  }

  for (let x = 0; x < segX; x++) {
    const f1 = segY * gridW + x;
    const f2 = segY * gridW + x + 1;
    const b1 = offset + segY * gridW + x;
    const b2 = offset + segY * gridW + x + 1;
    indices.push(f1, f2, b1);
    indices.push(f2, b2, b1);
  }

  for (let y = 0; y < segY; y++) {
    const f1 = y * gridW;
    const f2 = (y + 1) * gridW;
    const b1 = offset + y * gridW;
    const b2 = offset + (y + 1) * gridW;
    indices.push(f1, f2, b1);
    indices.push(f2, b2, b1);
  }

  for (let y = 0; y < segY; y++) {
    const f1 = y * gridW + segX;
    const f2 = (y + 1) * gridW + segX;
    const b1 = offset + y * gridW + segX;
    const b2 = offset + (y + 1) * gridW + segX;
    indices.push(f1, b1, f2);
    indices.push(f2, b1, b2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Creates curved frame geometry matching the EXACT curvature of the lithophane panel
 */
export function createFrameMesh(config: LithophaneConfig): THREE.Mesh | null {
  if (config.frameWidth <= 0) return null;

  const { width, height, maxThickness, frameWidth, shape, arcAngle } = config;
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.2
  });

  const frameDepth = maxThickness + 1.2;
  const arcRad = (arcAngle * Math.PI) / 180;
  const radius = (shape === 'arc' && arcRad > 0.01) ? width / arcRad : 1000;

  const totalW = width + frameWidth * 2;
  const totalH = height + frameWidth * 2;

  // We build border frame geometry procedurally matching arc formula
  const frameGeo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];

  // Helper to add extruded box along an arc
  const addArcBar = (
    uStart: number,
    uEnd: number,
    yBottom: number,
    yTop: number,
    zBack: number,
    zFront: number
  ) => {
    const startIdx = positions.length / 3;
    const numSegs = 20;

    for (let i = 0; i <= numSegs; i++) {
      const u = uStart + (i / numSegs) * (uEnd - uStart);
      const posX = (u - 0.5) * totalW;
      
      let xB = posX;
      let zB = zBack;
      let xF = posX;
      let zF = zFront;

      if (shape === 'arc' && arcAngle > 0) {
        const angle = (u - 0.5) * arcRad;
        const rB = radius + zBack;
        const rF = radius + zFront;
        xB = Math.sin(angle) * rB;
        zB = Math.cos(angle) * rB - radius;
        xF = Math.sin(angle) * rF;
        zF = Math.cos(angle) * rF - radius;
      }

      // 4 vertices per segment slice (back-bottom, back-top, front-bottom, front-top)
      positions.push(xB, yBottom, zB);
      positions.push(xB, yTop, zB);
      positions.push(xF, yBottom, zF);
      positions.push(xF, yTop, zF);
    }

    for (let i = 0; i < numSegs; i++) {
      const base = startIdx + i * 4;
      // Back face
      indices.push(base, base + 1, base + 5);
      indices.push(base, base + 5, base + 4);
      // Front face
      indices.push(base + 2, base + 6, base + 7);
      indices.push(base + 2, base + 7, base + 3);
      // Top face
      indices.push(base + 1, base + 3, base + 7);
      indices.push(base + 1, base + 7, base + 5);
      // Bottom face
      indices.push(base, base + 4, base + 6);
      indices.push(base, base + 6, base + 2);
    }
  };

  // Top Frame Bar
  addArcBar(0, 1, height / 2, totalH / 2, -0.5, frameDepth);
  // Bottom Frame Bar
  addArcBar(0, 1, -totalH / 2, -height / 2, -0.5, frameDepth);
  // Left Frame Bar
  addArcBar(0, frameWidth / totalW, -height / 2, height / 2, -0.5, frameDepth);
  // Right Frame Bar
  addArcBar(1 - frameWidth / totalW, 1, -height / 2, height / 2, -0.5, frameDepth);

  frameGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  frameGeo.setIndex(indices);
  frameGeo.computeVertexNormals();

  return new THREE.Mesh(frameGeo, frameMat);
}

/**
 * Creates Base / Stand attachment matching battery-powered LED puck lamp with EXACT vector-aligned struts
 */
export function createBaseMesh(config: LithophaneConfig): THREE.Group {
  const group = new THREE.Group();
  const { baseType, width, height, shape, arcAngle } = config;

  if (baseType === 'none') return group;

  if (baseType === 'night-light') {
    const puckMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.35,
      metalness: 0.15
    });

    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.2,
      transmission: 0.85,
      thickness: 1.0,
      emissive: config.enableLight ? 0xffeaaa : 0x000000,
      emissiveIntensity: config.enableLight ? 0.9 : 0.0
    });

    // Arc radius math
    const arcRad = (arcAngle * Math.PI) / 180;
    const radius = (shape === 'arc' && arcRad > 0.01) ? width / arcRad : 1000;

    // 1. Battery LED Puck Holder Cup Position
    const puckTargetZ = -75; // Behind lithophane
    const puckTargetY = -height / 2 + 10;
    const puckTargetX = 0;

    const cupGroup = new THREE.Group();
    cupGroup.position.set(puckTargetX, puckTargetY, puckTargetZ);
    cupGroup.rotation.x = Math.PI / 4; // 45 degrees tilt facing up-forward

    const cupOuterRadius = 26;
    const cupHeight = 30;

    // Cup outer body
    const outerGeo = new THREE.CylinderGeometry(cupOuterRadius, cupOuterRadius - 2, cupHeight, 32);
    const outerMesh = new THREE.Mesh(outerGeo, puckMat);
    cupGroup.add(outerMesh);

    // Inner battery puck light
    const puckLightGeo = new THREE.CylinderGeometry(cupOuterRadius - 3, cupOuterRadius - 3, 10, 32);
    const puckLightMesh = new THREE.Mesh(puckLightGeo, puckMat);
    puckLightMesh.position.y = 5;
    cupGroup.add(puckLightMesh);

    // LED Lens top
    const lensGeo = new THREE.CylinderGeometry(cupOuterRadius - 4, cupOuterRadius - 4, 3, 32);
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.position.y = 12;
    cupGroup.add(lensMesh);

    group.add(cupGroup);

    // 2. Three Vector-Aligned Struts (Ribs) from bottom frame curve to puck cup base
    const ribWidth = 6;
    const ribHeight = 8;

    // Calculate exact start coordinates on the bottom frame curve
    const uRatios = [0.15, 0.5, 0.85]; // Left, Center, Right points along bottom frame arc

    uRatios.forEach((u) => {
      const angle = (u - 0.5) * arcRad;

      let startX = (u - 0.5) * width;
      let startZ = 0;
      let startY = -height / 2 - 2;

      if (shape === 'arc' && arcAngle > 0) {
        startX = Math.sin(angle) * radius;
        startZ = Math.cos(angle) * radius - radius;
      }

      const startPt = new THREE.Vector3(startX, startY, startZ);
      const targetPt = new THREE.Vector3(puckTargetX, puckTargetY - 12, puckTargetZ);

      // Distance between start and target
      const distance = startPt.distanceTo(targetPt);

      // Create box geometry with length along Z axis (from 0 to distance)
      const boxGeo = new THREE.BoxGeometry(ribWidth, ribHeight, distance);
      boxGeo.translate(0, 0, distance / 2); // Shift origin to start of box

      const ribMesh = new THREE.Mesh(boxGeo, puckMat);
      ribMesh.position.copy(startPt);
      ribMesh.lookAt(targetPt); // Vector orient directly to puck cup base!

      group.add(ribMesh);
    });

  } else if (baseType === 'flat-stand' || baseType === 'led-wooden-base') {
    const isWood = baseType === 'led-wooden-base';
    const baseW = width * 1.15;
    const baseD = 50;
    const baseH = isWood ? 18 : 12;

    const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
    const baseMat = new THREE.MeshStandardMaterial({
      color: isWood ? 0x8b5a2b : 0x334155,
      roughness: isWood ? 0.7 : 0.4,
      metalness: isWood ? 0.0 : 0.1
    });

    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -height / 2 - baseH / 2, 0);
    group.add(baseMesh);

    const slotGeo = new THREE.BoxGeometry(width, 6, 8);
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const slot = new THREE.Mesh(slotGeo, slotMat);
    slot.position.set(0, -height / 2 + 1, 0);
    group.add(slot);
  }

  return group;
}

/**
 * Creates custom material simulating PLA plastic solidity & ItsLitho grayscale photo texture with backlight illumination
 */
export function createLithophaneMaterial(
  config: LithophaneConfig,
  texture?: THREE.Texture | null
): THREE.MeshStandardMaterial {
  const { material, enableLight, lightWarmth, lightIntensity } = config;

  let baseColor = 0xffffff;
  if (material === 'warm-ivory') baseColor = 0xfff8e7;
  if (material === 'marble') baseColor = 0xf5f5f5;
  if (material === 'glow-blue') baseColor = 0xe0f7fa;

  const warmColor = new THREE.Color(0xffffff).lerp(new THREE.Color(0xffaa55), lightWarmth / 100);

  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    map: texture || null,
    roughness: 0.55,
    metalness: 0.05,
    transparent: false, // 100% Solid opaque object to prevent depth sorting artifacts
    depthWrite: true,
    depthTest: true,
    emissive: enableLight ? warmColor : new THREE.Color(0x000000),
    emissiveMap: enableLight ? (texture || null) : null,
    emissiveIntensity: enableLight ? (lightIntensity / 100) * 1.2 : 0.0,
    side: THREE.DoubleSide
  });

  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    mat.needsUpdate = true;
  }

  return mat;
}
