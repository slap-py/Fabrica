import { createLoadQueue } from '../assetLoading';
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { validateRegionPack, type RegionPack } from './index';
import type { AnatomyParts } from '../softTissues';
import { resolveFootprint } from '../softTissues';
import { connectionCameraPose, connectionOccluders } from '../connections';
import { createRegionAssetLoaders, type AssetReport, type RegionAssetGroups } from '../assets';
import type { MmPoint } from '../attachments';
import { clipGeometryAboveY } from './combinedGeometry';
import { enableMeshPicking } from '../picking';
import { disposeObject } from '../viewerResources';
import { combinedTitleForIds } from './combinedTitle';

/** Frozen source datums from the bone and upper-leg export manifests.
 * All assets use +X anterior, +Y superior, +Z subject-right in mm.
 * Restore the shared source frame rather than fitting models by their bounds.
 * The left lower leg remains the existing mirrored right-side derivative.
 */
export const assemblyOffsets: Readonly<Record<string, readonly [number, number, number]>> = {
  'right-arm': [0, 0, 0],
  'left-arm': [0, 0, 0],
  'back': [0, 0, 0],
  'lower-leg': [-36.57284379005432, 67.66913086175919, 74.70057159662247],
  'left-lower-leg': [-36.57284379005432, 67.66913086175919, -74.70057159662247],
  'right-upper-leg': [-20.297355949878693, 657.085657119751, 90.23460745811462],
  'left-upper-leg': [-20.297355949878693, 657.085657119751, -90.23460745811462],
};
const sideOf = (pack: RegionPack) => pack.id.startsWith('left-') ? 'left' : 'right';
const isLower = (pack: RegionPack) => pack.id === 'lower-leg' || pack.id === 'left-lower-leg';
const isUpper = (pack: RegionPack) => pack.id.endsWith('upper-leg');

/** Hide only the two regional skin cut caps when both matching side packs are selected. */
function syncCombinedSkinCaps(contexts: readonly Context[]) {
  const pairedSides = new Set(contexts.filter(context => isUpper(context.pack)).map(context => sideOf(context.pack)).filter(side => contexts.some(other => isLower(other.pack) && sideOf(other.pack) === side)));
  for (const context of contexts) for (const part of context.parts.values()) for (const mesh of part.meshes) {
    const cap = mesh.userData.skinCap === true || mesh.name.startsWith("skin-cap-");
    const end = mesh.userData.capEnd;
    mesh.userData.combineCapHidden = cap && pairedSides.has(sideOf(context.pack)) && end === "seam";
  }
}
interface Member { pack: RegionPack; local: string; }
interface Context { pack: RegionPack; parts: AnatomyParts; offset: THREE.Vector3; }

const combinedTitle = (packs: readonly RegionPack[]) => combinedTitleForIds(packs.map(pack => pack.id));

/** Compose packs while their asset loaders and authored attachments stay in local coordinates. */
export function combineRegionPacks(input: readonly RegionPack[]): RegionPack {
  const packs = [...input].sort((a, b) => a.id.localeCompare(b.id));
  if (!packs.length) throw new Error('Choose at least one region');
  if (new Set(packs.map(pack => pack.id)).size !== packs.length) throw new Error('Duplicate regions');
  if (packs.length === 1) return packs[0];
  for (const pack of packs) if (!assemblyOffsets[pack.id]) throw new Error(`Missing assembly registration: ${pack.id}`);
  const base = packs.find(p => p.id === 'back') ?? packs.find(isUpper) ?? packs[0];
  const owners = new Map<string, Member>();
  const localIds = new Map<string, Map<string, string>>();
  const fullShafts = new Map(packs.filter(isLower).map(pack => [sideOf(pack), pack]));
  const sacrumOwner = packs.find(pack => isUpper(pack) && pack.byId.sacrum);
  const canonicalOwners = new Map<string, Member>();
  for (const pack of packs) for (const [local, key] of Object.entries(pack.canonicalStructureIds ?? {}))
    if (!canonicalOwners.has(key)) canonicalOwners.set(key, {pack, local});
  const sourceOwners = new Map<string, Member>();
  const sourceKey = (pack: RegionPack, local: string) => {
    if (pack.canonicalStructureIds?.[local]) return undefined;
    const source = pack.neurovascularSources?.[local];
    return source && pack.isNeurovascular(pack.byId[local].tissue)
      ? sideOf(pack) + ':' + pack.byId[local].tissue + ':' + source.replace(/\.[lr]$/, '') : undefined;
  };
  // Prefer distal IDs so existing foot/ankle deep links remain stable.
  for (const pack of [...packs].sort((a, b) => Number(isUpper(a)) - Number(isUpper(b))))
    for (const structure of pack.structures) {
      const key = sourceKey(pack, structure.id);
      if (key && !sourceOwners.has(key)) sourceOwners.set(key, { pack, local: structure.id });
    }
  const globalId = (pack: RegionPack, id: string): string => localIds.get(pack.id)?.get(id) ?? `${pack.id}:${id}`;
  // Full lower-leg bones replace proximal context copies in upper-leg packs.
  // Keep those source copies offscreen for the original attachment fitting code.
  for (const pack of packs) {
    const ids = new Map<string, string>();
    localIds.set(pack.id, ids);
    for (const structure of pack.structures) {
      const owner = isUpper(pack) && ['tibia', 'fibula'].includes(structure.id)
        ? fullShafts.get(sideOf(pack)) ?? pack
        : structure.id === 'sacrum' ? sacrumOwner ?? pack : pack;
      const key = sourceKey(pack, structure.id);
      const canonical = pack.canonicalStructureIds?.[structure.id];
      const member = canonical ? canonicalOwners.get(canonical)! : key ? sourceOwners.get(key)! : { pack: owner, local: structure.id };
      const id = canonical ?? `${member.pack.id}:${member.local}`;
      ids.set(structure.id, id);
      owners.set(id, member);
    }
  }
  const members = new Map<string, Member[]>();
  const structureAliases: Record<string, string> = {};
  for (const pack of packs) for (const [local, id] of localIds.get(pack.id)!) {
    const list = members.get(id) ?? [];
    list.push({ pack, local }); members.set(id, list);
    structureAliases[pack.id + ':' + local] = id;
    const canonical = pack.canonicalStructureIds?.[local];
    if (canonical) { structureAliases[canonical] = id; structureAliases[local] = id; }
  }
  const sharedNeurovascular = new Set([...members].filter(([id, list]) => {
    const owner = owners.get(id)!;
    return !owner.pack.canonicalStructureIds?.[owner.local] && list.length > 1 && owner.pack.isNeurovascular(owner.pack.byId[owner.local].tissue);
  }).map(([id]) => id));
  const structureRegions = Object.fromEntries([...members].map(([id, list]) => [id, list.map(member => member.pack.title)]));
  const structures = [...owners].map(([id, owner]) => {
    const data = owner.pack.byId[owner.local];
    const sections = members.get(id)!.map(member => member.pack.byId[member.local]);
    const proximal = members.get(id)!.find(member => isUpper(member.pack));
    const overview = proximal ? proximal.pack.byId[proximal.local] : data;
    const unique = <T>(values: T[], key: (value: T) => string) => [...new Map(values.map(value => [key(value), value])).values()];
    return {
      ...data, id, name: data.tissue === "cartilage" ? data.name.replace(" · articular cartilage", " articular cartilage") : data.name,
      ...(sharedNeurovascular.has(id) ? {
        description: overview.description, role: overview.role, connection: overview.connection,
        facts: unique(sections.flatMap(section => section.facts ?? []), fact => fact.text + ':' + fact.source.url),
        references: unique(sections.flatMap(section => section.references ?? []), reference => reference.url),
      } : {}),
    };
  });
  const byId = Object.fromEntries(structures.map(structure => [structure.id, structure]));
  const contexts = new WeakMap<AnatomyParts, Context[]>();
  const assetQueues = new WeakMap<AnatomyParts, ReturnType<typeof createLoadQueue>>();
  const getContexts = (parts: AnatomyParts) => {
    const result = contexts.get(parts);
    if (!result) throw new Error('Combined model has not been created');
    return result;
  };
  function sync(parts: AnatomyParts, context: Context) {
    for (const [local, part] of context.parts) {
      const id = globalId(context.pack, local);
      for (const mesh of part.meshes) {
        mesh.userData.id = id;
        mesh.userData.atlasId = id;
      }
      if (owners.get(id)?.pack.id === context.pack.id)
        parts.get(id)!.anchor.copy(part.anchor).add(context.offset);
    }
    // Aggregate every section into one selectable part, including its bounds.
    for (const id of sharedNeurovascular) {
      const combined = parts.get(id)!;
      const sections = getContexts(parts).flatMap(c => [...c.parts].filter(([local]) => globalId(c.pack, local) === id).map(([, part]) => part));
      combined.meshes.splice(0, combined.meshes.length, ...sections.flatMap(part => part.meshes));
      combined.group.userData.unavailable = sections.every(part => part.group.userData.unavailable || !part.meshes.length);
      const bounds = new THREE.Box3();
      for (const mesh of combined.meshes) {
        mesh.updateWorldMatrix(true, false);
        bounds.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld));
      }
      if (!bounds.isEmpty()) bounds.getCenter(combined.anchor);
    }
    syncCombinedSkinCaps(getContexts(parts));
  }
  const createAnkle: RegionPack['createAnkle'] = () => {
    const root = new THREE.Group(), parts: AnatomyParts = new Map(), list: Context[] = [];
    // Register all primary parts before installing aliases.
    for (const pack of packs) {
      const model = pack.createAnkle();
      const offset = new THREE.Vector3(...assemblyOffsets[pack.id]);
      model.root.position.copy(offset);
      root.add(model.root);
      const hiddenContext = new THREE.Group();
      hiddenContext.visible = false;
      model.root.add(hiddenContext);
      const context = { pack, parts: model.parts, offset };
      list.push(context);
      for (const [local, part] of model.parts) {
        const id = globalId(pack, local);
        if (sharedNeurovascular.has(id)) {
          let combined = parts.get(id);
          if (!combined) {
            const group = new THREE.Group(); group.name = id; root.add(group);
            combined = { id, group, meshes: [], anchor: part.anchor.clone().add(offset) };
            parts.set(id, combined);
          }
          // Preserve local geometry coordinates and every regional loader's parts.
          root.updateMatrixWorld(true);
          combined.group.attach(part.group);
          continue;
        }
        if (owners.get(id)?.pack.id !== pack.id) { hiddenContext.add(part.group); continue; }
        parts.set(id, { id, group: part.group, meshes: part.meshes, anchor: part.anchor.clone().add(offset) });
      }
    }
    // Identical canonical objects from the same asset URL have one owner. Local
    // attachment queries refer to that owner's part instead of hidden mesh copies.
    for (const context of list) for (const [local, part] of context.parts) {
      const canonical = context.pack.canonicalStructureIds?.[local];
      const owner = owners.get(globalId(context.pack, local))!;
      const host = list.find(c => c.pack.id === owner.pack.id)!;
      if (!canonical || host === context || !context.pack.loaders.assetGroups ||
        !(['bones', 'muscles', 'neurovascular'] as const).every(group => context.pack.assets[group] === host.pack.assets[group])) continue;
      part.group.removeFromParent();
      disposeObject(part.group);
      context.parts.set(local, host.parts.get(owner.local)!);
    }
    contexts.set(parts, list);
    list.forEach(context => sync(parts, context));
    root.updateMatrixWorld(true);
    return { root, parts };
  };
  const mapSet = (pack: RegionPack, ids: Set<string>) => new Set([...ids].map(id => globalId(pack, id)).filter(id => byId[id]));
  const related = (id: string, method: 'relatedIds' | 'directlyAttachedIds' | 'connectionHighlightIds') => {
    const result = new Set<string>();
    // Canonical anatomy can connect endpoints residing in different regional packs.
    for (const pack of packs) for (const target of pack.canonicalRelatedIds?.(id) ?? []) if (byId[target]) result.add(target);
    for (const pack of packs) for (const [local, global] of localIds.get(pack.id)!) {
      if (global === id) for (const value of mapSet(pack, pack[method](local))) result.add(value);
    }
    return result;
  };
  const pointKeys = new Set(['seedMm', 'positionMm', 'authoredPositionMm', 'centerMm', 'boundaryMm', 'centerlineMm']);
  function remap<T>(value: T, context: Context, key = ''): T {
    if (Array.isArray(value)) {
      if (pointKeys.has(key) && value.length === 3 && value.every(item => typeof item === 'number'))
        return new THREE.Vector3(...value as MmPoint).add(context.offset).toArray() as T;
      return value.map(item => remap(item, context, key)) as T;
    }
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, remap(childValue, context, childKey)])) as T;
    if (typeof value === 'string') {
      if (['structureId', 'supportId'].includes(key)) return globalId(context.pack, value) as T;
      if (['id', 'key', 'sourceIds'].includes(key)) return `${context.pack.id}:${value}` as T;
    }
    return value;
  }
  const connectionsFor: RegionPack['connectionsFor'] = (parts, id) => {
    const list = getContexts(parts);
    const completeConnections = new Set<string>();
    return list.flatMap(context => [...localIds.get(context.pack.id)!].filter(([, global]) => global === id).flatMap(([local]) =>
      context.pack.connectionsFor(context.parts, local).flatMap(connection => {
        const canonical = context.pack.canonicalStructureIds?.[connection.record.structureId];
        const key = canonical && canonical + ':' + connection.key;
        if (key && completeConnections.has(key)) return [];
        if (key) completeConnections.add(key);
        const mapped = remap(connection, context);
        const owner = owners.get(mapped.footprint.structureId)!;
        if (owner.pack.id !== context.pack.id) {
          const host = list.find(item => item.pack.id === owner.pack.id)!;
          const endpoint = mapped.record[connection.end];
          const seed = new THREE.Vector3(...endpoint.seedMm).sub(host.offset).toArray() as MmPoint;
          mapped.footprint = remap(resolveFootprint(host.parts, { ...endpoint, structureId: owner.local, seedMm: seed }), host);
        }
        return [mapped];
      }),
    ));
  };
  const footprintDecal: RegionPack['footprintDecal'] = (parts, connection) => {
    const f = connection.footprint;
    if (connection.record[connection.end].kind !== 'surface' || byId[f.structureId]?.tissue !== 'bone') return;
    const bone = parts.get(f.structureId)?.meshes[f.meshIndex];
    if (!bone) return;
    bone.updateWorldMatrix(true, false);
    const orientation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...f.normal).normalize()));
    const geometry = new DecalGeometry(bone, new THREE.Vector3(...f.centerMm), orientation, new THREE.Vector3(f.radiusMm * 2, f.radiusMm * 2, Math.max(2, f.radiusMm)));
    const decal = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#21bda8', transparent: true, opacity: .95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, side: THREE.DoubleSide }));
    decal.userData = { connectionKey: connection.key, boneId: f.structureId };
    decal.renderOrder = 5;
    return decal;
  };
  function mergeReports(parts: AnatomyParts, reports: AssetReport[]): AssetReport {
    const list = getContexts(parts);
    const mapIds = (key: 'loaded' | 'fallback') => new Set(reports.flatMap((report, index) => report[key]
      .filter(local => sharedNeurovascular.has(globalId(list[index].pack, local)) || owners.get(globalId(list[index].pack, local))?.pack.id === list[index].pack.id)
      .map(local => globalId(list[index].pack, local))));
    const loaded = mapIds('loaded');
    return { loaded: [...loaded], fallback: [...mapIds('fallback')].filter(id => !loaded.has(id)), warnings: reports.flatMap((report, index) => report.warnings.map(warning => list[index].pack.title + ': ' + warning)) };
  }
  // Group complete native anatomy by asset URL before parsing or building BVHs.
  // Distinct regional crops keep their own loaders and attachment context.
  async function loadGroup(parts: AnatomyParts, group: keyof RegionAssetGroups,
    scene: Parameters<RegionPack['loaders']['loadBoneAssets']>[2],
    progress: Parameters<RegionPack['loaders']['loadBoneAssets']>[3],
    bvh: Parameters<RegionPack['loaders']['loadBoneAssets']>[4]) {
    const list = getContexts(parts);
    const batches = new Map<string, Context[]>();
    for (const context of list) {
      const key = context.pack.loaders.assetGroups ? context.pack.assets[group] : context.pack.id;
      const batch = batches.get(key) ?? [];
      batch.push(context); batches.set(key, batch);
    }
    const reports = new Map<Context, AssetReport>();
    let queue = assetQueues.get(parts);
    if (!queue) {
      const signal = (scene as { signal?: AbortSignal } | undefined)?.signal ?? new AbortController().signal;
      queue = createLoadQueue(signal, 2); assetQueues.set(parts, queue);
    }
    await Promise.all([...batches.values()].map(batch => queue!(async () => {
      const first = batch[0];
      let target = first.parts, loaders = first.pack.loaders;
      if (batch.length > 1) {
        target = new Map(batch.flatMap(c => [...c.parts]));
        const groups: RegionAssetGroups = { bones: [], muscles: [], exterior: [], neurovascular: [] };
        groups[group] = [...new Set(batch.flatMap(c => c.pack.loaders.assetGroups![group]))];
        const records = [...new Map(batch.flatMap(c => c.pack.structures.map(s => [s.id, s] as const))).values()];
        loaders = createRegionAssetLoaders(records, groups);
      }
      const url = first.pack.assets[group];
      const report = group === 'bones' ? await loaders.loadBoneAssets(target, url, scene, progress, bvh)
        : group === 'muscles' ? await loaders.loadMuscleAssets(target, url, scene, progress, bvh)
        : group === 'exterior' ? await loaders.loadExteriorAssets(target, progress, bvh, url, scene)
        : await loaders.loadNeurovascularAssets(target, url, scene, bvh);
      for (const context of batch) {
        const ids = new Set(context.pack.structures.map(s => s.id));
        reports.set(context, { loaded: report.loaded.filter(id => ids.has(id)), fallback: report.fallback.filter(id => ids.has(id)), warnings: context === first ? report.warnings : [] });
        sync(parts, context);
      }
    })));
    return mergeReports(parts, list.map(c => reports.get(c)!));
  }
  async function loadNeurovascular(parts: AnatomyParts, scene: Parameters<RegionPack['loaders']['loadNeurovascularAssets']>[2], bvh: Parameters<RegionPack['loaders']['loadNeurovascularAssets']>[3]) {
    const report = await loadGroup(parts, 'neurovascular', scene, undefined, bvh);
    const changed: THREE.Mesh[] = [];
    const list = getContexts(parts);
    for (const id of sharedNeurovascular) {
      const sections = members.get(id)!;
      const lower = sections.find(member => member.pack.neurovascularCropYMaxMm !== undefined);
      if (!lower) continue;
      const lowerContext = list.find(c => c.pack.id === lower.pack.id)!;
      const distal = lowerContext.parts.get(lower.local)!;
      // If a section fails, retain all geometry from the successful region.
      if (distal.group.userData.unavailable || !distal.meshes.length) continue;
      const seam = lower.pack.neurovascularCropYMaxMm! + lowerContext.offset.y;
      for (const member of sections.filter(member => isUpper(member.pack))) {
        const context = list.find(c => c.pack.id === member.pack.id)!;
        const part = context.parts.get(member.local)!;
        for (const mesh of [...part.meshes]) {
          const clipped = clipGeometryAboveY(mesh.geometry, seam - context.offset.y);
          if (!clipped) continue;
          if (!clipped.getAttribute('position').count) {
            clipped.dispose(); part.group.remove(mesh);
            part.meshes.splice(part.meshes.indexOf(mesh), 1); disposeObject(mesh);
          } else {
            mesh.geometry.dispose(); mesh.geometry = clipped; changed.push(mesh);
          }
        }
      }
    }
    if (bvh) await bvh(changed); else changed.forEach(enableMeshPicking);
    list.forEach(context => sync(parts, context));
    return report;
  }
  const loaders: RegionPack['loaders'] = {
    createAssetSceneLoader: (signal, onProgress) => {
      const bytes = new Map<string, { loaded: number; total: number }>();
      return Object.assign((url: string) => {
        bytes.set(url, { loaded: 0, total: 0 });
        const loader = base.loaders.createAssetSceneLoader(signal, (loaded, total) => {
          bytes.set(url, { loaded, total });
          const values = [...bytes.values()];
          onProgress?.(values.reduce((sum, value) => sum + value.loaded, 0),
            values.every(value => value.total > 0) ? values.reduce((sum, value) => sum + value.total, 0) : 0);
        });
        return loader(url);
      }, { signal });
    },
    loadBoneAssets: (parts, _url, scene, progress, bvh) => loadGroup(parts, 'bones', scene, progress, bvh),
    loadMuscleAssets: (parts, _url, scene, progress, bvh) => loadGroup(parts, 'muscles', scene, progress, bvh),
    loadExteriorAssets: (parts, progress, bvh, _url, scene) => loadGroup(parts, 'exterior', scene, progress, bvh),
    loadNeurovascularAssets: (parts, _url, scene, bvh) => loadNeurovascular(parts, scene, bvh),
  };
  const rebuildSoftTissues: RegionPack['rebuildSoftTissues'] = parts => {
    const reports = getContexts(parts).map(context => { const report = context.pack.rebuildSoftTissues(context.parts); sync(parts, context); return report; });
    return { attachments: reports.reduce((n, report) => n + report.attachments, 0), cartilagePatches: reports.reduce((n, report) => n + report.cartilagePatches, 0) - [...members].filter(([id])=>owners.get(id)!.pack.canonicalStructureIds?.[owners.get(id)!.local] && byId[id].tissue==='cartilage' && parts.get(id)?.meshes.length).reduce((n,[,list])=>n+list.length-1,0), warnings: reports.flatMap(report => report.warnings) };
  };
  const areas = [{ id: 'all', label: 'All regions', group: '' }, ...packs.flatMap(pack => [
    { id: pack.id, label: pack.title, group: '' },
    ...pack.atlasAreas.filter(area => area.id !== 'all').map(area => ({ id: `${pack.id}:${area.id}`, label: area.label, group: pack.title })),
  ])];
  const atlasIds = (area: string) => {
    if (area === 'all') return new Set(structures.map(structure => structure.id));
    const pack = packs.find(pack => area === pack.id || area.startsWith(`${pack.id}:`));
    return pack ? mapSet(pack, pack.atlasIds(area === pack.id ? 'all' : area.slice(pack.id.length + 1))) : new Set<string>();
  };
  const tissueKeys = base.tissueKeys.filter(tissue => structures.some(structure => structure.tissue === tissue));
  const title = combinedTitle(packs);
  const overview = 'Explore the selected regions together. Shared tibia/fibula context copies, the sacrum when shared, and matching vessels and nerves and canonical shoulder/back source structures are counted once across regions. Skin is excluded from browsable totals. Use Area to browse each region. Return to Browser to change the selected regions.';
  const framing = new THREE.Box3();
  for (const pack of packs) if (pack.sceneBoundsMm) {
    const offset = new THREE.Vector3(...assemblyOffsets[pack.id]);
    framing.expandByPoint(new THREE.Vector3(...pack.sceneBoundsMm[0]).add(offset));
    framing.expandByPoint(new THREE.Vector3(...pack.sceneBoundsMm[1]).add(offset));
  }
  const sourceFraming = packs.every(pack => pack.sceneBoundsMm);
  const target = sourceFraming ? framing.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, packs.some(isUpper) ? 450 : 160, 0);
  const frameDistance = sourceFraming ? framing.getSize(new THREE.Vector3()).length() * 1.65 : packs.some(isUpper) ? 2100 : 1200;
  const cameraPreset: RegionPack['cameraPreset'] = (view, aspect) => {
    const direction = new THREE.Vector3(...(base.cameraViews[view] ?? base.cameraViews[base.defaultView])).normalize();
    return { target: target.clone(), position: target.clone().addScaledVector(direction, frameDistance * Math.max(1, .8 / aspect)) };
  };
  return validateRegionPack({
    ...base, id: packs.map(pack => pack.id).join('+'), regionIds: packs.map(pack => pack.id), title, description: overview,
    structures, byId, structureAliases, structureRegions, canonicalStructureIds: undefined, dataOnlyStructures: [...new Map(packs.flatMap(p=>p.dataOnlyStructures ?? []).map(s=>[s.id,s])).values()], neurovascularSources: undefined, neurovascularCropYMaxMm: undefined, tissueKeys, createAnkle, loaders, rebuildSoftTissues, atlasIds, atlasAreas: areas, atlasTabs: areas,
    rebuildSoftTissuesAsync: async (parts, signal) => {
      const reports = [];
      for (const context of getContexts(parts)) {
        signal.throwIfAborted();
        reports.push(context.pack.rebuildSoftTissuesAsync ? await context.pack.rebuildSoftTissuesAsync(context.parts, signal) : context.pack.rebuildSoftTissues(context.parts));
        sync(parts, context);
      }
      return { attachments: reports.reduce((sum, r) => sum + r.attachments, 0), cartilagePatches: reports.reduce((sum, r) => sum + r.cartilagePatches, 0) - [...members].filter(([id]) => owners.get(id)!.pack.canonicalStructureIds?.[owners.get(id)!.local] && byId[id].tissue === 'cartilage' && parts.get(id)?.meshes.length).reduce((sum, [, list]) => sum + list.length - 1, 0), warnings: reports.flatMap(r => r.warnings) };
    },
    relatedIds: id => related(id, 'relatedIds'), directlyAttachedIds: id => related(id, 'directlyAttachedIds'), connectionHighlightIds: id => related(id, 'connectionHighlightIds'),
    connectionsFor, footprintDecal, connectionCameraPose, connectionOccluders,
    attachmentSources: Object.fromEntries(packs.flatMap(pack => Object.entries(pack.attachmentSources).map(([id, source]) => [`${pack.id}:${id}`, source]))) as RegionPack['attachmentSources'],
    connectionClinicalPoints: Object.fromEntries(packs.flatMap(pack => Object.entries(pack.connectionClinicalPoints).map(([id, point]) => [globalId(pack, id), point]))),
    labelTier: Object.fromEntries(structures.map(structure => { const owner = owners.get(structure.id)!; return [structure.id, owner.pack.labelTier[owner.local]]; })),
    structureCounts: { total: structures.length, byTissue: Object.fromEntries(tissueKeys.map(tissue => [tissue, structures.filter(structure => structure.tissue === tissue).length])) },
    cameraPreset, viewPresets: base.viewPresets.map(view => ({ ...view, preset: aspect => cameraPreset(view.id, aspect) })),
    scene: { ...base.scene, initialCamera: cameraPreset(base.defaultView, 1).position, keyTarget: target.clone(), fillTarget: target.clone(), floorPosition: new THREE.Vector3(0, -20, 0) },
    about: { ...base.about, title, overview, overviewHtml: `<p>${overview}</p><p class="stats">${structures.filter(s=>s.tissue!=="skin").length} browsable structures across ${packs.length} regions</p>${packs.map(pack => `<section><h3>${pack.title}</h3>${pack.about.overviewHtml}</section>`).join('')}` },
  });
}
