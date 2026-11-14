import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RotateCcw } from 'lucide-react';
import type { OrnamentModel } from '../../core/ornamentBuilder';
import { ORNAMENT_SHAPE_LABELS, OrnamentConfig } from '../../core/ornamentConfig';
import { renderOrnamentPhoto } from '../../core/ornamentPhoto';

const CORD_LENGTH = 20; // mm de cordón visible sobre el orificio
const CAMERA_OFFSET = new THREE.Vector3(18, -8, 150);

interface ViewerScene {
  frame: THREE.Mesh; relief: THREE.Mesh; back: THREE.Mesh; photo: THREE.Mesh; cord: THREE.Mesh;
  body: THREE.Group; swing: THREE.Group; fit: () => void; framingKey?: string;
}

export function OrnamentViewer({ model, config, image }: { model: OrnamentModel; config: OrnamentConfig; image: HTMLImageElement | null }) {
  const mount = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});
  const current = useRef<ViewerScene>();
  const [error, setError] = useState(false);

  useEffect(() => {
    const container = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setError(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x111218, 0);
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const environmentScene = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(environmentScene, 0.04);
    environmentScene.dispose();
    pmrem.dispose();
    scene.environment = environment.texture;
    const camera = new THREE.PerspectiveCamera(36, 1, 1, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    camera.position.copy(CAMERA_OFFSET);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x69718d, 2.2));
    const light = new THREE.DirectionalLight(0xffffff, 2.6);
    light.position.set(-40, 60, 90);
    scene.add(light);

    // `swing` pivota en la punta del cordón para mecer el adorno como en el árbol.
    const swing = new THREE.Group();
    const body = new THREE.Group();
    const empty = new THREE.BufferGeometry();
    const plastic = () => new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.04 });
    const frame = new THREE.Mesh(empty, plastic());
    const relief = new THREE.Mesh(empty, plastic());
    const back = new THREE.Mesh(empty, plastic());
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ alphaTest: 0.5, toneMapped: false }));
    const cord = new THREE.Mesh(empty, new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.85 }));
    body.add(frame, relief, back, photo, cord);
    swing.add(body);
    scene.add(swing);

    const fit = () => {
      swing.rotation.set(0, 0, 0);
      swing.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(swing);
      const center = box.getCenter(new THREE.Vector3());
      const direction = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(center).add(direction);
      camera.lookAt(center);
      camera.updateMatrixWorld(true);
      const inverseRotation = camera.quaternion.clone().invert();
      const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const tanX = tanY * camera.aspect;
      let distance = 0;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(x, y, z).sub(center).applyQuaternion(inverseRotation);
        distance = Math.max(distance, Math.abs(point.x) / tanX + point.z, Math.abs(point.y) / tanY + point.z);
      }
      distance *= 1.34;
      controls.minDistance = distance * 0.45;
      controls.maxDistance = distance * 2.5;
      controls.target.copy(center);
      camera.position.copy(center).addScaledVector(direction, distance);
      controls.update();
    };
    reset.current = () => {
      controls.enableDamping = false;
      controls.update();
      camera.up.set(0, 1, 0);
      camera.position.copy(controls.target).add(CAMERA_OFFSET);
      fit();
      controls.enableDamping = true;
    };
    current.current = { frame, relief, back, photo, cord, body, swing, fit };

    const resize = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fit();
    });
    resize.observe(container);
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    renderer.setAnimationLoop((time: number) => {
      controls.update();
      if (!still) {
        swing.rotation.z = Math.sin(time / 1300) * 0.035;
        swing.rotation.y = Math.sin(time / 2100) * 0.16;
      }
      renderer.render(scene, camera);
    });
    return () => {
      resize.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      for (const mesh of [frame, relief, back, photo, cord]) (mesh.material as THREE.Material).dispose();
      (photo.material as THREE.MeshBasicMaterial).map?.dispose();
      photo.geometry.dispose();
      if (cord.geometry !== empty) cord.geometry.dispose();
      empty.dispose();
      environment.dispose();
      scene.environment = null;
      renderer.dispose();
      renderer.domElement.remove();
      current.current = undefined;
    };
  }, []);

  // Geometría: piezas, posición de la foto y cordón que pasa por el orificio.
  useEffect(() => {
    const view = current.current;
    if (!view) return;
    const { frame, relief, back, photo, cord, body, swing, fit } = view;
    frame.geometry = model.frame;
    relief.geometry = model.relief;
    back.geometry = model.back;
    const depth = config.backThickness + config.thickness;
    const area = model.photoBounds;
    photo.scale.set(area.maxX - area.minX, area.maxY - area.minY, 1);
    photo.position.set((area.minX + area.maxX) / 2, (area.minY + area.maxY) / 2, config.backThickness + 0.12);

    const [hx, hy] = model.hole;
    const top = hy + CORD_LENGTH;
    const loop = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hx, hy - 0.3, depth / 2),
      new THREE.Vector3(hx, hy + 5, depth + 1.1),
      new THREE.Vector3(hx, hy + CORD_LENGTH * 0.6, depth / 2 + 1.3),
      new THREE.Vector3(hx, top, depth / 2),
      new THREE.Vector3(hx, hy + CORD_LENGTH * 0.6, depth / 2 - 1.3),
      new THREE.Vector3(hx, hy + 5, -1.1),
    ], true);
    const previousCord = cord.geometry;
    cord.geometry = new THREE.TubeGeometry(loop, 72, Math.min(0.5, config.holeDiameter * 0.17), 10, true);
    previousCord.dispose();

    swing.position.set(hx, top, 0);
    body.position.set(-hx, -top, -depth / 2);
    const framingKey = [config.backThickness, config.thickness, ...Object.values(model.bounds), ...model.hole].join(':');
    if (view.framingKey !== framingKey) {
      view.framingKey = framingKey;
      fit();
    }
  }, [model, config.backThickness, config.thickness, config.holeDiameter]);

  useEffect(() => {
    const view = current.current;
    if (!view) return;
    (view.frame.material as THREE.MeshStandardMaterial).color.set(config.bodyColor);
    (view.back.material as THREE.MeshStandardMaterial).color.set(config.bodyColor);
    (view.relief.material as THREE.MeshStandardMaterial).color.set(config.accentColor);
  }, [config.bodyColor, config.accentColor]);

  // Foto: se vuelve a dibujar con cada cambio de encuadre o de ventana.
  useEffect(() => {
    const view = current.current;
    if (!view) return;
    const material = view.photo.material as THREE.MeshBasicMaterial;
    const texture = new THREE.CanvasTexture(renderOrnamentPhoto(image, config, model, 14));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    material.map?.dispose();
    material.map = texture;
    material.needsUpdate = true;
  }, [model, image, config.photoZoom, config.photoX, config.photoY]);

  const label = `Vista 3D del adorno navideño ${ORNAMENT_SHAPE_LABELS[config.shape]}${config.text ? ` con el texto ${config.text}` : ''}, colgado de un cordón dorado`;
  // Montaje absoluto: el canvas nunca dicta el ancho del layout (evita desbordes en móvil).
  return <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] h-[360px] sm:h-[500px]">
    <div ref={mount} role="img" aria-label={label} className="absolute inset-0 touch-none" />
    {error && <p role="alert" className="absolute inset-0 flex items-center justify-center p-8 text-center">No se pudo iniciar la vista 3D. Activa WebGL en tu navegador. Puedes seguir con tu pedido.</p>}
    <button onClick={() => reset.current()} className="absolute top-4 right-4 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-slate-300" aria-label="Restablecer vista"><RotateCcw size={16} /></button>
    <p className="absolute bottom-5 inset-x-4 text-center text-xs text-slate-400 pointer-events-none">Arrastra para girar · Acerca con la rueda o con dos dedos</p>
  </div>;
}
