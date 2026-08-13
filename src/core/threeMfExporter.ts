import JSZip from 'jszip';

export interface ThreeMFMeshObject {
  id: number;
  name: string;
  hexColor: string; // e.g. "#EAB308" or "#0F172A"
  vertices: Array<{ x: number; y: number; z: number }>;
  triangles: Array<{ v1: number; v2: number; v3: number }>;
}

/**
 * Generates and triggers download of a multi-color 3MF file (compatible with Bambu Studio, OrcaSlicer, PrusaSlicer)
 */
export async function download3MFFile(
  objects: ThreeMFMeshObject[],
  filename: string
): Promise<void> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;
  zip.file('[Content_Types].xml', contentTypesXml);

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;
  zip.file('_rels/.rels', relsXml);

  // 3. 3D/3dmodel.model
  let materialsXml = '    <m:basematerials id="1">\n';
  objects.forEach((obj) => {
    const cleanHex = obj.hexColor.startsWith('#') ? obj.hexColor : `#${obj.hexColor}`;
    materialsXml += `      <m:base name="${escapeXml(obj.name)}" displaycolor="${cleanHex.toUpperCase()}" />\n`;
  });
  materialsXml += '    </m:basematerials>\n';

  let objectsXml = '';
  objects.forEach((obj, idx) => {
    objectsXml += `    <object id="${obj.id}" type="model" pid="1" p1="${idx}">\n`;
    objectsXml += '      <mesh>\n';
    objectsXml += '        <vertices>\n';
    obj.vertices.forEach((v) => {
      objectsXml += `          <vertex x="${v.x.toFixed(4)}" y="${v.y.toFixed(4)}" z="${v.z.toFixed(4)}" />\n`;
    });
    objectsXml += '        </vertices>\n';
    objectsXml += '        <triangles>\n';
    obj.triangles.forEach((t) => {
      objectsXml += `          <triangle v1="${t.v1}" v2="${t.v2}" v3="${t.v3}" />\n`;
    });
    objectsXml += '        </triangles>\n';
    objectsXml += '      </mesh>\n';
    objectsXml += '    </object>\n';
  });

  let buildXml = '  <build>\n';
  objects.forEach((obj) => {
    buildXml += `    <item objectid="${obj.id}" />\n`;
  });
  buildXml += '  </build>\n';

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <resources>
${materialsXml}${objectsXml}  </resources>
${buildXml}</model>`;

  zip.file('3D/3dmodel.model', modelXml);

  // Generate ZIP blob and trigger download
  const content = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
  });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.3mf') ? filename : `${filename}.3mf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
