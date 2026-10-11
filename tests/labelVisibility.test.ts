import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { advanceVisibilitySample, boundedLabelIntersection, sampleLabelVisibility, type VisibilitySample } from '../src/labelVisibility';

function setup() {
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 100);
  camera.position.z = 10; camera.updateMatrixWorld(true);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshBasicMaterial());
  mesh.userData.id = 'bone'; mesh.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  return { camera, width: 100, freeWidth: 100, height: 100, anchors: [{ id: 'bone', anchor: new THREE.Vector3() }], previous: new Map<string, THREE.Vector3>(), raycaster, intersect: (caster: THREE.Raycaster) => caster.intersectObject(mesh, false)[0], columns: 8, rows: 8, mesh };
}
function finish(sample: VisibilitySample) {
  let result;
  do { result = advanceVisibilitySample(sample, 2, () => 0); } while (!result.done);
  return result.value;
}
describe('incremental label visibility', () => {
  it('yields within the frame budget and limits work with a coarse clock', () => {
    let steps = 0, time = 0;
    function* expensive(): VisibilitySample { for (let i = 0; i < 100; i++) { steps++; time += .8; yield; } return new Map(); }
    const task = expensive();
    expect(advanceVisibilitySample(task, 2, () => time).done).toBe(false);
    expect(steps).toBe(3);
    steps = 0;
    expect(advanceVisibilitySample(expensive(), 2, () => 0).done).toBe(false);
    expect(steps).toBe(64);
  });
  it('uses one camera pose for the whole scan and preserves a still-visible surface point', () => {
    const options = setup();
    const task = sampleLabelVisibility(options);
    task.next(); options.camera.position.x = 100; options.camera.updateMatrixWorld(true);
    const points = finish(task);
    expect(points.has('bone')).toBe(true);
    const fresh = setup(), old = points.get('bone')!;
    fresh.previous.set('bone', old);
    expect(finish(sampleLabelVisibility(fresh)).get('bone')).toBe(old);
  });
  it('does not label an occluded structure', () => {
    const options = setup();
    const front = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 1), new THREE.MeshBasicMaterial());
    front.position.z = 4; front.userData.id = 'occluder'; front.updateMatrixWorld(true);
    options.intersect = caster => caster.intersectObjects([front, options.mesh], false)[0];
    expect(finish(sampleLabelVisibility(options)).has('bone')).toBe(false);
  });
});

describe('label ray bounds', () => {
  it('skips distant meshes while preserving the closest hit and transformed anatomy', () => {
    const options = setup();
    const away = options.mesh.clone(); away.position.x = 50; away.updateMatrixWorld(true);
    const near = options.mesh.clone(); near.position.z = 4; near.rotation.y = Math.PI / 4; near.updateMatrixWorld(true);
    let checked: THREE.Mesh[] = [];
    const intersect = boundedLabelIntersection([options.mesh, away, near], (caster, targets) => {
      checked = targets; return caster.intersectObjects(targets, false);
    });
    options.raycaster.setFromCamera(new THREE.Vector2(), options.camera);
    const expected = options.raycaster.intersectObjects([options.mesh, away, near], false)[0];
    const hit = intersect(options.raycaster);
    expect(hit?.object).toBe(near);
    expect(hit?.distance).toBeCloseTo(expected.distance);
    expect(checked).toEqual([options.mesh, near]);
  });
});
