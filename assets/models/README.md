# camera.glb

Place your 3D camera model here as `camera.glb` (binary glTF).

`js/scene.js` loads `assets/models/camera.glb` and looks for meshes named:

- `Body`
- `Lens`
- `Sensor`
- `Flash`

Each matched mesh is animated outward along a preset axis as the user scrolls
(see `PART_CONFIG` in `js/scene.js`), creating the exploded-view effect. Any
mesh with a different name is still rendered, just without explode animation
— so you can add more parts freely.

**Until a real `camera.glb` is added, the site automatically falls back to a
simple procedural camera** built from primitives (box body, cylinder lens,
flat sensor, box flash) so the scroll animation is fully visible without the
asset.

Tips for exporting from Blender:

1. Model the camera as separate objects/meshes named `Body`, `Lens`, `Sensor`,
   `Flash`.
2. Center each part's origin roughly where it should "hinge" from when
   assembled.
3. Export via `File > Export > glTF 2.0 (.glb)`, format = glTF Binary.
4. Keep the file reasonably small (a few MB) for fast loading on GitHub Pages.
