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
 * Creates 100% solid, perfectly curved 3D frame ring with zero gaps and zero mesh glitches
 */
export function createFrameMesh(config: LithophaneConfig): THREE.Mesh | null {
  if (config.frameWidth <= 0) return null;

  const { width, height, maxThickness, frameWidth, shape, arcAngle } = config;
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.7,
    metalness: 0.1,
    // The outer side of a curved frame can face away from the camera
    // depending on the viewing angle; keep the solid side visible then.
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });

  const outerW = width + frameWidth * 2;
  const outerH = height + frameWidth * 2;
  const arcRad = (arcAngle * Math.PI) / 180;
  const radius = (shape === 'arc' && arcRad > 0.01) ? width / arcRad : 1000;

  const vFrame = frameWidth / outerH;
  // Let the side bars overlap the lithophane edge slightly so its textured
  // closing face cannot peek through at oblique viewing angles.
  const sideBarU = (frameWidth + Math.min(1, frameWidth * 0.5)) / outerW;

  const positions: number[] = [];
  const indices: number[] = [];

  const getPos = (u: number, v: number, isFront: boolean) => {
    const angle = (u - 0.5) * arcRad;
    const r = isFront ? (radius + maxThickness + 0.6) : (radius - 0.6);
    const x = (shape === 'arc' && arcAngle > 0) ? Math.sin(angle) * r : (u - 0.5) * outerW;
    const z = (shape === 'arc' && arcAngle > 0) ? Math.cos(angle) * r - radius : (isFront ? maxThickness + 0.6 : -0.6);
    const y = (0.5 - v) * outerH;
    return [x, y, z];
  };

  const addBoxSection = (u1: number, u2: number, v1: number, v2: number, uSegs: number, vSegs: number) => {
    for (let iv = 0; iv < vSegs; iv++) {
      const vStart = v1 + (iv / vSegs) * (v2 - v1);
      const vEnd = v1 + ((iv + 1) / vSegs) * (v2 - v1);

      for (let iu = 0; iu < uSegs; iu++) {
        const uStart = u1 + (iu / uSegs) * (u2 - u1);
        const uEnd = u1 + ((iu + 1) / uSegs) * (u2 - u1);

        const baseIdx = positions.length / 3;

        // 8 vertices for box cell
        positions.push(...getPos(uStart, vStart, true));  // 0: Front Top-Left
        positions.push(...getPos(uEnd, vStart, true));    // 1: Front Top-Right
        positions.push(...getPos(uStart, vEnd, true));    // 2: Front Bottom-Left
        positions.push(...getPos(uEnd, vEnd, true));      // 3: Front Bottom-Right

        positions.push(...getPos(uStart, vStart, false)); // 4: Back Top-Left
        positions.push(...getPos(uEnd, vStart, false));   // 5: Back Top-Right
        positions.push(...getPos(uStart, vEnd, false));   // 6: Back Bottom-Left
        positions.push(...getPos(uEnd, vEnd, false));     // 7: Back Bottom-Right

        // Front Face
        indices.push(baseIdx + 0, baseIdx + 2, baseIdx + 1);
        indices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);

        // Back Face
        indices.push(baseIdx + 4, baseIdx + 5, baseIdx + 6);
        indices.push(baseIdx + 5, baseIdx + 7, baseIdx + 6);

        // Top Face
        indices.push(baseIdx + 0, baseIdx + 1, baseIdx + 4);
        indices.push(baseIdx + 1, baseIdx + 5, baseIdx + 4);

        // Bottom Face
        indices.push(baseIdx + 2, baseIdx + 6, baseIdx + 3);
        indices.push(baseIdx + 3, baseIdx + 6, baseIdx + 7);

        // Left Face
        indices.push(baseIdx + 0, baseIdx + 4, baseIdx + 2);
        indices.push(baseIdx + 2, baseIdx + 4, baseIdx + 6);

        // Right Face
        indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 5);
        indices.push(baseIdx + 3, baseIdx + 7, baseIdx + 5);
      }
    }
  };

  // Top Frame Bar (40 smooth arc segments)
  addBoxSection(0, 1, 0, vFrame, 40, 1);
  // Bottom Frame Bar (40 smooth arc segments)
  addBoxSection(0, 1, 1 - vFrame, 1, 40, 1);
  // Left Side Bar
  addBoxSection(0, sideBarU, vFrame, 1 - vFrame, 1, 10);
  // Right Side Bar
  addBoxSection(1 - sideBarU, 1, vFrame, 1 - vFrame, 1, 10);

  const frameGeo = new THREE.BufferGeometry();
  frameGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  frameGeo.setIndex(indices);
  frameGeo.computeVertexNormals();

  return new THREE.Mesh(frameGeo, frameMat);
}

/**
 * Creates Base / Stand attachment matching battery-powered LED puck lamp (exact to CAD reference images 1, 2 & 3)
 */
export function createBaseMesh(config: LithophaneConfig): THREE.Group {
  const group = new THREE.Group();
  const {
    baseType,
    width,
    height,
    shape,
    arcAngle,
    puckDiameter = 70,
    puckDepth = 25,
    puckAngle = 55,
    puckArcCoverage = 180,
    strutCount = 4
  } = config;

  if (baseType === 'none') return group;

  if (baseType === 'night-light') {
    const puckMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd, // Clean white/light gray PLA plastic
      roughness: 0.35,
      metalness: 0.1
    });

    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.2,
      transmission: 0.85,
      thickness: 1.0,
      emissive: config.enableLight ? 0xffeaaa : 0x000000,
      emissiveIntensity: config.enableLight ? 0.9 : 0.0
    });

    const arcRad = (arcAngle * Math.PI) / 180;
    const radius = (shape === 'arc' && arcRad > 0.01) ? width / arcRad : 1000;

    const rOut = puckDiameter / 2;
    const rIn = rOut - 3.5;
    const tiltRad = (puckAngle * Math.PI) / 180;

    // Floor Level: Lowest Y of the lithophane frame (sitting flush on print bed)
    const frameMargin = config.frameWidth || 0;
    const floorY = -height / 2 - frameMargin;

    // 1. Support Beams (sitting flush on floor Y = floorY, extending to the back)
    const beamH = 5;
    const beamW = 6;
    const beamLength = config.strutLength !== undefined ? config.strutLength : 60;
    const puckDistanceZ = -beamLength;

    const uPoints: number[] = [];
    const count = Math.max(2, strutCount);
    for (let i = 0; i < count; i++) {
      uPoints.push(0.08 + (i / (count - 1)) * 0.84);
    }

    // Beams center Y is floorY + beamH/2 so their bottom is flush with floorY
    const targetPt = new THREE.Vector3(0, floorY + beamH / 2, puckDistanceZ);

    uPoints.forEach((u) => {
      const angle = (u - 0.5) * arcRad;
      const isArc = shape === 'arc' && arcAngle > 0;

      let startX = (u - 0.5) * width;
      let startZ = -0.6; // Back of frame/lithophane

      if (isArc) {
        startX = Math.sin(angle) * radius;
        startZ = Math.cos(angle) * radius - radius - 0.6;
      }

      const startPt = new THREE.Vector3(startX, floorY + beamH / 2, startZ);
      const distance = startPt.distanceTo(targetPt);

      const boxGeo = new THREE.BoxGeometry(beamW, beamH, distance);
      boxGeo.translate(0, 0, distance / 2);

      const beamMesh = new THREE.Mesh(boxGeo, puckMat);
      beamMesh.position.copy(startPt);
      beamMesh.lookAt(targetPt);
      beamMesh.updateMatrixWorld(true);

      // Trim the frame-side end of the connector so it sits perfectly flush
      // with the back of the frame. A plain rectangular (straight) end either
      // sticks out past the curved surface or leaves a gap on one side, so
      // every rear vertex is projected exactly onto the back surface and then
      // nudged 0.1mm inward to guarantee a solid, gapless printable joint.
      const beamDir = new THREE.Vector3().subVectors(targetPt, startPt).normalize();
      const frameTopY = floorY + frameMargin;
      const posAttr = boxGeo.attributes.position as THREE.BufferAttribute;
      const vertex = new THREE.Vector3();

      for (let i = 0; i < posAttr.count; i++) {
        // Only reshape the connector end touching the frame (local z = 0)
        if (Math.abs(posAttr.getZ(i)) > 1e-4) continue;

        vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        beamMesh.localToWorld(vertex);

        // The frame back sits 0.6mm behind the lithophane back surface
        const surfaceInset = frameMargin > 0 && vertex.y <= frameTopY ? 0.6 : 0;

        if (isArc) {
          // Curved back = vertical cylinder whose axis passes through (0, -radius).
          // Ray (vertex + t * beamDir) to cylinder intersection on the XZ plane.
          const surfaceR = radius - surfaceInset;
          const a = beamDir.x * beamDir.x + beamDir.z * beamDir.z;
          const b = 2 * (vertex.x * beamDir.x + (vertex.z + radius) * beamDir.z);
          const c = vertex.x * vertex.x + (vertex.z + radius) * (vertex.z + radius) - surfaceR * surfaceR;
          const discriminant = b * b - 4 * a * c;
          if (a > 1e-9 && discriminant >= 0) {
            const root = Math.sqrt(discriminant);
            const t1 = (-b + root) / (2 * a);
            const t2 = (-b - root) / (2 * a);
            const t = Math.abs(t1) < Math.abs(t2) ? t1 : t2; // nearest surface hit
            vertex.x += beamDir.x * t;
            vertex.y += beamDir.y * t;
            vertex.z += beamDir.z * t;
          }
          // Nudge slightly inward along the local radial normal
          const radialLen = Math.hypot(vertex.x, vertex.z + radius) || 1;
          vertex.x += (vertex.x / radialLen) * 0.1;
          vertex.z += ((vertex.z + radius) / radialLen) * 0.1;
        } else {
          // Flat back plane
          const targetZ = -surfaceInset;
          if (Math.abs(beamDir.z) > 1e-9) {
            const t = (targetZ - vertex.z) / beamDir.z;
            vertex.x += beamDir.x * t;
            vertex.y += beamDir.y * t;
            vertex.z += beamDir.z * t;
          }
          vertex.z += 0.1;
        }

        beamMesh.worldToLocal(vertex);
        posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      posAttr.needsUpdate = true;
      boxGeo.computeVertexNormals();

      group.add(beamMesh);
    });

    // 2. Cup Group (Shifted horizontally so its front base meets the rear end of connectors)
    const cupGroup = new THREE.Group();
    const cupZ = puckDistanceZ - rOut * Math.cos(tiltRad);

    // Start at a neutral height. The final height is calculated after all cup
    // pieces are added so bevels and the tilt cannot cross the print plane.
    cupGroup.position.set(0, 0, cupZ);
    cupGroup.rotation.x = tiltRad;

    // C-Shaped Open Socket Wall (Hollow C-cup with open notch pointing STRAIGHT UPWARDS)
    const coverageRad = ((puckArcCoverage || 240) * Math.PI) / 180;
    const startAngle = -Math.PI / 2 - coverageRad / 2;
    const endAngle = -Math.PI / 2 + coverageRad / 2;
    const segs = 36;

    const cWallShape = new THREE.Shape();
    for (let i = 0; i <= segs; i++) {
      const a = startAngle + (i / segs) * (endAngle - startAngle);
      const x = Math.cos(a) * rOut;
      const y = Math.sin(a) * rOut;
      if (i === 0) cWallShape.moveTo(x, y);
      else cWallShape.lineTo(x, y);
    }
    for (let i = segs; i >= 0; i--) {
      const a = startAngle + (i / segs) * (endAngle - startAngle);
      const x = Math.cos(a) * rIn;
      const y = Math.sin(a) * rIn;
      cWallShape.lineTo(x, y);
    }
    cWallShape.closePath();

    const wallGeo = new THREE.ExtrudeGeometry(cWallShape, {
      depth: puckDepth,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.5,
      bevelSegments: 2
    });
    wallGeo.rotateX(-Math.PI / 2);
    const wallMesh = new THREE.Mesh(wallGeo, puckMat);
    cupGroup.add(wallMesh);

    // Hollow Bottom Base Floor Plate
    const floorShape = new THREE.Shape();
    floorShape.moveTo(0, 0);
    for (let i = 0; i <= segs; i++) {
      const a = startAngle + (i / segs) * (endAngle - startAngle);
      floorShape.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
    }
    floorShape.closePath();

    const floorGeo = new THREE.ExtrudeGeometry(floorShape, { depth: 4, bevelEnabled: false });
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, puckMat);
    cupGroup.add(floorMesh);

    // Top Collar Lip Ring
    const lipShape = new THREE.Shape();
    for (let i = 0; i <= segs; i++) {
      const a = startAngle + (i / segs) * (endAngle - startAngle);
      const x = Math.cos(a) * rOut;
      const y = Math.sin(a) * rOut;
      if (i === 0) lipShape.moveTo(x, y);
      else lipShape.lineTo(x, y);
    }
    for (let i = segs; i >= 0; i--) {
      const a = startAngle + (i / segs) * (endAngle - startAngle);
      const x = Math.cos(a) * (rOut - 1.8);
      const y = Math.sin(a) * (rOut - 1.8);
      lipShape.lineTo(x, y);
    }
    lipShape.closePath();

    const lipGeo = new THREE.ExtrudeGeometry(lipShape, { depth: 2.5, bevelEnabled: false });
    lipGeo.rotateX(-Math.PI / 2);
    const lipMesh = new THREE.Mesh(lipGeo, puckMat);
    lipMesh.position.y = puckDepth - 2.5;
    cupGroup.add(lipMesh);

    // Removable Battery LED Puck Light inside hollow socket (Toggled via showLampPuck)
    if (config.showLampPuck !== false) {
      const puckLightGeo = new THREE.CylinderGeometry(rIn - 0.5, rIn - 0.5, puckDepth - 8, 36);
      const puckLightMesh = new THREE.Mesh(puckLightGeo, puckMat);
      puckLightMesh.position.y = (puckDepth - 8) / 2 + 2;
      cupGroup.add(puckLightMesh);

      // LED Diffuser Lens Top
      const lensGeo = new THREE.CylinderGeometry(rIn - 2, rIn - 2, 3, 36);
      const lensMesh = new THREE.Mesh(lensGeo, lensMat);
      lensMesh.position.y = puckDepth - 3.5;
      cupGroup.add(lensMesh);
    }

    // Keep the lowest point of the complete socket safely above the frame floor.
    const cupBounds = new THREE.Box3().setFromObject(cupGroup);
    const floorClearance = 0.2;
    cupGroup.position.y = floorY - cupBounds.min.y + floorClearance;

    group.add(cupGroup);

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
