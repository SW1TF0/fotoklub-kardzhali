# camera.glb

Place your 3D camera model here as `camera.glb` (binary glTF).

`js/scene.js` loads `assets/models/camera.glb` and looks for top-level meshes
or groups named:

- `Body` — the anchor part; stays in place while everything else explodes
  outward from it
- `FrontPlate`, `Lens` — move forward (+Z)
- `Viewfinder`, `Flash` — move upward (+Y)
- `Mirror` — pops up/forward slightly
- `Sensor`, `CircuitBoard`, `BackPlate` — move backward (-Z)

Each matched part is animated outward along its preset axis as the user
scrolls (see `PART_CONFIG` in `js/scene.js`), creating the exploded-view
effect. Any mesh with a different name is still rendered, just without
explode animation — so you can add more parts freely. Any subset of the
names above is fine too; unmatched names simply default to a modest forward
explode distance.

**Until a real `camera.glb` is added, the site automatically falls back to a
detailed procedural camera** built from primitives (rounded-edge chassis,
lens with a glass element, viewfinder hump, flash, plus the mirror / sensor /
circuit board it normally hides inside) so the scroll animation is fully
visible without the asset.

Tips for exporting from Blender:

1. Model the camera as separate objects/meshes using the names above (a
   subset is fine — e.g. just `Body`, `Lens`, `Sensor`, `Flash`).
2. Center each part's origin roughly where it should "hinge" from when
   assembled.
3. Export via `File > Export > glTF 2.0 (.glb)`, format = glTF Binary.
4. Keep the file reasonably small (a few MB) for fast loading on GitHub Pages.
