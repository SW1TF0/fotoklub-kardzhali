// ============================================================================
// scene.js — 3D "exploded camera" background driven by scroll position
// ----------------------------------------------------------------------------
// Expects a glTF binary file at assets/models/camera.glb containing distinct
// named meshes/groups for the camera parts, e.g.:
//   Body, FrontPlate, Lens, Viewfinder, Flash, Mirror, Sensor, CircuitBoard, BackPlate
// (Any subset of these names is fine — anything not found simply keeps its
// original position and isn't animated.)
//
// If the model fails to load (e.g. camera.glb hasn't been added to the repo
// yet) a detailed stand-in camera built from primitives is used instead —
// a rounded-edge chassis with a lens, viewfinder hump, flash, and the mirror
// / sensor / circuit board it normally hides inside — so the scroll-explode
// effect (parts separating + the rig spinning) is fully visible without the
// real asset.
// ============================================================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById("camera-canvas");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.035);

const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0.3, 11);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---- Lighting --------------------------------------------------------------
const keyLight = new THREE.DirectionalLight(0xf2f5ff, 2.1);
keyLight.position.set(4, 5, 6);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.3);
rimLight.position.set(-5, -2, -4);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0x8a95ad, 0.7);
fillLight.position.set(-2, 3, -6);
scene.add(fillLight);

const ambient = new THREE.AmbientLight(0x3a3a42, 0.85);
scene.add(ambient);

// ---- Rig: everything hangs off this group so we can rotate/tilt as one ----
const rig = new THREE.Group();
scene.add(rig);

// Named parts we look for in the loaded model, and their "exploded" travel
// direction/distance along local space. Order roughly front-to-back like a
// real camera, with the parts it normally hides (mirror / sensor / board)
// popping out sideways/backwards so they read clearly once separated.
const PART_CONFIG = {
  Lens: { axis: new THREE.Vector3(0, 0, 1), distance: 2.6 },
  FrontPlate: { axis: new THREE.Vector3(0, 0, 1), distance: 1.2 },
  Body: { axis: new THREE.Vector3(0, 0, 0), distance: 0 },
  Viewfinder: { axis: new THREE.Vector3(0, 1, 0), distance: 1.4 },
  Flash: { axis: new THREE.Vector3(0, 1, 0), distance: 2.1 },
  Mirror: { axis: new THREE.Vector3(0, 1, 0.4), distance: 1.1 },
  Sensor: { axis: new THREE.Vector3(0, 0, -1), distance: 1.2 },
  CircuitBoard: { axis: new THREE.Vector3(0, 0, -1), distance: 2.0 },
  BackPlate: { axis: new THREE.Vector3(0, 0, -1), distance: 2.8 },
};

const parts = []; // { mesh, origin: Vector3, axis: Vector3, distance: number }

function registerPart(object3d, name) {
  const config = PART_CONFIG[name] || {
    axis: new THREE.Vector3(0, 0, 1),
    distance: 1.5,
  };
  parts.push({
    mesh: object3d,
    origin: object3d.position.clone(),
    axis: config.axis.clone().normalize(),
    distance: config.distance,
  });
}

function buildFallbackCamera() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1e,
    metalness: 0.7,
    roughness: 0.35,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c10,
    metalness: 0.5,
    roughness: 0.45,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    metalness: 0.5,
    roughness: 0.3,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0a1420,
    metalness: 0.6,
    roughness: 0.08,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.1,
  });
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xd8d8dc,
    metalness: 1,
    roughness: 0.05,
  });
  const sensorMat = new THREE.MeshStandardMaterial({
    color: 0x35405a,
    metalness: 0.85,
    roughness: 0.25,
  });
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x1f2e22,
    metalness: 0.3,
    roughness: 0.6,
  });
  const chipMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.4,
    roughness: 0.4,
  });
  const flashMat = new THREE.MeshStandardMaterial({
    color: 0xe8e4da,
    metalness: 0.1,
    roughness: 0.5,
  });

  const halfW = 1.5;
  const halfH = 0.8;
  const panelDepth = 1.8;

  // ---- Body: a rounded-edge chassis (4 panels + corner posts, open front
  // & back) so the parts normally hidden inside are visible once things
  // separate. ----
  const body = new THREE.Group();
  body.name = "Body";
  const top = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, 0.22, panelDepth), bodyMat);
  top.position.set(0, halfH, 0);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, 0.22, panelDepth), bodyMat);
  bottom.position.set(0, -halfH, 0);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.22, halfH * 2, panelDepth), bodyMat);
  left.position.set(-halfW, 0, 0);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.22, halfH * 2, panelDepth), bodyMat);
  right.position.set(halfW, 0, 0);
  body.add(top, bottom, left, right);

  // Rounded corner posts close the gaps left by the panel frame so it reads
  // as one solid, finished chassis rather than a flat skeleton.
  const postGeo = new THREE.CylinderGeometry(0.11, 0.11, halfH * 2, 16);
  [
    [-halfW, panelDepth / 2],
    [-halfW, -panelDepth / 2],
    [halfW, panelDepth / 2],
    [halfW, -panelDepth / 2],
  ].forEach(([x, z]) => {
    const post = new THREE.Mesh(postGeo, bodyMat);
    post.position.set(x, 0, z);
    body.add(post);
  });

  // Rounded grip on the right side.
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.9, 6, 16), bodyMat);
  grip.position.set(halfW + 0.12, -0.05, 0);
  body.add(grip);

  group.add(body);

  // ---- Front plate + shutter button + lens-mount ring (moves forward as
  // one unit) ----
  const frontPlate = new THREE.Group();
  frontPlate.name = "FrontPlate";
  const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 - 0.3, halfH * 2 - 0.15, 0.14), bodyMat);
  const mountRing = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.035, 10, 40), accentMat);
  mountRing.position.set(0, 0, 0.08);
  const shutterBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16),
    accentMat
  );
  shutterBtn.position.set(1.0, 0.75, 0.1);
  frontPlate.add(frontPanel, mountRing, shutterBtn);
  frontPlate.position.set(0, 0, panelDepth / 2 + 0.07);
  group.add(frontPlate);

  // ---- Lens: stepped barrel + front glass element (moves forward further) ----
  const lens = new THREE.Group();
  lens.name = "Lens";
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.78, 1.1, 48),
    bodyMat
  );
  barrel.rotation.x = Math.PI / 2;
  const barrelTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.72, 0.35, 48),
    bodyMat
  );
  barrelTip.rotation.x = Math.PI / 2;
  barrelTip.position.set(0, 0, 0.68);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 12, 40), accentMat);
  ring.position.set(0, 0, -0.4);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 48), glassMat);
  glass.rotation.x = Math.PI / 2;
  glass.position.set(0, 0, 0.86);
  lens.add(barrel, barrelTip, ring, glass);
  lens.position.set(0, 0, panelDepth / 2 + 0.9);
  group.add(lens);

  // ---- Viewfinder hump on top ----
  const viewfinder = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.9), bodyMat);
  viewfinder.name = "Viewfinder";
  viewfinder.position.set(0, halfH + 0.2, 0.05);
  group.add(viewfinder);

  // ---- Pop-up flash ----
  const flash = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.55), flashMat);
  flash.name = "Flash";
  flash.position.set(0, halfH + 0.48, 0.1);
  group.add(flash);

  // ---- Mirror (the part a DSLR normally hides) ----
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.95, 0.05), mirrorMat);
  mirror.name = "Mirror";
  mirror.rotation.x = Math.PI / 4;
  mirror.position.set(0, 0, 0.3);
  group.add(mirror);

  // ---- Sensor plate ----
  const sensor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 0.08), sensorMat);
  sensor.name = "Sensor";
  sensor.position.set(0, 0, -0.45);
  group.add(sensor);

  // ---- Circuit board + a few component "chips" ----
  const circuitBoard = new THREE.Group();
  circuitBoard.name = "CircuitBoard";
  const boardPlate = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 0.06), pcbMat);
  circuitBoard.add(boardPlate);
  const chipPositions = [
    [-0.55, 0.28, 0.06],
    [0.45, 0.18, 0.06],
    [-0.2, -0.32, 0.06],
  ];
  chipPositions.forEach(([x, y, z], i) => {
    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.06),
      i === 1 ? accentMat : chipMat
    );
    chip.position.set(x, y, z);
    circuitBoard.add(chip);
  });
  circuitBoard.position.set(0, 0, -0.78);
  group.add(circuitBoard);

  // ---- Back plate (LCD side) ----
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 - 0.3, halfH * 2 - 0.15, 0.14), darkMat);
  backPlate.name = "BackPlate";
  backPlate.position.set(0, 0, -(panelDepth / 2 + 0.07));
  group.add(backPlate);

  group.children.forEach((child) => registerPart(child, child.name));

  return group;
}

const loader = new GLTFLoader();

function mountModel(root) {
  root.scale.setScalar(1.15);
  rig.add(root);
}

loader.load(
  "assets/models/camera.glb",
  (gltf) => {
    const root = gltf.scene;
    root.traverse((child) => {
      if (child.isMesh) {
        registerPart(child, child.name);
      }
    });
    if (parts.length === 0) {
      // glb loaded but had no recognizable named parts — still show it,
      // just without the explode animation.
      console.warn(
        "[scene.js] camera.glb loaded but no named parts were found."
      );
    }
    mountModel(root);
  },
  undefined,
  (error) => {
    console.warn(
      "[scene.js] Could not load assets/models/camera.glb — using fallback primitive camera.",
      error
    );
    mountModel(buildFallbackCamera());
  }
);

// ---- Scroll-driven explode + rotation --------------------------------------
let explodeProgress = 0; // 0 = assembled, 1 = fully exploded
let targetRotationY = 0;

ScrollTrigger.create({
  trigger: document.body,
  start: "top top",
  end: "bottom bottom",
  scrub: 0.6,
  onUpdate: (self) => {
    // Explode happens across the first ~75% of the page, then holds exploded.
    explodeProgress = Math.min(self.progress / 0.75, 1);
    // A few full turns spread across the whole page for a continuous,
    // clearly visible spin as the page is scrolled.
    targetRotationY = self.progress * Math.PI * 3;
  },
});

// Fade the model back a little once the hero has scrolled past, so gallery /
// text-heavy sections underneath stay easy to read — it never disappears,
// just recedes, and it's at full strength again for the hero itself.
const heroSection = document.getElementById("hero");
if (heroSection) {
  gsap.to(canvas, {
    opacity: 0.4,
    ease: "none",
    scrollTrigger: {
      trigger: heroSection,
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
}

function applyExplode() {
  for (const part of parts) {
    const offset = part.axis
      .clone()
      .multiplyScalar(part.distance * explodeProgress);
    part.mesh.position.copy(part.origin).add(offset);
  }
}

// ---- Subtle idle motion + render loop --------------------------------------
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  rig.rotation.y += (targetRotationY - rig.rotation.y) * 0.06;
  rig.rotation.x = Math.sin(t * 0.15) * 0.05;
  rig.position.y = Math.sin(t * 0.4) * 0.08;

  applyExplode();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// ---- Resize handling --------------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
