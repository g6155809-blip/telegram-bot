---
name: ZModeler texture workflow
description: Compatibility notes for using exported GTA SA character assets in mobile ZModeler.
---

ZModeler’s material editor may ask for a `.png` image even when the source asset has a `.txd`; the PNG must be selected separately. When a single-file model is required, bake sampled texture colors into RenderWare vertex colors, remove UV/material texture references, and preserve Skin PLG for the skeleton.

**Why:** The mobile ZModeler workflow does not automatically resolve TXD files from the material picker, and a DFF-only asset cannot carry an external texture archive.

**How to apply:** Offer both variants: a textured DFF/TXD/PNG set for detail, and a DFF-only vertex-color version when the user needs to replace only one DFF file.