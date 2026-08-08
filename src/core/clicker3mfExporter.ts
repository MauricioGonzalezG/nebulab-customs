import { ClickerConfig } from '../types';
import { ProcessedClickerData } from './clickerProcessor';
import { download3MFFile, ThreeMFMeshObject } from './threeMfExporter';

interface Point2D {
  x: number;
  y: number;
}

/**
 * Generates extruded 3D prism mesh (vertices and triangles) from a 2D contour polygon
 */
function createExtrudedPolygonMesh(
  points: Point2D[],
  zMin: number,
  zMax: number,
  scaleFactor: number = 1.0
): { vertices: Array<{ x: number; y: number; z: number }>; triangles: Array<{ v1: number; v2: number; v3: number }> } {
  const vertices: Array<{ x: number; y: number; z: number }> = [];
  const triangles: Array<{ v1: number; v2: number; v3: number }> = [];

  const n = points.length;
  if (n < 3) return { vertices, triangles };

  // Bottom vertices (zMin)
  for (let i = 0; i < n; i++) {
    vertices.push({ x: points[i].x * scaleFactor, y: points[i].y * scaleFactor, z: zMin });
  }
  // Top vertices (zMax)
  for (let i = 0; i < n; i++) {
    vertices.push({ x: points[i].x * scaleFactor, y: points[i].y * scaleFactor, z: zMax });
  }

  // Center points for fan triangulation of top/bottom faces
  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += points[i].x * scaleFactor;
    sumY += points[i].y * scaleFactor;
  }
  const cx = sumX / n;
  const cy = sumY / n;

  const bottomCenterIdx = vertices.length;
  vertices.push({ x: cx, y: cy, z: zMin });
  const topCenterIdx = vertices.length;
  vertices.push({ x: cx, y: cy, z: zMax });

  // Side faces
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const b1 = i;
    const b2 = next;
    const t1 = i + n;
    const t2 = next + n;

    // Triangle 1
    triangles.push({ v1: b1, v2: b2, v3: t1 });
    // Triangle 2
    triangles.push({ v1: b2, v2: t2, v3: t1 });

    // Top cap triangle
    triangles.push({ v1: t1, v2: t2, v3: topCenterIdx });
    // Bottom cap triangle
    triangles.push({ v1: b2, v2: b1, v3: bottomCenterIdx });
  }

  return { vertices, triangles };
}

/**
 * Exports full multi-color 3MF file for Clicker or Keychain
 */
export async function downloadClicker3MF(
  processedData: ProcessedClickerData | null,
  config: ClickerConfig
): Promise<void> {
  const scale = config.size / 2;
  const topH = config.topHeight;
  const baseH = config.baseHeight;

  const rawPts = processedData?.contourPoints || [];
  const numPts = rawPts.length > 0 ? rawPts.length : 32;

  const contourPoints: Point2D[] = [];
  if (rawPts.length > 0) {
    contourPoints.push(...rawPts.map((p) => ({ x: p.x * scale, y: -p.y * scale })));
  } else {
    for (let i = 0; i < numPts; i++) {
      const angle = (i / numPts) * Math.PI * 2;
      contourPoints.push({ x: Math.cos(angle) * scale, y: Math.sin(angle) * scale });
    }
  }

  const objects: ThreeMFMeshObject[] = [];

  // Object 1: Base Housing (Color 1 - Base Color)
  const baseHousingMesh = createExtrudedPolygonMesh(contourPoints, -baseH, 0, 1.15);
  objects.push({
    id: 2,
    name: 'Cuerpo Base (Housing)',
    hexColor: config.baseColor,
    vertices: baseHousingMesh.vertices,
    triangles: baseHousingMesh.triangles,
  });

  // Object 2: Cap Base Shell (Color 1 - Base Color)
  const capBaseMesh = createExtrudedPolygonMesh(contourPoints, 0, topH, 1.0);
  objects.push({
    id: 3,
    name: 'Tapa Cap Base',
    hexColor: config.baseColor,
    vertices: capBaseMesh.vertices,
    triangles: capBaseMesh.triangles,
  });

  // Object 3: Outline Layer 1 (Color 2 - Outline Color)
  const outlineMesh = createExtrudedPolygonMesh(contourPoints, topH, topH + 1.2, 0.94);
  objects.push({
    id: 4,
    name: 'Capa 1 - Trazo Silueta',
    hexColor: config.outlineColor,
    vertices: outlineMesh.vertices,
    triangles: outlineMesh.triangles,
  });

  // Object 4: Accent Layer 2 (Color 3 - Accent Color)
  if (config.strokeMode !== 'single') {
    const accentMesh = createExtrudedPolygonMesh(contourPoints, topH + 1.2, topH + 2.0, 0.78);
    objects.push({
      id: 5,
      name: 'Capa 2 - Color Acento',
      hexColor: config.accentColor,
      vertices: accentMesh.vertices,
      triangles: accentMesh.triangles,
    });

    // Object 5: Detail Layer 3 (Color 4 - Detail Color)
    const detailMesh = createExtrudedPolygonMesh(contourPoints, topH + 2.0, topH + 2.8, 0.58);
    objects.push({
      id: 6,
      name: 'Capa 3 - Detalle Fino',
      hexColor: config.detailColor,
      vertices: detailMesh.vertices,
      triangles: detailMesh.triangles,
    });
  }

  const filename = `NebulabStudio_Clicker_Multicolor_${config.type}_${config.size}mm_${Date.now()}.3mf`;
  await download3MFFile(objects, filename);
}
