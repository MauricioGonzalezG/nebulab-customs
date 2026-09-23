import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  entryPoints: ['src/core/collarProcessor.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { removeCollarBackground, traceCollarContour, processCollarImage, extractCollarDominantColors } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`
);

function makeImage(width, height, color = [255, 255, 255, 255]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(color, i);
  return { width, height, data };
}

function fillRect(image, x0, y0, x1, y1, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) image.data.set(color, (y * image.width + x) * 4);
  }
}

const logo = makeImage(64, 64);
fillRect(logo, 16, 16, 48, 48, [10, 30, 50, 255]);
fillRect(logo, 26, 26, 38, 38, [255, 255, 255, 255]);
assert.equal(removeCollarBackground(logo), true, 'uniform perimeter is removed');
assert.equal(logo.data[3], 0, 'exterior turns transparent');
assert.equal(logo.data[(20 * 64 + 20) * 4 + 3], 255, 'foreground stays opaque');
assert.equal(logo.data[(30 * 64 + 30) * 4 + 3], 255, 'enclosed background-coloured detail survives');

const transparentLogo = makeImage(32, 32, [0, 0, 0, 0]);
fillRect(transparentLogo, 8, 8, 24, 24, [255, 255, 255, 255]);
assert.equal(removeCollarBackground(transparentLogo), false, 'existing transparency is respected');
assert.equal(transparentLogo.data[(12 * 32 + 12) * 4 + 3], 255);

const gradient = makeImage(64, 64);
for (let x = 0; x < 64; x++) {
  for (let y = 0; y < 64; y++) gradient.data.set([x * 4, y * 4, (x + y) * 2, 255], (y * 64 + x) * 4);
}
assert.equal(removeCollarBackground(gradient), false, 'a patterned photograph has no reliable colour key');
assert.equal(removeCollarBackground(makeImage(32, 32)), false, 'a single-colour image cannot be erased completely');
assert.equal(extractCollarDominantColors(makeImage(8, 8, [0, 0, 0, 0]), 8).length, 8,
  'asking for more than four colours terminates with distinct fallbacks');

const separated = makeImage(64, 64, [0, 0, 0, 0]);
fillRect(separated, 8, 12, 20, 45, [0, 0, 0, 255]);
fillRect(separated, 40, 17, 53, 49, [0, 0, 0, 255]);
fillRect(separated, 0, 0, 1, 1, [0, 0, 0, 255]);
const outline = traceCollarContour(separated.data, 64, 64);
assert(outline.length >= 8 && outline.length <= 120, 'stable number of silhouette points');
assert(outline.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
assert(Math.min(...outline.map(point => point.x)) < -0.9 && Math.max(...outline.map(point => point.x)) > 0.9,
  'silhouette covers both meaningful components');

const contexts = [];
globalThis.document = {
  createElement: () => {
    const canvas = {
      width: 300,
      height: 150,
      toDataURL: () => 'data:image/png;base64,test',
      getContext: () => {
        const record = { canvas, transforms: [] };
        contexts.push(record);
        return {
          clearRect() {}, save() {}, restore() {}, putImageData() {},
          drawImage(...args) { record.draw = args; },
          translate(...args) { record.transforms.push(['translate', ...args]); },
          rotate(...args) { record.transforms.push(['rotate', ...args]); },
          scale(...args) { record.transforms.push(['scale', ...args]); },
          getImageData: () => makeImage(canvas.width, canvas.height, [0, 0, 0, 0]),
        };
      },
    };
    return canvas;
  },
};
assert.throws(() => processCollarImage({ naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 }, {}), /dimensiones válidas/);
const transformed = processCollarImage(
  { naturalWidth: 1000, naturalHeight: 400, width: 1, height: 1 },
  { removeBackground: false, imageRotation: 45, flipHorizontal: true }
);
assert.equal(contexts[0].canvas.width, 512, 'natural width determines source dimensions');
assert.equal(contexts[0].canvas.height, 205, 'source aspect ratio is preserved');
const rotation = contexts[1].transforms.find(transform => transform[0] === 'rotate');
const scale = contexts[1].transforms.find(transform => transform[0] === 'scale');
assert.equal(rotation[1], Math.PI / 4);
assert(scale[1] < 0 && scale[2] > 0, 'flip is applied once before drawing');
const extent = (Math.abs(Math.cos(Math.PI / 4)) * 512 + Math.abs(Math.sin(Math.PI / 4)) * 205) * scale[2];
assert(extent <= 512 * 0.86 + 0.001, 'rotated artwork keeps protective padding');
assert.equal(transformed.previewDataUrl, 'data:image/png;base64,test');
assert.equal(transformed.width, 512);
console.log('PASS: collar background, enclosed details, transparency, contour, dimensions, rotation and flip.');
