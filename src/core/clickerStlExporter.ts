import { ClickerConfig } from '../types';
import { ProcessedClickerData } from './clickerProcessor';

export const downloadClickerSTL = (
  processedData: ProcessedClickerData | null,
  config: ClickerConfig
) => {
  const header = `solid NebulabStudio_Clicker_${config.type}_${config.size}mm\n`;
  let body = '';

  const scale = config.size / 2;
  const topH = config.topHeight;
  const baseH = config.baseHeight;
  const wallScale = 0.84;

  const pts = processedData?.contourPoints || [];
  const numPts = pts.length > 0 ? pts.length : 32;

  // 1. Hollow Top Cap Outer & Inner Wall Shells
  for (let i = 0; i < numPts; i++) {
    const nextIdx = (i + 1) % numPts;
    
    let p1 = pts[i] || { x: Math.cos((i / numPts) * Math.PI * 2), y: Math.sin((i / numPts) * Math.PI * 2) };
    let p2 = pts[nextIdx] || { x: Math.cos((nextIdx / numPts) * Math.PI * 2), y: Math.sin((nextIdx / numPts) * Math.PI * 2) };

    const xo1 = p1.x * scale;
    const yo1 = p1.y * scale;
    const xo2 = p2.x * scale;
    const yo2 = p2.y * scale;

    const xi1 = p1.x * scale * wallScale;
    const yi1 = p1.y * scale * wallScale;
    const xi2 = p2.x * scale * wallScale;
    const yi2 = p2.y * scale * wallScale;

    // Outer wall faces
    body += `facet normal 1 0 0\n  outer loop\n    vertex ${xo1} ${yo1} 0\n    vertex ${xo2} ${yo2} 0\n    vertex ${xo1} ${yo1} ${topH}\n  endloop\nendfacet\n`;
    body += `facet normal 1 0 0\n  outer loop\n    vertex ${xo2} ${yo2} 0\n    vertex ${xo2} ${yo2} ${topH}\n    vertex ${xo1} ${yo1} ${topH}\n  endloop\nendfacet\n`;

    // Inner cavity wall faces
    body += `facet normal -1 0 0\n  outer loop\n    vertex ${xi1} ${yi1} 0\n    vertex ${xi1} ${yi1} ${topH - 1.5}\n    vertex ${xi2} ${yi2} 0\n  endloop\nendfacet\n`;
    body += `facet normal -1 0 0\n  outer loop\n    vertex ${xi2} ${yi2} 0\n    vertex ${xi1} ${yi1} ${topH - 1.5}\n    vertex ${xi2} ${yi2} ${topH - 1.5}\n  endloop\nendfacet\n`;

    // Top Roof Surface Ring
    body += `facet normal 0 0 1\n  outer loop\n    vertex ${xo1} ${yo1} ${topH}\n    vertex ${xo2} ${yo2} ${topH}\n    vertex ${xi1} ${yi1} ${topH}\n  endloop\nendfacet\n`;
    body += `facet normal 0 0 1\n  outer loop\n    vertex ${xo2} ${yo2} ${topH}\n    vertex ${xi2} ${yi2} ${topH}\n    vertex ${xi1} ${yi1} ${topH}\n  endloop\nendfacet\n`;
  }

  // 2. Base Housing Outer Faces
  for (let i = 0; i < numPts; i++) {
    const nextIdx = (i + 1) % numPts;
    let p1 = pts[i] || { x: Math.cos((i / numPts) * Math.PI * 2), y: Math.sin((i / numPts) * Math.PI * 2) };
    let p2 = pts[nextIdx] || { x: Math.cos((nextIdx / numPts) * Math.PI * 2), y: Math.sin((nextIdx / numPts) * Math.PI * 2) };

    const x1 = p1.x * (scale + 2.5);
    const y1 = p1.y * (scale + 2.5);
    const x2 = p2.x * (scale + 2.5);
    const y2 = p2.y * (scale + 2.5);

    body += `facet normal 0 0 -1\n  outer loop\n    vertex 0 0 ${-baseH}\n    vertex ${x2} ${y2} ${-baseH}\n    vertex ${x1} ${y1} ${-baseH}\n  endloop\nendfacet\n`;
    body += `facet normal 1 0 0\n  outer loop\n    vertex ${x1} ${y1} ${-baseH}\n    vertex ${x2} ${y2} ${-baseH}\n    vertex ${x1} ${y1} 0\n  endloop\nendfacet\n`;
  }

  const footer = `endsolid NebulabStudio_Clicker_${config.type}_${config.size}mm\n`;
  const stlString = header + body + footer;

  const blob = new Blob([stlString], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `NebulabStudio_${config.type}_${config.size}mm_${Date.now()}.stl`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
