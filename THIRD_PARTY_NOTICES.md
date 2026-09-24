# Third-party components

The MIT license covers this repository's original application code, scripts,
instructions and geometric SVG demo artwork. It does not relicense user photos
or third-party packages/models.

- `@mediapipe/tasks-vision` is installed through npm. Its license and notices are
  included in that package. Upstream: https://github.com/google-ai-edge/mediapipe
- Vite and its transitive dependencies are installed through npm; their individual
  license files apply. Upstream: https://github.com/vitejs/vite
- `fflate` is installed through npm for ZIP export (MIT).
  Upstream: https://github.com/101arrowz/fflate
- Pillow is installed separately with pip and retains its own license.
  Upstream: https://github.com/python-pillow/Pillow
- The optional Hand Landmarker model is **not redistributed** in this repository.
  `npm run setup:hands` downloads Google's version 1 float16 model directly and
  verifies its SHA-256. See the provider documentation and applicable terms:
  https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
  Model URL is recorded in `assets/template/scripts/setup-hands.mjs`.

No original reference-video frames or personal travel photos are included.
