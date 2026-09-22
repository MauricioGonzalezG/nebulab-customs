import * as THREE from 'three';
import JSZip from 'jszip';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { buildPlate, loadPlateEngine, PlateConfig, PlateModel } from './plateBuilder';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function exportPlate(model: PlateModel, config: PlateConfig, format: 'stl' | '3mf') {
  const filename = `Nebulab_Placa_${config.text.replace(/[^A-Z0-9]/g, '') || 'Personalizada'}`;
  if (format === 'stl') {
    const material = new THREE.MeshBasicMaterial();
    try {
      const data = new STLExporter().parse(new THREE.Mesh(model.solid, material), { binary: true });
      download(new Blob([new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice()], { type: 'model/stl' }), `${filename}.stl`);
    } finally { material.dispose(); }
    return;
  }
  const meshXml = (geometry: THREE.BufferGeometry, id: number, name: string, colorIndex: number) => {
    const position = geometry.getAttribute('position');
    const indices = geometry.getIndex()!;
    const vertices = Array.from({ length: position.count }, (_, i) => `<vertex x="${position.getX(i)}" y="${position.getY(i)}" z="${position.getZ(i)}"/>`).join('');
    const triangles = Array.from({ length: indices.count / 3 }, (_, i) => `<triangle v1="${indices.getX(i * 3)}" v2="${indices.getX(i * 3 + 1)}" v3="${indices.getX(i * 3 + 2)}"/>`).join('');
    return `<object id="${id}" name="${name}" type="model" pid="1" pindex="${colorIndex}"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object>`;
  };
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>');
  // One assembly keeps all letters aligned when the slicer arranges the build plate.
  zip.file('3D/3dmodel.model', `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="es" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources>
<basematerials id="1"><base name="Base" displaycolor="${config.baseColor.toUpperCase()}FF"/><base name="Relieve" displaycolor="${config.detailColor.toUpperCase()}FF"/></basematerials>
${meshXml(model.base, 2, 'Base con orificio', 0)}${meshXml(model.details, 3, 'Letras y borde', 1)}
<object id="4" name="Placa personalizada" type="model"><components><component objectid="2"/><component objectid="3"/></components></object>
</resources><build><item objectid="4"/></build></model>`);
  download(await zip.generateAsync({ type: 'blob', mimeType: 'model/3mf' }), `${filename}.3mf`);
}

// Construye la placa bajo demanda (motor WASM perezoso) y descarga el archivo.
// Usado por el checkout y el panel admin, donde no hay un modelo ya en memoria.
export async function downloadPlateFile(config: PlateConfig, format: 'stl' | '3mf') {
  const api = await loadPlateEngine();
  const model = buildPlate(api, config);
  try {
    await exportPlate(model, config, format);
  } finally {
    model.dispose();
  }
}
