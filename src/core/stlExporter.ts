import * as THREE from 'three';

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
  const headerText = 'LithoCraft Studio - 3D Lithophane STL Model';
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
