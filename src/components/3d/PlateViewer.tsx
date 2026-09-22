import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RotateCcw } from 'lucide-react';
import { PlateConfig, PlateModel } from '../../core/plateBuilder';
import { createPlateKeychain } from './plateKeychain';

export function PlateViewer({ model, config }: { model: PlateModel; config: PlateConfig }) {
  const mount = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});
  const current = useRef<{
    group: THREE.Group; base: THREE.Mesh; details: THREE.Mesh;
    keychain: ReturnType<typeof createPlateKeychain>; fit: () => void; framingKey?: string;
  }>();
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
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 55;
    controls.maxDistance = 320;
    camera.position.set(0, -48, 150);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x69718d, 2.6));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-40, 60, 90);
    scene.add(light);
    const group = new THREE.Group();
    group.rotation.set(0, -0.18, -0.1);
    const initialBase = new THREE.BufferGeometry();
    const initialDetails = new THREE.BufferGeometry();
    const base = new THREE.Mesh(initialBase, new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.05 }));
    const details = new THREE.Mesh(initialDetails, new THREE.MeshStandardMaterial({ roughness: 0.75 }));
    const keychain = createPlateKeychain();
    group.add(base, details, keychain.group);
    scene.add(group);
    const fit = () => {
      keychain.reset();
      group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(group);
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
      distance *= 1.32;
      controls.minDistance = distance * 0.45;
      controls.maxDistance = distance * 2.5;
      controls.target.copy(center);
      camera.position.copy(center).addScaledVector(direction, distance);
      controls.update();
      keychain.reset();
    };
    reset.current = () => {
      // Vaciar la inercia de OrbitControls antes de restablecer la cámara.
      controls.enableDamping = false;
      controls.update();
      camera.up.set(0, 1, 0);
      camera.position.copy(controls.target).add(new THREE.Vector3(0, -48, 150));
      fit();
      controls.enableDamping = true;
    };
    current.current = { group, base, details, keychain, fit };
    const resize = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fit();
    });
    resize.observe(container);
    let previousTime: number | undefined;
    renderer.setAnimationLoop((time: number) => {
      const elapsed = previousTime === undefined ? 0 : (time - previousTime) / 1000;
      previousTime = time;
      controls.update();
      keychain.update(elapsed, camera);
      renderer.render(scene, camera);
    });
    return () => {
      resize.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      base.material.dispose();
      details.material.dispose();
      initialBase.dispose();
      initialDetails.dispose();
      keychain.dispose();
      environment.dispose();
      scene.environment = null;
      renderer.dispose();
      renderer.domElement.remove();
      current.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (!current.current) return;
    const { base, details, group, keychain, fit } = current.current;
    base.geometry = model.base;
    details.geometry = model.details;
    (base.material as THREE.MeshStandardMaterial).color.set(config.baseColor);
    (details.material as THREE.MeshStandardMaterial).color.set(config.detailColor);
    group.scale.setScalar(60 / config.width);
    keychain.group.position.set(-config.width / 2 - 1, 0, config.thickness / 2);
    keychain.configure(config);
    // El modelo se regenera con debounce: encuadrar también cuando sus medidas
    // reales alcanzan la configuración, sin reiniciar el zoom al editar texto.
    model.base.computeBoundingBox();
    const bounds = model.base.boundingBox!;
    const framingKey = [config.width, config.thickness, ...bounds.min.toArray(), ...bounds.max.toArray()].join(':');
    if (current.current.framingKey !== framingKey) {
      current.current.framingKey = framingKey;
      fit();
    }
  }, [model, config]);

  // El montaje es absoluto: el canvas nunca dicta el ancho del layout (evita
  // desbordes en móvil cuando el visor cambia de tamaño).
  return <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] h-[330px] sm:h-[470px]">
    <div ref={mount} role="img" aria-label={`Vista 3D de la placa ${config.text} ${config.subtitle} con cadena y argolla metálicas`} className="absolute inset-0 touch-none" />
    {error && <p role="alert" className="absolute inset-0 flex items-center justify-center p-8 text-center">No se pudo iniciar la vista 3D. Activa WebGL en tu navegador. Puedes seguir descargando la placa.</p>}
    <button onClick={() => reset.current()} className="absolute top-4 right-4 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-slate-300" aria-label="Restablecer vista"><RotateCcw size={16} /></button>
    <p className="absolute bottom-5 inset-x-4 text-center text-xs text-slate-400 pointer-events-none">Arrastra para girar · Acerca con la rueda o con dos dedos</p>
  </div>;
}
