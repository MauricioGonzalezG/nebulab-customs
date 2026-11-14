import * as THREE from 'three';
import JSZip from 'jszip';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { buildOrnament, loadOrnamentEngine, OrnamentModel } from './ornamentBuilder';
import type { OrnamentConfig } from './ornamentConfig';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export const ornamentFilename = (config: OrnamentConfig) =>
  `Nebulab_Navidad_${config.shape}_${config.size}mm${config.text.trim() ? `_${config.text.replace(/[^A-Z0-9]/g, '')}` : ''}`;

// Distancia entre el marco y la tapa al acomodarlos sobre la cama de impresión.
const bedOffset = (model: OrnamentModel) => model.bounds.maxX - model.bounds.minX + 6;

// Ambas piezas quedan apoyadas en z=0: el marco con el relieve hacia arriba y
// la tapa trasera a su lado.
export async function exportOrnament(model: OrnamentModel, config: OrnamentConfig, format: 'stl' | '3mf') {
  const filename = ornamentFilename(config);
  const dx = bedOffset(model);
  const dz = -config.backThickness;
  if (format === 'stl') {
    const material = new THREE.MeshBasicMaterial();
    try {
      const plate = new THREE.Group();
      const front = new THREE.Mesh(model.front, material);
      front.position.z = dz;
      const back = new THREE.Mesh(model.back, material);
      back.position.x = dx;
      plate.add(front, back);
      plate.updateMatrixWorld(true);
      const data = new STLExporter().parse(plate, { binary: true });
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
  const hasRelief = model.relief.getAttribute('position').count > 0;
  const lower = `transform="1 0 0 0 1 0 0 0 1 0 0 ${dz}"`;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>');
  // El marco es un ensamblaje (cuerpo + relieve) para que el laminador no los separe.
  zip.file('3D/3dmodel.model', `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="es" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources>
<basematerials id="1"><base name="Cuerpo" displaycolor="${config.bodyColor.toUpperCase()}FF"/><base name="Relieve" displaycolor="${config.accentColor.toUpperCase()}FF"/></basematerials>
${meshXml(model.frame, 2, 'Marco con ventana', 0)}${hasRelief ? meshXml(model.relief, 3, 'Relieve de color', 1) : ''}${meshXml(model.back, 4, 'Tapa trasera', 0)}
<object id="5" name="Marco navideño" type="model"><components><component objectid="2" ${lower}/>${hasRelief ? `<component objectid="3" ${lower}/>` : ''}</components></object>
</resources><build><item objectid="5"/><item objectid="4" transform="1 0 0 0 1 0 0 0 1 ${dx} 0 0"/></build></model>`);
  download(await zip.generateAsync({ type: 'blob', mimeType: 'model/3mf' }), `${filename}.3mf`);
}

// Construye el adorno bajo demanda (motor WASM perezoso) y descarga el archivo.
// Usado por el checkout y el panel admin, donde no hay un modelo ya en memoria.
export async function downloadOrnamentFile(config: OrnamentConfig, format: 'stl' | '3mf') {
  const api = await loadOrnamentEngine();
  const model = buildOrnament(api, config);
  try {
    await exportOrnament(model, config, format);
  } finally {
    model.dispose();
  }
}
