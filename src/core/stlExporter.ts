import * as THREE from 'three';
import { LithophaneConfig } from '../types';
import { ProcessedImageData, processImageForLithophane } from './imageProcessor';
import { createBaseMesh, createFrameMesh, createLithophaneGeometry } from './lithophaneBuilder';

/**
 * Upscales luminance matrix via smooth bilinear sampling for ultra-high poly 3D printing STL export.
 */
function upscaleLuminanceMatrix(data: ProcessedImageData, targetResolution = 850): ProcessedImageData {
  const origW = data.width;
  const origH = data.height;
  const targetW = targetResolution;
  const targetH = Math.round(targetResolution / data.aspectRatio);

  if (origW >= targetW && origH >= targetH) {
    return data;
  }

  const newMatrix = new Float32Array(targetW * targetH);
  const src = data.luminanceMatrix;

  for (let ty = 0; ty < targetH; ty++) {
    const srcY = (ty / Math.max(1, targetH - 1)) * (origH - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(origH - 1, y0 + 1);
    const dy = srcY - y0;

    for (let tx = 0; tx < targetW; tx++) {
      const srcX = (tx / Math.max(1, targetW - 1)) * (origW - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(origW - 1, x0 + 1);
      const dx = srcX - x0;

      const v00 = src[y0 * origW + x0];
      const v10 = src[y0 * origW + x1];
      const v01 = src[y1 * origW + x0];
      const v11 = src[y1 * origW + x1];

      const val = (v00 * (1 - dx) + v10 * dx) * (1 - dy) + (v01 * (1 - dx) + v11 * dx) * dy;
      newMatrix[ty * targetW + tx] = val;
    }
  }

  return {
    ...data,
    width: targetW,
    height: targetH,
    luminanceMatrix: newMatrix
  };
}

/**
 * Downloads a clean printable 3D STL file at ultra high polygon resolution (850px resolution grid).
 */
export function downloadLithophaneSTL(
  processedData: ProcessedImageData,
  config: LithophaneConfig,
  filename?: string,
  imgElement?: HTMLImageElement | null
): void {
  // Ensure printable 3D model excludes the removable battery puck lamp
  const stlConfig: LithophaneConfig = {
    ...config,
    showLampPuck: false
  };

  // Generate ultra high resolution mesh (850px grid = ~1M+ polygons for micro 3D print detail)
  let highResData: ProcessedImageData = processedData;
  if (imgElement) {
    highResData = processImageForLithophane(imgElement, {
      brightness: config.brightness,
      contrast: config.contrast,
      invert: config.invert,
      gridResolution: 850
    });
  } else if (processedData) {
    highResData = upscaleLuminanceMatrix(processedData, 850);
  }

  const exportGroup = new THREE.Group();

  const geo = createLithophaneGeometry(highResData, stlConfig);
  const mat = new THREE.MeshBasicMaterial();
  const lithoMesh = new THREE.Mesh(geo, mat);
  exportGroup.add(lithoMesh);

  const frameMesh = createFrameMesh(stlConfig);
  if (frameMesh) {
    frameMesh.position.set(0, 0, 0);
    exportGroup.add(frameMesh);
  }

  const baseGroup = createBaseMesh(stlConfig);
  exportGroup.add(baseGroup);

  exportGroup.updateMatrixWorld(true);

  const name = filename || `Litofania_Fabricacion_3D_UltraHD_${stlConfig.shape}_${Date.now()}.stl`;
  exportToSTL(exportGroup, name);
}

/**
 * Custom STL Exporter for Three.js geometries to avoid external heavy dependencies.
 * Converts Three.js mesh/group into a standard downloadable binary .STL file for 3D printing.
 */
export function exportToSTL(object: THREE.Object3D, filename: string = 'lithophane.stl'): void {
  const meshes: THREE.Mesh[] = [];

  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshes.push(child as THREE.Mesh);
    }
  });

  if (meshes.length === 0) {
    alert('No 3D mesh found to export.');
    return;
  }

  // Count total triangles
  let totalTriangles = 0;
  meshes.forEach((mesh) => {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    const index = geo.index;
    const pos = geo.attributes.position;
    if (index) {
      totalTriangles += index.count / 3;
    } else if (pos) {
      totalTriangles += pos.count / 3;
    }
  });

  // Binary STL Buffer calculation: 80 byte header + 4 byte triangle count + (50 bytes per triangle)
  const bufferSize = 84 + totalTriangles * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  // Write 80-byte header
  const headerText = 'Nebulab Studio - 3D Lithophane STL Model';
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < headerText.length ? headerText.charCodeAt(i) : 32);
  }

  // Write total triangle count
  dataView.setUint32(80, totalTriangles, true);

  let offset = 84;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const normal = new THREE.Vector3();

  meshes.forEach((mesh) => {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    const pos = geo.attributes.position;
    const index = geo.index;

    const getVertex = (idx: number, target: THREE.Vector3) => {
      target.set(pos.getX(idx), pos.getY(idx), pos.getZ(idx));
    };

    const writeTriangle = (a: number, b: number, c: number) => {
      getVertex(a, vA);
      getVertex(b, vB);
      getVertex(c, vC);

      // Compute normal
      const cb = new THREE.Vector3().subVectors(vC, vB);
      const ab = new THREE.Vector3().subVectors(vA, vB);
      normal.crossVectors(cb, ab).normalize();

      // Write normal (3 floats)
      dataView.setFloat32(offset, normal.x, true); offset += 4;
      dataView.setFloat32(offset, normal.y, true); offset += 4;
      dataView.setFloat32(offset, normal.z, true); offset += 4;

      // Write Vertices (3 vertices * 3 floats = 9 floats)
      dataView.setFloat32(offset, vA.x, true); offset += 4;
      dataView.setFloat32(offset, vA.y, true); offset += 4;
      dataView.setFloat32(offset, vA.z, true); offset += 4;

      dataView.setFloat32(offset, vB.x, true); offset += 4;
      dataView.setFloat32(offset, vB.y, true); offset += 4;
      dataView.setFloat32(offset, vB.z, true); offset += 4;

      dataView.setFloat32(offset, vC.x, true); offset += 4;
      dataView.setFloat32(offset, vC.y, true); offset += 4;
      dataView.setFloat32(offset, vC.z, true); offset += 4;

      // Attribute byte count (2 uint8 bytes = 0)
      dataView.setUint16(offset, 0, true); offset += 2;
    };

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        writeTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2));
      }
    } else if (pos) {
      for (let i = 0; i < pos.count; i += 3) {
        writeTriangle(i, i + 1, i + 2);
      }
    }
  });

  // Create Blob and download link
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
