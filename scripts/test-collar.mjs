import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import Module from 'manifold-3d';

// Compile the browser TypeScript in Node only for geometry checks. The WASM URL
// import belongs to Vite; these checks initialize Manifold directly below.
const bundle = resolve('scripts/.collar-geometry-test.mjs');
try {
  await build({
    entryPoints: ['src/core/collarModel.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    outfile: bundle,
    plugins: [{
      name: 'vite-wasm-url-for-node-test',
      setup(build) {
        build.onResolve({ filter: /manifold\.wasm\?url$/ }, () => ({ path: 'wasm-url', namespace: 'test' }));
        build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export default "";', loader: 'js' }));
      },
    }],
  });
  const { buildCollarModel } = await import(pathToFileURL(bundle).href);
  const api = await Module();
  api.setup();
  const config = {
    petName: 'KOLLA', phoneText: '315 678 9012', plateStyle: 'bone', mountType: 'slide',
    fontFamily: 'outfit', reliefStyle: 'embossed', icon: 'paw', plateColor: '#1E293B',
    borderColor: '#D4AF37', textColor: '#FFFFFF', strapColor: 'olive', size: 'M',
    plateWidth: 50, plateHeight: 32, plateThickness: 4, plateBevel: 1, ringDiameter: 4.5,
    imageUrl: null, removeBackground: true, imageRotation: 0, flipHorizontal: false,
    lightingMode: 'studio', viewMode: 'assembled',
  };
  const getModel = overrides => buildCollarModel(api, { ...config, ...overrides }, null);
  const asManifold = geometry => new api.Manifold(new api.Mesh({
    numProp: 3,
    vertProperties: new Float32Array(geometry.getAttribute('position').array),
    triVerts: new Uint32Array(geometry.getIndex().array),
  }));
  const base = getModel({});
  assert.ok(base.volume > 1000, 'solid plate has volume');
  assert.ok(base.text.getAttribute('position').count > 0, 'real raised lettering exists');
  assert.ok(base.border.getAttribute('position').count > 0, 'real rim exists');
  assert.ok(base.logo.getAttribute('position').count > 0, 'selected icon exists');
  base.solid.computeBoundingBox();
  assert.ok(base.solid.boundingBox.min.z < -2, 'two retaining loops project only behind the plate');
  const baseSolid = asManifold(base.solid);
  const frontSection = baseSolid.slice(config.plateThickness / 2);
  assert.equal(frontSection.toPolygons().length, 1, 'front face has no through-holes');
  const notchedSection = baseSolid.slice(0.4);
  assert.ok(frontSection.area() > notchedSection.area() + 100, 'rear notch removes material only from the back');
  notchedSection.delete();
  frontSection.delete();
  const basePieces = baseSolid.decompose();
  assert.equal(basePieces.length, 1, 'rear loops join one printable solid');
  basePieces.forEach(piece => piece.delete());
  baseSolid.delete();
  const baselineVolume = base.volume;
  base.dispose();

  for (const plateStyle of ['rounded', 'rectangle', 'circle', 'shield', 'heart', 'hexagon', 'pill', 'silhouette']) {
    const model = getModel({ plateStyle });
    assert.ok(model.volume > 0 && model.solid.getAttribute('position').count > 0, `${plateStyle} produces a printable body`);
    model.dispose();
  }
  for (const plateStyle of ['bone', 'rounded', 'shield', 'heart', 'silhouette']) {
    for (const size of ['S', 'XL']) {
      const model = getModel({ plateStyle, size, plateWidth: 35, plateHeight: 25 });
      const mesh = asManifold(model.solid);
      const pieces = mesh.decompose();
      assert.equal(pieces.length, 1, `${plateStyle} ${size} remains one printable piece at minimum dimensions`);
      pieces.forEach(piece => piece.delete());
      mesh.delete(); model.dispose();
    }
  }
  for (const reliefStyle of ['embossed', 'inlaid', 'debossed']) {
    const model = getModel({ reliefStyle });
    assert.ok(model.volume > 0, `${reliefStyle} is printable`);
    model.dispose();
  }
  const dangling = getModel({ mountType: 'dangling' });
  assert.notEqual(dangling.volume, baselineVolume, 'mounting changes the actual solid');
  dangling.dispose();
  const larger = getModel({ plateWidth: 60, plateHeight: 40, plateThickness: 5 });
  assert.ok(larger.volume > baselineVolume, 'dimensions change the solid');
  larger.dispose();
  const noText = getModel({ petName: '', phoneText: '' });
  assert.equal(noText.text.getAttribute('position').count, 0, 'blank text leaves no text mesh');
  noText.dispose();
  const noPhone = getModel({ phoneText: '' });
  const noPhoneFaces = noPhone.text.getAttribute('position').count;
  noPhone.dispose();
  const longText = getModel({ petName: 'MAXIMILIANO', phoneText: '+57 315 678 9012' });
  assert.ok(longText.text.getAttribute('position').count > noPhoneFaces, 'the full phone line contributes printable geometry');
  longText.dispose();
  const contour = Array.from({ length: 48 }, (_, i) => {
    const a = i * Math.PI * 2 / 48;
    const r = i % 8 < 4 ? 0.85 : 1;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
  const silhouette = buildCollarModel(api, { ...config, plateStyle: 'silhouette' }, { contourPoints: contour });
  assert.ok(silhouette.volume > 0, 'sampled image contour produces a printable silhouette');
  silhouette.dispose();
  const pixels = new Uint8ClampedArray(64 * 64 * 4);
  for (let y = 20; y < 34; y++) for (let x = 16; x < 48; x++) {
    const i = (y * 64 + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = pixels[i + 3] = 255;
  }
  const canvas = { width: 64, height: 64, getContext: () => ({ getImageData: () => ({ data: pixels }) }) };
  const withImage = buildCollarModel(api, { ...config, icon: 'none' }, {
    originalCanvas: canvas, canvas, contourPoints: contour, dominantColors: ['#ffffff'],
  });
  assert.ok(withImage.logo.getAttribute('position').count > 0, 'uploaded art becomes real logo relief');
  withImage.dispose();
  const backedLogo = rotated => {
    const rgba = new Uint8ClampedArray(64 * 64 * 4);
    for (let y = 8; y < 56; y++) for (let x = 8; x < 56; x++) {
      const i = (y * 64 + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 255;
    }
    for (let y = 15; y < 47; y++) for (let x = 15; x < 46; x++) {
      if (x >= 25 && y < 38) continue;
      const px = rotated ? 63 - y : x;
      const py = rotated ? x : y;
      const i = (py * 64 + px) * 4;
      rgba[i] = 220; rgba[i + 1] = 30; rgba[i + 2] = 30; rgba[i + 3] = 255;
    }
    const source = { width: 64, height: 64, getContext: () => ({ getImageData: () => ({ data: rgba }) }) };
    return { originalCanvas: source, canvas: source, contourPoints: contour, dominantColors: ['#dc1e1e'] };
  };
  const logo0 = buildCollarModel(api, { ...config, icon: 'none' }, backedLogo(false));
  const logo90 = buildCollarModel(api, { ...config, icon: 'none' }, backedLogo(true));
  assert.notDeepEqual(
    Array.from(logo0.logo.getAttribute('position').array),
    Array.from(logo90.logo.getAttribute('position').array),
    'rotating an opaque, white-backed uploaded logo changes printable artwork'
  );
  logo0.dispose(); logo90.dispose();
  console.log('Collar CAD geometry checks passed.');
} finally {
  if (existsSync(bundle)) await rm(bundle);
}
