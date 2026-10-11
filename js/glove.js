/* 3D boxing glove for the "Dein erstes Training" section.
   Loaded on demand by main.js; scroll progress (0..1) drives rotation, scale and position. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);

export async function initGlove(canvas, { model, reduce = false, baseRotation = [0, 0, 0] } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0.05, 6);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff1e2, 2.4); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.PointLight(0xff2a4d, 16, 24, 1.8); rim.position.set(-4.5, 2.5, -2.5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xa9b8ff, 0.7); fill.position.set(-3, -2, 4); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));

  const pivot = new THREE.Group();   // scroll-driven transform
  const idle = new THREE.Group();    // small idle motion
  pivot.add(idle); scene.add(pivot);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder); // the GLB is meshopt-compressed (62 MB → 0.5 MB)
  const gltf = await loader.loadAsync(model);
  const obj = gltf.scene;
  obj.rotation.set(baseRotation[0], baseRotation[1], baseRotation[2]);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = 2.55 / Math.max(size.x, size.y, size.z);
  obj.position.sub(center).multiplyScalar(s);
  obj.scale.setScalar(s);
  obj.traverse((m) => { if (m.isMesh && m.material) { m.material.envMapIntensity = 0.85; m.frustumCulled = false; } });
  idle.add(obj);

  const st = { progress: 0, px: 0, py: 0, t: 0 };
  pivot.scale.setScalar(0.55); pivot.position.y = 0.5; pivot.rotation.y = -0.9;
  let raf = 0, last = 0;

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; st.t += dt;
    const p = st.progress;
    const intro = easeOut(p / 0.22);
    const late = easeOut((p - 0.62) / 0.38);
    const tScale = 0.55 + 0.47 * intro + 0.1 * late;
    const tY = 0.5 - 0.5 * intro - 0.18 * late;
    const tRotY = -0.9 + (reduce ? 0 : p * Math.PI * 2.15) + st.px * 0.35;
    const tRotX = 0.22 - 0.18 * intro - st.py * 0.22 + Math.sin(st.t * 0.7) * 0.05;
    const k = 1 - Math.pow(0.0008, dt);
    pivot.rotation.y += (tRotY - pivot.rotation.y) * k;
    pivot.rotation.x += (tRotX - pivot.rotation.x) * k;
    const sc = pivot.scale.x + (tScale - pivot.scale.x) * k; pivot.scale.setScalar(sc);
    pivot.position.y += (tY + Math.sin(st.t * 1.1) * 0.05 - pivot.position.y) * k;
    idle.rotation.z = Math.sin(st.t * 0.9) * 0.04;
    idle.rotation.y = reduce ? st.t * 0.25 : 0;
    renderer.render(scene, camera);
  };
  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  return {
    setProgress(p) { st.progress = clamp01(p); },
    setPointer(x, y) { st.px = x; st.py = y; },
    setActive(a) { a ? start() : stop(); },
    renderOnce() { resize(); renderer.render(scene, camera); },
    destroy() { stop(); ro.disconnect(); renderer.dispose(); },
  };
}
