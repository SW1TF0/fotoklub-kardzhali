// ============================================================================
// scene.js — 3D "exploded camera" background driven by scroll position
// ----------------------------------------------------------------------------
// Expects a glTF binary file at assets/models/camera.glb containing distinct
// named meshes/groups for the camera parts, e.g.:
//   Body, Lens, Sensor, Flash
// (Any subset of these names is fine — anything not found simply keeps its
// original position and isn't animated.)
//
// If the model fails to load (e.g. camera.glb hasn't been added to the repo
// yet) a stand-in low-poly camera built from primitives is used instead, so
// the scroll-explode effect is still visible without the real asset.
// ============================================================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById("camera-canvas");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.06);

const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(2.2, 0.4, 13);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---- Lighting --------------------------------------------------------------
const keyLight = new THREE.DirectionalLight(0xfff3d6, 1.4);
keyLight.position.set(4, 5, 6);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xd6a94a, 0.9);
rimLight.position.set(-5, -2, -4);
scene.add(rimLight);

const ambient = new THREE.AmbientLight(0x404050, 0.7);
scene.add(ambient);

// ---- Rig: everything hangs off this group so we can rotate/tilt as one ----
const rig = new THREE.Group();
scene.add(rig);

// Named parts we look for in the loaded model, and their "exploded" travel
// direction/distance along local space. Order roughly front-to-back like a
// real camera: lens -> body -> sensor -> flash.
const PART_CONFIG = {
  Lens: { axis: new THREE.Vector3(0, 0, 1), distance: 2.1 },
  Body: { axis: new THREE.Vector3(0, 0, 0), distance: 0 },
  Sensor: { axis: new THREE.Vector3(0, 0, -1), distance: 1.7 },
  Flash: { axis: new THREE.Vector3(0, 1, 0), distance: 1.4 },
};

const parts = []; // { mesh, origin: Vector3, axis: Vector3, distance: number }

function registerPart(mesh, name) {
  const config = PART_CONFIG[name] || {
    axis: new THREE.Vector3(0, 0, 1),
    distance: 1.5,
  };
  parts.push({
    mesh,
    origin: mesh.position.clone(),
    axis: config.axis.clone(),
    distance: config.distance,
  });
}

function buildFallbackCamera() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1c1c1e,
    metalness: 0.6,
    roughness: 0.35,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xd6a94a,
    metalness: 0.8,
    roughness: 0.25,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 2, 1.6),
    bodyMat
  );
  body.name = "Body";
  group.add(body);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.95, 1.8, 32),
    accentMat
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, 1.6);
  lens.name = "Lens";
  group.add(lens);

  const sensor = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.6, 0.15),
    new THREE.MeshStandardMaterial({
      color: 0x2f6fed,
      metalness: 0.9,
      roughness: 0.2,
    })
  );
  sensor.position.set(0, 0, -0.7);
  sensor.name = "Sensor";
  group.add(sensor);

  const flash = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.5, 0.6),
    bodyMat
  );
  flash.position.set(0, 1.25, 0.4);
  flash.name = "Flash";
  group.add(flash);

  group.traverse((child) => {
    if (child.isMesh) registerPart(child, child.name);
  });

  return group;
}

const loader = new GLTFLoader();

function mountModel(root) {
  root.scale.setScalar(1.1);
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
        "[scene.js] camera.glb loaded but no named parts (Body/Lens/Sensor/Flash) were found."
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
    // Explode happens across the first ~60% of the page, then holds exploded.
    explodeProgress = Math.min(self.progress / 0.6, 1);
    targetRotationY = self.progress * Math.PI * 1.2;
  },
});

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
