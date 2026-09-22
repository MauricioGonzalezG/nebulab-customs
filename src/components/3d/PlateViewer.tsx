import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCcw } from 'lucide-react';
import { PlateConfig, PlateModel } from '../../core/plateBuilder';

export function PlateViewer({ model, config }: { model: PlateModel; config: PlateConfig }) {
  const mount = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});
  const current = useRef<{ group: THREE.Group; base: THREE.Mesh; details: THREE.Mesh }>();
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
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 55;
    controls.maxDistance = 320;
    reset.current = () => {
      camera.position.set(0, -48, 150);
      camera.up.set(0, 1, 0);
      controls.target.set(0, 0, 1.5);
      controls.update();
    };
    reset.current();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x69718d, 2.6));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-40, 60, 90);
    scene.add(light);
    const group = new THREE.Group();
    const initialBase = new THREE.BufferGeometry();
    const initialDetails = new THREE.BufferGeometry();
    const base = new THREE.Mesh(initialBase, new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.05 }));
    const details = new THREE.Mesh(initialDetails, new THREE.MeshStandardMaterial({ roughness: 0.75 }));
    group.add(base, details);
    scene.add(group);
    current.current = { group, base, details };
    const resize = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resize.observe(container);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return () => {
      resize.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      base.material.dispose();
      details.material.dispose();
      initialBase.dispose();
      initialDetails.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      current.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (!current.current) return;
    const { base, details, group } = current.current;
    base.geometry = model.base;
    details.geometry = model.details;
    (base.material as THREE.MeshStandardMaterial).color.set(config.baseColor);
    (details.material as THREE.MeshStandardMaterial).color.set(config.detailColor);
    group.scale.setScalar(60 / config.width);
  }, [model, config]);

  return <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
    <div ref={mount} role="img" aria-label={`Vista 3D de la placa ${config.text} ${config.subtitle}`} className="h-[330px] sm:h-[470px] w-full touch-none" />
    {error && <p role="alert" className="absolute inset-0 flex items-center justify-center p-8 text-center">No se pudo iniciar la vista 3D. Activa WebGL en tu navegador. Puedes seguir descargando la placa.</p>}
    <button onClick={() => reset.current()} className="absolute top-4 right-4 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-slate-300" aria-label="Restablecer vista"><RotateCcw size={16} /></button>
    <p className="absolute bottom-5 inset-x-4 text-center text-xs text-slate-400 pointer-events-none">Arrastra para girar · Acerca con la rueda o con dos dedos</p>
  </div>;
}
