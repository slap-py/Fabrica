import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
const createGltfLoader = () => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
import { structures, colors, byId, type Structure, type Tissue } from "./data";
import { enableMeshPicking, type BvhBuilder } from "./picking";
import type { createAnkle } from "./ankle";
import { disposeObject } from "./viewerResources";
import { readAssetBytes } from "./assetLoading";
import { createSkinMaterial } from "./skinMaterial";

type Parts = ReturnType<typeof createAnkle>["parts"];
type StructureLookup = Readonly<Record<string, Structure>>;
export interface RegionAssetGroups {
  bones: string[];
  muscles: string[];
  exterior: string[];
  neurovascular: string[];
}
export const boneIds = structures.filter(s => s.tissue === "bone").map(s => s.id);
export const muscleIds = structures.filter(s => s.tissue === "muscle").map(s => s.id);
export interface AssetReport {
  loaded: string[];
  fallback: string[];
  warnings: string[];
}

function disposeMeshes(meshes: THREE.Mesh[]) {
  const textures = new Set<THREE.Texture>();
  for (const mesh of meshes) {
    mesh.geometry.dispose();
    mesh.customDepthMaterial?.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
  }
  textures.forEach(texture => texture.dispose());
}

interface StagedAssets {
  report: AssetReport;
  staged: Map<string, THREE.Mesh[]>;
  invalid: Set<string>;
  sourceMeshes: THREE.Mesh[];
}

/** Consume a meter-scale GLTF scene. Keep each existing part/group/anchor identity. */
function installAssets(scene: THREE.Object3D, parts: Parts, ids: string[], tissue: Tissue, lookup: StructureLookup = byId, skinSource = "structure-envelope"): AssetReport {
  return commitAssets(stageAssets(scene, parts, ids, tissue, true, lookup, skinSource), parts, ids);
}

/** As installAssets, but picking BVHs are built by `bvh` before any mesh joins the scene. */
async function installAssetsAsync(scene: THREE.Object3D, parts: Parts, ids: string[], tissue: Tissue, bvh: BvhBuilder | undefined, lookup: StructureLookup = byId, skinSource = "structure-envelope"): Promise<AssetReport> {
  const assets = stageAssets(scene, parts, ids, tissue, false, lookup, skinSource);
  try {
    // Skin also occludes label rays: accelerate it before it joins the scene.
    const meshes = [...assets.staged.values()].flat();
    if (bvh) await bvh(meshes);
    else meshes.forEach(enableMeshPicking);
    await Promise.all(meshes.flatMap(mesh => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material => material.userData.skinTextureReady)));
    return commitAssets(assets, parts, ids);
  } catch (error) {
    disposeMeshes([...assets.staged.values()].flat());
    disposeObject(scene);
    throw error;
  }
}

function finiteValues(values: ArrayLike<number>): boolean {
  for (let i = 0; i < values.length; i++) if (!Number.isFinite(values[i])) return false;
  return true;
}
function validIndices(values: ArrayLike<number>, vertexCount: number): boolean {
  for (let i = 0; i < values.length; i++) if (!Number.isInteger(values[i]) || values[i] < 0 || values[i] >= vertexCount) return false;
  return true;
}

function stageAssets(scene: THREE.Object3D, parts: Parts, ids: string[], tissue: Tissue, pick: boolean, lookup: StructureLookup = byId, skinSource = "structure-envelope"): StagedAssets {
  const report: AssetReport = { loaded: [], fallback: [], warnings: [] };
  const staged = new Map<string, THREE.Mesh[]>();
  const invalid = new Set<string>();
  const sourceMeshes: THREE.Mesh[] = [];
  const allowed = new Set(ids);
  // A consumed scene gives exclusive buffers directly to the installed mesh.
  // Shared/interleaved source buffers stay on the copy path to avoid changing
  // another mesh's coordinates when baking a hierarchy or reflection.
  const uses = new Map<THREE.BufferGeometry, number>();
  const buffers = new Map<ArrayBufferLike, THREE.BufferGeometry>();
  const shared = new Set<THREE.BufferGeometry>();
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry;
    uses.set(geometry, (uses.get(geometry) ?? 0) + 1);
    for (const attribute of [...Object.values(geometry.attributes), geometry.index]) {
      if (!attribute) continue;
      if (attribute instanceof THREE.InterleavedBufferAttribute) { shared.add(geometry); continue; }
      const buffer = attribute.array.buffer;
      const previous = buffers.get(buffer);
      if (previous && previous !== geometry) { shared.add(previous); shared.add(geometry); }
      buffers.set(buffer, geometry);
    }
  });
  scene.updateMatrixWorld(true);
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    sourceMeshes.push(object);
    // Preserve reference-only source patches in the GLB for provenance, but never install or pick them.
    if (object.userData.sourceReference === true) return;
    let id: unknown = object.userData.atlasId;
    for (let parent = object.parent; !id && parent; parent = parent.parent)
      id = parent.userData.atlasId;
    id ??= object.name;
    const structure = typeof id === "string" ? lookup[id] : undefined;
    if (typeof id !== "string" || !structure || !allowed.has(id) || !parts.has(id)) {
      report.warnings.push(`Ignored unmatched mesh: ${object.name}`);
      return;
    }
    let geometry!: THREE.BufferGeometry;
    let mesh: THREE.Mesh | undefined;
    try {
      if (object instanceof THREE.SkinnedMesh || object instanceof THREE.InstancedMesh)
        throw new Error("Expected a static anatomical mesh");
      if (uses.get(object.geometry) === 1 && !shared.has(object.geometry)) {
        geometry = object.geometry;
        object.geometry = new THREE.BufferGeometry();
      } else geometry = object.geometry.clone();
      // glTF is meters. Bake hierarchy and unit conversion once, before bounds/BVH.
      const matrix = new THREE.Matrix4().makeScale(1000, 1000, 1000).multiply(object.matrixWorld);
      geometry.boundsTree = undefined;
      geometry.applyMatrix4(matrix);
      const positions = geometry.getAttribute("position");
      if (!positions || positions.count < 3 || !finiteValues(positions.array))
        throw new Error("Missing or non-finite vertices");
      const index = geometry.getIndex();
      const count = index?.count ?? positions.count;
      if (count < 3 || count % 3 || (index && !validIndices(index.array, positions.count)))
        throw new Error("Invalid triangle indices");
      if (matrix.determinant() < 0) {
        if (!index) {
          const indices = positions.count > 65535 ? new Uint32Array(positions.count) : new Uint16Array(positions.count);
          for (let i = 0; i < indices.length; i++) indices[i] = i;
          geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        }
        const winding = geometry.index!;
        for (let i = 0; i < winding.count; i += 3) {
          const second = winding.getX(i + 1);
          winding.setX(i + 1, winding.getX(i + 2)); winding.setX(i + 2, second);
        }
      }
      geometry.clearGroups();
      const actualTissue = structure.tissue;
      // Preserve authored skin normals; cap normals are intentionally flat.
      const skinSurface = actualTissue === "skin";
      if (!skinSurface && !geometry.getAttribute("normal")) geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      if (!geometry.boundingSphere || geometry.boundingSphere.radius <= 0)
        throw new Error("Empty anatomical surface");
      const skinCap = skinSurface && (object.userData.skinCap === true || object.name.startsWith("skin-cap-"));
      const capEnd = skinCap && (object.userData.capEnd === "seam" || object.userData.capEnd === "proximal") ? object.userData.capEnd : undefined;
      const authoredSource = skinSurface && typeof object.userData.source === "string" ? object.userData.source : undefined;
      mesh = new THREE.Mesh(geometry, skinSurface ? createSkinMaterial(geometry, skinCap) : new THREE.MeshStandardMaterial({
        color: colors[actualTissue], roughness: actualTissue === "cartilage" ? 0.36 : actualTissue === "bone" ? 0.76 : 0.68,
        side: actualTissue === "fascia" ? THREE.DoubleSide : THREE.FrontSide,
      }));
      mesh.name = id;
      mesh.userData = { id, atlasId: id, fiber: false, source: authoredSource ?? (skinSurface ? skinSource : "z-anatomy"), skinSurface, skinCap, capEnd };
      mesh.castShadow = true;
      if (skinSurface) mesh.renderOrder = 10;
      mesh.receiveShadow = true;
      if (pick) enableMeshPicking(mesh);
      const list = staged.get(id) ?? [];
      list.push(mesh);
      staged.set(id, list);
    } catch (error) {
      invalid.add(id);
      if (mesh) disposeMeshes([mesh]);
      else geometry?.dispose();
      report.warnings.push(`${id}: ${String(error)}`);
    }
  });
  return { report, staged, invalid, sourceMeshes };
}

function commitAssets({ report, staged, invalid, sourceMeshes }: StagedAssets, parts: Parts, ids: string[]): AssetReport {
  for (const id of ids) {
    const meshes = staged.get(id);
    const part = parts.get(id);
    if (!part || !meshes?.length || invalid.has(id)) {
      if (meshes) disposeMeshes(meshes);
      report.fallback.push(id);
      continue;
    }
    const previous = part.meshes.splice(0);
    for (const mesh of previous) part.group.remove(mesh);
    disposeMeshes(previous);
    part.meshes.push(...meshes);
    part.group.add(...meshes);
    // All vertices are already in the scene frame; visibility does not affect the anchor.
    const bounds = new THREE.Box3();
    for (const mesh of meshes) bounds.union(mesh.geometry.boundingBox!);
    bounds.getCenter(part.anchor);
    report.loaded.push(id);
  }
  disposeMeshes(sourceMeshes);
  return report;
}

/** Await texture readiness and build BVHs before committing imported anatomy. */
const install = (scene: THREE.Object3D, parts: Parts, ids: string[], tissue: Tissue, bvh?: BvhBuilder, lookup: StructureLookup = byId, skinSource = "structure-envelope") =>
  installAssetsAsync(scene, parts, ids, tissue, bvh, lookup, skinSource);
const exteriorIds = ['skin', 'gastrocnemius'];
const importedMuscleIds = muscleIds.filter(id => id !== "gastrocnemius");

/** Missing/corrupt assets leave the immediately available procedural model intact. */
export async function loadBoneAssets(
  parts: Parts,
  url = `${import.meta.env.BASE_URL}models/bones.glb`,
  loadScene: (url: string) => Promise<THREE.Object3D> = async path => (await createGltfLoader().loadAsync(path, e => onProgress?.(e.loaded,e.total))).scene,
  onProgress?: (loaded: number, total: number) => void,
  bvh?: BvhBuilder,
): Promise<AssetReport> {
  try {
    return await install(await loadScene(url), parts, boneIds, 'bone', bvh);
  } catch (error) {
    return { loaded: [], fallback: [...boneIds], warnings: [`Bone asset unavailable: ${String(error)}`] };
  }
}


export const installBoneAssets = (scene: THREE.Object3D, parts: Parts) => installAssets(scene, parts, boneIds, 'bone');
export const installMuscleAssets = (scene: THREE.Object3D, parts: Parts) => installAssets(scene, parts, importedMuscleIds, 'muscle');
export async function loadMuscleAssets(parts: Parts, url = `${import.meta.env.BASE_URL}models/muscles.glb`, loadScene: (url:string)=>Promise<THREE.Object3D> = async path => (await createGltfLoader().loadAsync(path, e => onProgress?.(e.loaded,e.total))).scene, onProgress?: (loaded:number,total:number)=>void, bvh?: BvhBuilder):Promise<AssetReport> {
  try { return await install(await loadScene(url), parts, importedMuscleIds, 'muscle', bvh); }
  catch(error) { return {loaded:[], fallback:[...importedMuscleIds], warnings:[`Muscle asset unavailable: ${String(error)}`]}; }
}

export async function loadExteriorAssets(parts: Parts, onProgress?: (loaded:number,total:number)=>void, bvh?: BvhBuilder, url = `${import.meta.env.BASE_URL}models/exterior.glb`, loadScene: (url: string) => Promise<THREE.Object3D> = async path => (await createGltfLoader().loadAsync(path, e => onProgress?.(e.loaded,e.total))).scene): Promise<AssetReport> {
  try { return await install(await loadScene(url), parts, exteriorIds, 'skin', bvh); }
  catch(error) { return {loaded:[],fallback:[...exteriorIds],warnings:[`Exterior asset unavailable: ${String(error)}`]}; }
}
export const installExteriorAssets = (scene: THREE.Object3D, parts: Parts) => installAssets(scene, parts, exteriorIds, 'skin');

/** Supplemental layers have no invented fallback geometry. Fetch only on demand. */
export const neurovascularTissues: Tissue[] = ['artery', 'vein', 'nerve'];
export const isNeurovascular = (tissue: Tissue) => neurovascularTissues.includes(tissue);
export const neurovascularIds = structures.filter(s => isNeurovascular(s.tissue)).map(s => s.id);
function markNeurovascular(report: AssetReport, parts: Parts, ids: readonly string[] = neurovascularIds): AssetReport {
  for (const id of ids) {
    const part = parts.get(id);
    if (!part) continue;
    part.group.userData.unavailable = !report.loaded.includes(id);
    if (part.group.userData.unavailable) part.group.visible = false;
    for (const mesh of part.meshes) mesh.userData.thinStructure = true;
  }
  return report;
}
export const installNeurovascularAssets = (scene: THREE.Object3D, parts: Parts) =>
  markNeurovascular(installAssets(scene, parts, neurovascularIds, 'artery'), parts);
export async function loadNeurovascularAssets(
  parts: Parts,
  url = `${import.meta.env.BASE_URL}models/neurovascular.glb`,
  loadScene: (url: string) => Promise<THREE.Object3D> = async path => (await createGltfLoader().loadAsync(path)).scene,
  bvh?: BvhBuilder,
): Promise<AssetReport> {
  try { return markNeurovascular(await install(await loadScene(url), parts, neurovascularIds, 'artery', bvh), parts); }
  catch (error) {
    for (const id of neurovascularIds) {
      const part = parts.get(id);
      if (part) { part.group.visible = false; part.group.userData.unavailable = true; }
    }
    return { loaded: [], fallback: [...neurovascularIds], warnings: [`Neurovascular assets unavailable: ${String(error)}`] };
  }
}


function emptyPartAssets(parts: Parts, ids: readonly string[], hide = true) {
  for (const id of new Set(ids)) {
    const part = parts.get(id);
    if (!part) continue;
    const previous = part.meshes.splice(0);
    for (const mesh of previous) part.group.remove(mesh);
    disposeMeshes(previous);
    part.group.userData.unavailable = true;
    if (hide) part.group.visible = false;
  }
}

function preparePartAssets(parts: Parts, ids: readonly string[]) {
  const visibility = new Map<string, boolean>();
  for (const id of new Set(ids)) {
    const part = parts.get(id);
    if (!part) continue;
    visibility.set(id, part.group.visible);
    const previous = part.meshes.splice(0);
    for (const mesh of previous) part.group.remove(mesh);
    disposeMeshes(previous);
    delete part.group.userData.unavailable;
  }
  return visibility;
}

async function loadRegionalGroup(
  parts: Parts, ids: readonly string[], tissue: Tissue, url: string,
  loadScene: (url: string) => Promise<THREE.Object3D>, onProgress: ((loaded: number, total: number) => void) | undefined,
  bvh: BvhBuilder | undefined, lookup: StructureLookup, label: string,
): Promise<AssetReport> {
  const groupIds = [...ids];
  if (!groupIds.length) return { loaded: [], fallback: [], warnings: [] };
  const visibility = preparePartAssets(parts, groupIds);
  try {
    const report = await install(await loadScene(url), parts, groupIds, tissue, bvh, lookup, "structure-envelope");
    for (const id of new Set(groupIds)) {
      const part = parts.get(id);
      if (!part) continue;
      const loaded = report.loaded.includes(id);
      part.group.userData.unavailable = !loaded;
      part.group.visible = loaded ? (visibility.get(id) ?? true) : false;
    }
    return report;
  } catch (error) {
    emptyPartAssets(parts, groupIds);
    return { loaded: [], fallback: groupIds, warnings: [`${label} asset unavailable: ${String(error)}`] };
  }
}

export interface RegionAssetLoaders {
  assetGroups?: RegionAssetGroups;
  loadBoneAssets: typeof loadBoneAssets;
  loadMuscleAssets: typeof loadMuscleAssets;
  loadExteriorAssets: typeof loadExteriorAssets;
  loadNeurovascularAssets: typeof loadNeurovascularAssets;
  createAssetSceneLoader: typeof createAssetSceneLoader;
}

/** Create asset loaders isolated to one region's structures and asset groups. */
export function createRegionAssetLoaders(regionStructures: readonly Structure[], assetGroups: RegionAssetGroups): RegionAssetLoaders {
  const lookup = Object.fromEntries(regionStructures.map(structure => [structure.id, structure])) as StructureLookup;
  const loadBone = async (parts: Parts, url = `${import.meta.env.BASE_URL}models/bones.glb`, loadScene: (url: string) => Promise<THREE.Object3D> = async path => (await createGltfLoader().loadAsync(path, e => onProgress?.(e.loaded, e.total))).scene, onProgress?: (loaded: number, total: number) => void, bvh?: BvhBuilder) =>
    loadRegionalGroup(parts, assetGroups.bones, "bone", url, loadScene, onProgress, bvh, lookup, "Bone");
  const loadMuscle = async (parts: Parts, url = `${import.meta.env.BASE_URL}models/muscles.glb`, loadScene: (url: string) => Promise<THREE.Object3D> = async path => (await createGltfLoader().loadAsync(path, e => onProgress?.(e.loaded, e.total))).scene, onProgress?: (loaded: number, total: number) => void, bvh?: BvhBuilder) =>
    loadRegionalGroup(parts, assetGroups.muscles, "muscle", url, loadScene, onProgress, bvh, lookup, "Muscle");
  const loadExterior = async (parts: Parts, onProgress?: (loaded: number, total: number) => void, bvh?: BvhBuilder, url = `${import.meta.env.BASE_URL}models/exterior.glb`, loadScene: (url: string) => Promise<THREE.Object3D> = async path => (await createGltfLoader().loadAsync(path, e => onProgress?.(e.loaded, e.total))).scene) =>
    loadRegionalGroup(parts, assetGroups.exterior, "skin", url, loadScene, onProgress, bvh, lookup, "Exterior");
  const loadNeurovascular = async (parts: Parts, url = `${import.meta.env.BASE_URL}models/neurovascular.glb`, loadScene: (url: string) => Promise<THREE.Object3D> = async path => (await createGltfLoader().loadAsync(path)).scene, bvh?: BvhBuilder) => {
    const report = await loadRegionalGroup(parts, assetGroups.neurovascular, "artery", url, loadScene, undefined, bvh, lookup, "Neurovascular");
    return markNeurovascular(report, parts, assetGroups.neurovascular);
  };
  return { assetGroups, loadBoneAssets: loadBone, loadMuscleAssets: loadMuscle, loadExteriorAssets: loadExterior, loadNeurovascularAssets: loadNeurovascular, createAssetSceneLoader };
}


/** Abortable fetch and parse for a mounted viewer. A late parse never installs into a disposed scene. */
export function createAssetSceneLoader(signal: AbortSignal, onProgress?: (loaded: number, total: number) => void) {
  return async (url: string): Promise<THREE.Object3D> => {
    signal.throwIfAborted();
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Asset fetch failed: ${response.status}`);
    const bytes = await readAssetBytes(response, signal, onProgress);
    signal.throwIfAborted();
    const gltf = await createGltfLoader().parseAsync(bytes, new URL('.', new URL(url, location.href)).href);
    if (signal.aborted) {
      gltf.scenes.forEach(disposeObject);
      signal.throwIfAborted();
    }
    return gltf.scene;
  };
}
