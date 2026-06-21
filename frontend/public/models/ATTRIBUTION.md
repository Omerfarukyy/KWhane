# 3D model attribution and processing

The all-Kenney furniture catalog is self-hosted. Its machine-readable inventory, exact
triangle counts, and final byte sizes are in `furniture/manifest.json`.

## Kenney Furniture Kit

- Source: [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit)
- Pack license file: Furniture Kit 2.0, created by Kenney
- License: CC0 1.0 Universal (public domain)
- Original files: selected `.glb` files from `Models/GLTF format/`
- Processing: `npx gltf-transform optimize <input.glb> <output.glb> --compress draco`
- Textures: none; the warm-modern material preset is applied at runtime

## Draco decoder

The offline decoder under `models/draco/` is the glTF build distributed with
Three.js and originates from [Google Draco](https://github.com/google/draco).
Draco is licensed under Apache License 2.0.
