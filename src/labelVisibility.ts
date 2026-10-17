import * as THREE from 'three';

export type VisibilitySample = Generator<void, Map<string, THREE.Vector3>>;
interface VisibilityOptions {
  camera: THREE.PerspectiveCamera;
  width: number;
  freeWidth: number;
  height: number;
  anchors: readonly { id: string; anchor: THREE.Vector3 }[];
  previous: ReadonlyMap<string, THREE.Vector3>;
  raycaster: THREE.Raycaster;
  intersect: (raycaster: THREE.Raycaster) => THREE.Intersection | undefined;
  columns?: number;
  rows?: number;
}

/** A complete visibility pass uses one camera pose, even when spread across moving frames. */
export function* sampleLabelVisibility({ camera, width, freeWidth, height, anchors, previous, raycaster, intersect, columns = 40, rows = 24 }: VisibilityOptions): VisibilitySample {
  const pose = camera.clone();
  const candidates = new Set(anchors.map(anchor => anchor.id));
  const hits = new Map<string, { x: number; y: number; point: THREE.Vector3 }[]>();
  const ndc = new THREE.Vector2();
  const firstHit = (px: number, py: number) => {
    ndc.set(px / width * 2 - 1, -(py / height) * 2 + 1);
    raycaster.setFromCamera(ndc, pose);
    return intersect(raycaster);
  };
  const cast = (px: number, py: number) => {
    const hit = firstHit(px, py);
    const id = hit?.object.userData.id as string | undefined;
    if (!hit || !id || !candidates.has(id)) return;
    const points = hits.get(id) ?? [];
    if (!hits.has(id)) hits.set(id, points);
    points.push({ x: px, y: py, point: hit.point.clone() });
  };
  for (let i = 0; i < columns; i++) for (let j = 0; j < rows; j++) {
    cast((i + .5) / columns * freeWidth, (j + .5) / rows * height);
    yield;
  }
  // Keep anchor rays: narrow anatomy can fall between the grid rays.
  for (const { anchor } of anchors) {
    const p = anchor.clone().project(pose);
    const x = (p.x * .5 + .5) * width, y = (-p.y * .5 + .5) * height;
    if (p.z >= -1 && p.z <= 1 && x >= 0 && x <= freeWidth && y >= 0 && y <= height) cast(x, y);
    yield;
  }
  const points = new Map<string, THREE.Vector3>();
  for (const [id, samples] of hits) {
    if (samples.length < 2) continue;
    const old = previous.get(id);
    if (old) {
      const p = old.clone().project(pose);
      const x = (p.x * .5 + .5) * width, y = (-p.y * .5 + .5) * height;
      if (p.z >= -1 && p.z <= 1 && x >= 24 && x <= freeWidth - 24 && y >= 24 && y <= height - 24) {
        const hit = firstHit(x, y);
        if (hit && hit.object.userData.id === id && hit.point.distanceTo(old) < 1.5) points.set(id, old);
        yield;
      }
    }
    if (points.has(id)) continue;
    const cx = samples.reduce((sum, point) => sum + point.x, 0) / samples.length;
    const cy = samples.reduce((sum, point) => sum + point.y, 0) / samples.length;
    const distance = (point: { x: number; y: number }) => (point.x - cx) ** 2 + (point.y - cy) ** 2;
    const best = samples.reduce((best, point) => distance(point) < distance(best) ? point : best);
    points.set(id, best.point);
  }
  return points;
}

/** Bound label CPU work; also cap rays when the clock has coarse precision. */
export function advanceVisibilitySample(sample: VisibilitySample, budgetMs = 2, now: () => number = () => performance.now()): IteratorResult<void, Map<string, THREE.Vector3>> {
  const deadline = now() + budgetMs;
  let result: IteratorResult<void, Map<string, THREE.Vector3>>;
  let steps = 0;
  do {
    result = sample.next();
    if (result.done) return result;
  } while (++steps < 64 && now() < deadline);
  return result;
}

/** Reject mesh bounds before invoking BVH raycasts; anatomy remains static during a pass. */
export function boundedLabelIntersection(targets: readonly THREE.Mesh[], intersect: (caster: THREE.Raycaster, targets: THREE.Mesh[]) => THREE.Intersection[]) {
  const bounds = targets.map(mesh => {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    return { mesh, box: mesh.geometry.boundingBox?.clone().applyMatrix4(mesh.matrixWorld) };
  });
  const candidates: THREE.Mesh[] = [];
  return (caster: THREE.Raycaster) => {
    candidates.length = 0;
    for (const { mesh, box } of bounds) if (!box || caster.ray.intersectsBox(box)) candidates.push(mesh);
    return candidates.length ? intersect(caster, candidates)[0] : undefined;
  };
}
