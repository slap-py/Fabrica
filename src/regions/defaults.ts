import type { RegionPack } from './index';
import { colors, tissueNames, type Tissue } from '../data';
import { createCompass, directions } from '../compass';
import { legacyPointToMm } from '../coordinates';
import { tierForZoom } from '../labels';
import { isNeurovascular, neurovascularTissues } from '../assets';
import { attachmentSources } from '../attachments';
const tissueKeys: readonly Tissue[] = ['skin','bone','muscle','tendon','ligament','fascia','cartilage','artery','vein','nerve'];
const atlasOrder: readonly Tissue[] = ['bone','muscle','tendon','ligament','fascia','artery','vein','nerve','cartilage','skin'];
const presets = [
  { id: "exterior", icon: `<svg class="brand-mark" viewBox="0 0 20 20" aria-hidden="true"><path d="M12 2c3-1 5 1 4 4l-2 5c-1 2 0 4-2 6-2 2-6 1-6-2 0-2 2-4 3-6s0-6 3-7Z"/><path d="m9 9 5 2"/></svg>`, skinOpacity: 1, label: "Exterior", tissues: ["skin", "bone"] as Tissue[] },
  { id: "anatomy", label: "Anatomy", icon: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13C3 4 13 2 13 3c0 9-9 11-10 10ZM4 12l8-8"/></svg>`, opacity: 1, tissues: tissueKeys.filter(t => t !== "skin" && t !== "artery" && t !== "vein" && t !== "nerve") },
  { id: "skeleton", label: "Skeleton", icon: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2a2 2 0 0 0-3 3l3 1 5 5 1 3a2 2 0 0 0 3-3l-3-1-5-5Z"/></svg>`, tissues: ["bone", "cartilage"] as Tissue[] },
  { id: "neurovascular", label: "Neurovascular", opacity: 0.2, tissues: ["bone", "muscle", "artery", "vein", "nerve"] as Tissue[] },
] as const;

/** Viewer conventions shared by every region, independent of any complete pack. */
export const regionDefaults = {
 tissueKeys, atlasOrder, atlasNames: {...tissueNames,skin:'Skin',fascia:'Fascia & retinacula'},
 createCompass, directions, legacyPointToMm, tierForZoom, isNeurovascular, neurovascularTissues,
 attachmentSources, presets, defaultMode:'anatomy',
 about:{title:'',overview:'',overviewHtml:'',controls:[{ key: "Drag", description: "Orbit the model" }, { key: "Right-drag / Shift-drag", description: "Pan; P toggles pan mode" }, { key: "Scroll / pinch", description: "Zoom; closer views reveal more labels" }, { key: "1–5", description: "Overview, dorsal, plantar, medial, lateral" }, { key: "F", description: "Focus selection" }, { key: "L", description: "Toggle labels" }, { key: "R", description: "Reset model, layers and filters" }, { key: "Esc", description: "Restore surroundings and clear selection" }],controlsHtml:`<dl class="shortcuts"><dt>Drag</dt><dd>Orbit the model</dd><dt>Right-drag / Shift-drag</dt><dd>Pan; P toggles pan mode</dd><dt>Scroll / pinch</dt><dd>Zoom; closer views reveal more labels</dd><dt>1–5</dt><dd>Overview, dorsal, plantar, medial, lateral</dd><dt>F</dt><dd>Focus selection</dd><dt>L</dt><dd>Toggle labels</dd><dt>R</dt><dd>Reset model, layers and filters</dd><dt>Esc</dt><dd>Restore surroundings and clear selection</dd><dt>Canvas arrows</dt><dd>Pan when the canvas has focus</dd><dt>List ↑ / ↓ / Enter</dt><dd>Move between visible rows and select</dd><dt>Inspector edge</dt><dd>Drag to resize; focus it and use ← / → for 24px steps</dd><dt>Inspector ↔</dt><dd>Expand to 640px or restore your saved width</dd><dt>Attachment card</dt><dd>Zoom to its footprint; select again to return</dd></dl>`},
} satisfies Pick<RegionPack, 'tissueKeys'|'atlasOrder'|'atlasNames'|'createCompass'|'directions'|'legacyPointToMm'|'tierForZoom'|'isNeurovascular'|'neurovascularTissues'|'attachmentSources'|'presets'|'defaultMode'|'about'>;
