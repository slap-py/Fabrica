import { defineConfig } from 'vite';
import { losslessModels } from './scripts/compress-models.mjs';
export default defineConfig({
  plugins: [losslessModels()],
  // Pre-bundling would move three-mesh-bvh away from its worker script, breaking
  // `new URL('./generateMeshBVH.worker.js', import.meta.url)` in dev.
  optimizeDeps: { exclude: ['three-mesh-bvh', 'three-mesh-bvh/worker'] },
  worker: { format: 'es' },
});
