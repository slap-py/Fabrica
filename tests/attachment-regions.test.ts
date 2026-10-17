import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { lowerLegPack } from '../src/regions/lower-leg';
import { leftLowerLegPack } from '../src/regions/left-lower-leg';
import right from '../src/regions/upper-leg/right';
import left from '../src/regions/upper-leg/left';
import arm from '../src/regions/arm-back/rightArm';
import back from '../src/regions/arm-back/back';
import { combineRegionPacks } from '../src/regions/combine';
import { disposeObject } from '../src/viewerResources';

async function scene(url: string) {
  const bytes = fs.readFileSync('public/' + url.replace(/^\//, ''));
  return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
}
describe('attachment refinement on registered region assets', () => {
  it('checks every region and combined scene, withholding unmodeled sartorius hip connections', async () => {
    const report = [];
    for (const pack of [lowerLegPack, leftLowerLegPack, right, left, arm, back, combineRegionPacks([right, lowerLegPack, arm, back])]) {
      const model = pack.createAnkle();
      try {
        const bones = await pack.loaders.loadBoneAssets(model.parts, pack.assets.bones, scene);
        const muscles = await pack.loaders.loadMuscleAssets(model.parts, pack.assets.muscles, scene);
        expect([...bones.fallback, ...muscles.fallback]).toEqual([]);
        pack.rebuildSoftTissues(model.parts);
        const connections = [...new Map(pack.structures.flatMap(s => pack.connectionsFor(model.parts, s.id)).map(c => [c.key, c])).values()];
        expect(connections.length, pack.id).toBeGreaterThan(0);
        const sartorius = connections.filter(c => c.record.structureId.endsWith('sartorius') && c.footprint.structureId.endsWith('hip-bone'));
        expect(sartorius, pack.id).toEqual([]);
        for (const structure of pack.structures) {
          const list = pack.connectionsFor(model.parts, structure.id);
          expect(new Set(list.map(c => c.key)).size).toBe(list.length);
          for (const c of list) {
            expect(c.footprint.meshIndex).toBeGreaterThanOrEqual(0);
            expect(c.footprint.faceIndex).toBeGreaterThanOrEqual(0);
            expect(model.parts.get(c.record.structureId)?.meshes.length).toBeGreaterThan(0);
          }
        }
        report.push({ region: pack.id, cards: connections.length, sartoriusHipCards: sartorius.length, connections: connections.map(c => ({ key: c.key, structure: c.record.structureId, host: c.footprint.structureId })) });
      } finally { disposeObject(model.root); }
    }
    fs.writeFileSync('validation/attachment-refinement.json', JSON.stringify(report, null, 2) + '\n');
  }, 120000);
});
