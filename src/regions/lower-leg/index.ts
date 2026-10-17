import { regionDefaults } from "../defaults";
import { prepareSoftTissues } from "../../softTissuePreparation";
import neurovascularCatalog from "../../neurovascularCatalog.json";
import { structures, byId, tissueNames, colors, type Tissue } from "../../data";
import { atlasTabs as sourceAtlasTabs, atlasIds } from "../../atlas";
import { directions, createCompass } from "../../compass";
import { cameraViews, cameraPreset, legacyPointToMm, anatomicalDirections, legacyToAnatomicalMatrix, coordinateConvention, LEGACY_UNIT_MM } from "../../coordinates";
import { labelTier, tierForZoom } from "../../labels";
import { createAnkle } from "../../ankle";
import { rebuildSoftTissues } from "../../softTissues";
import { loadBoneAssets, loadMuscleAssets, loadExteriorAssets, loadNeurovascularAssets, createAssetSceneLoader, neurovascularTissues, isNeurovascular } from "../../assets";
import { attachmentRecords, attachmentsFor, attachmentSources, type AttachmentRecord, type Footprint, type GuidePoint } from "../../attachments";
import { connectionsFor, directlyAttachedIds, connectionHighlightIds, footprintDecal, connectionCameraPose, connectionOccluders, connectionClinicalPoints, type Connection } from "../../connections";
import { relatedIds, footStructures, footLinks, buildFoot, rays } from "../../foot";
import { validateRegionPack, type RegionArea, type RegionPack } from "../index";

export type { AttachmentRecord, Footprint, GuidePoint, Connection, RegionPack };
export { structures, byId, tissueNames, colors, sourceAtlasTabs as atlasTabs, atlasIds };
export { directions, createCompass, cameraViews, cameraPreset, legacyPointToMm, anatomicalDirections, legacyToAnatomicalMatrix, coordinateConvention, LEGACY_UNIT_MM, labelTier, tierForZoom };
export { createAnkle, rebuildSoftTissues };
export { attachmentRecords, attachmentsFor, attachmentSources };
export { connectionsFor, directlyAttachedIds, connectionHighlightIds, footprintDecal, connectionCameraPose, connectionOccluders, connectionClinicalPoints };
export { relatedIds, footStructures, footLinks, buildFoot, rays };
export { loadBoneAssets, loadMuscleAssets, loadExteriorAssets, loadNeurovascularAssets, createAssetSceneLoader };

export const atlasAreas: readonly RegionArea[] = sourceAtlasTabs.map(([id, label], index) => ({ id, label: id === "all" ? "All areas" : label, group: index < 4 ? "" : "Toes" }));
const viewLabels: Record<string, string> = { foot: "Overview", dorsal: "Dorsal", plantar: "Plantar", medial: "Medial", lateral: "Lateral", anterior: "Anterior", posterior: "Posterior" };
const viewDirections: Record<string, string> = { foot: "anterior", dorsal: "dorsal", plantar: "plantar", medial: "medial", lateral: "lateral", anterior: "anterior", posterior: "posterior" };
export const viewPresets = ["foot", "dorsal", "plantar", "medial", "lateral"].map(id => ({ id, label: viewLabels[id], direction: viewDirections[id], preset: (aspect: number) => cameraPreset(id, aspect) }));
const base = import.meta.env.BASE_URL;
export const assetUrls = { bones: `${base}models/bones.glb`, muscles: `${base}models/muscles.glb`, exterior: `${base}models/exterior.glb`, neurovascular: `${base}models/neurovascular.glb` } as const;
export const assets = assetUrls;
const neurovascularSources = Object.fromEntries(neurovascularCatalog.map(record => [record.id, record.sourceObject]));
// Frozen superior crop from public/models/neurovascular.manifest.json, in this pack's local frame.
const neurovascularCropYMaxMm = 365.34449458122253;
export const tissueKeys = regionDefaults.tissueKeys;
export const atlasOrder = regionDefaults.atlasOrder;
export const atlasNames = regionDefaults.atlasNames;
export const presets = regionDefaults.presets;
export const about = {
  title: "Right Lower Leg & Foot",
  overview: "Explore the right lower leg and foot with selectable Z-Anatomy bones, muscle bellies, arteries, veins and nerves. Zoom to reveal more labels, filter the grouped structure list by tissue or area, and resize or expand the details panel for a closer look at muscle anatomy and attachments.",
  controls: regionDefaults.about.controls,
  overviewHtml: `<p>Explore the right lower leg and foot with selectable Z-Anatomy bones, muscle bellies, arteries, veins and nerves. Zoom to reveal more labels, filter the grouped structure list by tissue or area, and resize or expand the details panel for a closer look at muscle anatomy and attachments.</p><p class="stats">${structures.filter(s=>s.tissue==='bone').length} bones · ${structures.filter(s=>s.tissue==='muscle').length} muscles · ${structures.filter(s=>s.tissue==='tendon'||s.tissue==='ligament').length} tendons &amp; ligaments · ${structures.filter(s=>s.tissue!=="skin").length} structures</p><p>This is a simplified study model, not a clinical reference. Attachment footprint extents are illustrative surface fits. The model is static and makes no biomechanical predictions. Bursae and tendon sheaths are omitted; some ligament bundles are grouped.</p>`,
  controlsHtml: regionDefaults.about.controlsHtml,
} as const;
const byTissue = Object.fromEntries(tissueKeys.map(tissue => [tissue, structures.filter(structure => structure.tissue === tissue).length]));
export const defaultView = "foot" as const;
export const defaultMode = "anatomy" as const;
export const structureCounts = { total: structures.length, byTissue } as const;
export const loaders = { loadBoneAssets, loadMuscleAssets, loadExteriorAssets, loadNeurovascularAssets, createAssetSceneLoader };
export const scene = {
  initialCamera: legacyPointToMm(0.25, 6.1, 23),
  keyPosition: legacyPointToMm(-4, 12, 7), keyTarget: legacyPointToMm(0, 0, 0),
  fillPosition: legacyPointToMm(5, 6, -4), fillTarget: legacyPointToMm(0, 0, 0),
  floorPosition: legacyPointToMm(0, 0.06, 0),
};
export const lowerLegPack: RegionPack = validateRegionPack({ id: "lower-leg", title: "Right Lower Leg & Foot", description: "An interactive study model of the right lower leg and foot.", thumbnail: `${base}regions/lower-leg.png`, structures, byId, neurovascularSources, neurovascularCropYMaxMm, tissueNames, colors, atlasTabs: atlasAreas, atlasAreas, atlasIds, directions, cameraViews, cameraPreset, viewPresets, labelTier, tierForZoom, presets, assets: assetUrls, assetUrls, about, structureCounts, scene, createCompass, createAnkle, rebuildSoftTissues, rebuildSoftTissuesAsync: (parts, signal) => prepareSoftTissues("lower-leg", parts, signal, () => rebuildSoftTissues(parts)), attachmentSources, connectionsFor, directlyAttachedIds, connectionHighlightIds, footprintDecal, connectionCameraPose, connectionOccluders, connectionClinicalPoints, relatedIds, legacyPointToMm, neurovascularTissues, isNeurovascular, defaultView, defaultMode, tissueKeys, atlasOrder, atlasNames, loaders });
export default lowerLegPack;
