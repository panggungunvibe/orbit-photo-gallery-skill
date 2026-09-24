import { mkdir, copyFile, readdir } from 'node:fs/promises';
const source = new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url);
const target = new URL('../public/vision/', import.meta.url);
await mkdir(target, { recursive: true });
for (const file of await readdir(source)) {
  if (/\.(wasm|js)$/.test(file)) await copyFile(new URL(file, source), new URL(file, target));
}
