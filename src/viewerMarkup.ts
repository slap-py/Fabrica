import { version } from '../package.json';
import { loadingScreen } from './loading';
import { brandLockup } from './branding';
import { MIN_LABELS, MAX_LABELS } from './settings';
import type { RegionPack } from './regions';
const icon = {
  search: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>',
  pan: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5v13M1.5 8h13M6 3.5l2-2 2 2M6 12.5l2 2 2-2M3.5 6l-2 2 2 2M12.5 6l2 2-2 2"/></svg>',
  plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
  minus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10"/></svg>',
  home: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 7.5 8 3l5.5 4.5M4 6.5V13h8V6.5"/></svg>',
  close: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>',
};

export function viewerMarkup(pack: RegionPack): string {
const structures=pack.structures,presets=pack.presets;
const browsableStructures = structures.filter(d => d.tissue !== "skin");
const areaOptions = pack.atlasAreas.filter(area => !area.group).map(area => `<option value="${area.id}">${area.label}</option>`).join('') +
  [...new Set(pack.atlasAreas.map(area => area.group).filter(Boolean))].map(group => `<optgroup label="${group}">${pack.atlasAreas.filter(area => area.group === group).map(area => `<option value="${area.id}">${area.label}</option>`).join('')}</optgroup>`).join('');

return `
<header class="topbar">
  <div class="brand"><a class="viewer-home" href="#/" aria-label="Fabrica home" title="Home">${brandLockup}</a><span class="title" title="${pack.title}">${pack.title}</span></div>
  <div class="segmented modes" aria-label="Tissue presets">${presets.map(preset => `<button data-mode="${preset.id}" class="${preset.id === pack.defaultMode ? 'active' : ''}">${preset.icon ?? ''}${preset.label}</button>`).join('')}</div>
  <nav class="topbar-actions" aria-label="Explorer actions"><details class="actions-menu" open><summary aria-label="More actions" title="More actions">⋯</summary><div class="action-items"><button id="labels" class="tool-button" aria-pressed="true" title="Toggle labels (L)"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h9l3 5-3 5H2Z"/><circle cx="10" cy="8" r="1"/></svg>Labels</button><button id="reset" class="tool-button" title="Reset model, selection, layers and filters (R)" aria-label="Reset model"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6a5 5 0 1 1 0 5M3 2v4h4"/></svg></button><button id="about" class="tool-button" title="About ${pack.title}" aria-label="About"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 4.5v.2"/></svg></button></div></details></nav>
</header>
<main>
<aside class="panel atlas" aria-label="Structures">
  <div class="atlas-head">
    <label class="search">${icon.search}<input id="search" placeholder="Search ${browsableStructures.length} structures" aria-label="Find a structure" type="search"/></label>
    <div id="type-filters" class="type-filters" aria-label="Structure types"></div>
    <label class="area-filter" for="atlas-area">Area<select id="atlas-area">${areaOptions}</select></label>
    <label class="visible-filter"><input id="only-visible" type="checkbox"/>Only visible layers</label>
    <div class="filter-status"><span id="list-count"></span><button id="clear-filters" class="link-button" hidden>Clear filters</button></div>
  </div>
  <div id="structure-list" class="atlas-scroll" aria-label="Structure list"></div>
</aside>
<section id="viewport" aria-label="Interactive 3D anatomy model">
  <div id="label-layer"><svg class="label-leaders" aria-hidden="true"></svg></div>
  <div class="compass-wrap"><div id="compass" role="group" aria-label="Anatomical view compass"></div><span id="view-name">ANTERIOR VIEW</span></div>
  <div class="view-controls segmented" aria-label="Camera views">${pack.viewPresets.map(view => `<button data-view="${view.id}" class="${view.id === pack.defaultView ? 'active' : ''}">${view.label}</button>`).join('')}</div>
  <div class="canvas-tools"><button id="pan" aria-pressed="false" aria-label="Pan mode" title="Pan mode (P). Right-drag, Shift-drag or Alt-drag also pans.">${icon.pan}</button><button id="zoom-in" aria-label="Zoom in" title="Zoom in">${icon.plus}</button><button id="zoom-out" aria-label="Zoom out" title="Zoom out">${icon.minus}</button><button id="home" aria-label="Reset camera" title="Reset camera">${icon.home}</button></div>
  <div id="fps-meter" class="fps-meter" role="status" aria-label="Frames per second" hidden>-- FPS</div>
  <div id="render-error" hidden></div>
  <div id="graphics-prompt" class="graphics-prompt" role="status" hidden><p>The 3D view is running slowly on this device.</p><button data-graphics-prompt="low" class="tool-button active">Use Low graphics</button><button data-graphics-prompt="keep" class="tool-button">Keep High</button></div>
</section>
<div class="inspector-stack">
<aside class="panel inspector" aria-label="Structure details">
  <div class="inspector-resize" role="separator" aria-orientation="vertical" aria-label="Resize details panel" tabindex="0" aria-valuemin="280" aria-valuemax="680"></div>
  <button id="expand-inspector" class="icon-button" aria-pressed="false" title="Expand details panel" aria-label="Expand details panel">↔</button>
  <button id="clear" class="icon-button" aria-label="Clear selection" title="Clear selection">${icon.close}</button>
  <div id="details" class="details" aria-live="polite"></div>
</aside>
<aside class="panel layers-panel" aria-label="Layers">
  <section class="layer-section">
    <div class="section-heading"><h2>Layers</h2><button id="all-layers" class="link-button">Show all</button></div>
    <div id="layers"></div>
    <button id="highlight-connections" class="toggle-row" aria-pressed="false" aria-describedby="highlight-connections-hint"><span>Highlight connections</span><span class="switch" aria-hidden="true"></span></button>
    <p id="highlight-connections-hint" class="sr-only">Highlight attached tendons and bones with your selection. Hidden connections appear temporarily.</p>
    <div class="slider-row"><label for="opacity">Muscle</label><input id="opacity" type="range" min="10" max="100" value="100"/><output id="opacity-value">100%</output></div>
    <div class="slider-row"><label for="dim-opacity" title="How visible other structures stay while something is selected">Others</label><input id="dim-opacity" type="range" min="0" max="100" value="50"/><output id="dim-opacity-value">50%</output></div>
    <div class="slider-row"><label for="skin-opacity">Skin</label><input id="skin-opacity" type="range" min="0" max="100" value="100"/><output id="skin-opacity-value">100%</output></div>
    <div id="neurovascular-opacity-controls"><div class="slider-row"><label for="neurovascular-opacity">Vessels &amp; nerves</label><input id="neurovascular-opacity" type="range" min="10" max="100" value="100"/><output id="neurovascular-opacity-value">100%</output></div></div>
    <p id="neurovascular-status" role="status" hidden></p>
    <div class="section-control" role="group" aria-labelledby="section-heading">
      <p class="setting-title" id="section-heading">Section</p>
      <div class="segmented section-axis">${([["off","Off"],["sagittal","Sagittal"],["coronal","Coronal"],["transverse","Transverse"]] as const).map(([id, name]) => `<button data-section-axis="${id}" aria-pressed="${id === 'off'}" class="${id === 'off' ? 'active' : ''}">${name}</button>`).join('')}</div>
      <div id="section-options" hidden>
        <div class="slider-row"><label for="section-position">Position</label><input id="section-position" type="range" min="0" max="100" value="50"/><output id="section-position-value">50%</output></div>
        <button id="section-flip" class="toggle-row" aria-pressed="false"><span>Flip side</span><span class="switch" aria-hidden="true"></span></button>
      </div>
    </div>
  </section>
  <p id="layer-hint" class="layer-hint"></p>
</aside>
</div>
</main>
<dialog id="about-dialog" aria-labelledby="about-title"><button class="dialog-close icon-button" aria-label="Close model information">${icon.close}</button><h2 id="about-title">${pack.about.title}</h2>
<div class="about-tabs" role="tablist" aria-label="About sections">${[['overview','Overview'],['controls','Controls'],['settings','Settings']].map(([id,name])=>`<button id="about-tab-${id}" role="tab" data-about-tab="${id}" aria-controls="about-panel-${id}" aria-selected="${id==='overview'}" tabindex="${id==='overview'?0:-1}">${name}</button>`).join('')}</div>
<section id="about-panel-overview" role="tabpanel" data-about-panel="overview" aria-labelledby="about-tab-overview">${pack.about.overviewHtml}</section>
<section id="about-panel-controls" role="tabpanel" data-about-panel="controls" aria-labelledby="about-tab-controls" hidden>${pack.about.controlsHtml}</section>
<section id="about-panel-settings" class="settings-panel" role="tabpanel" data-about-panel="settings" aria-labelledby="about-tab-settings" hidden>
  <div class="setting-block"><p class="setting-title" id="graphics-heading">Graphics quality</p><div class="segmented graphics-control" role="group" aria-labelledby="graphics-heading"><button data-graphics-choice="auto">Auto</button><button data-graphics-choice="high">High</button><button data-graphics-choice="low">Low</button></div><p id="graphics-status" class="setting-note" aria-live="polite"></p></div>
  <div class="setting-block"><p class="setting-title" id="theme-heading">Theme</p><div class="segmented theme-control" role="group" aria-labelledby="theme-heading"><button data-theme-choice="system">System</button><button data-theme-choice="light">Light</button><button data-theme-choice="dark">Dim</button></div></div>
  <div class="setting-block"><button id="setting-labels-default" class="toggle-row" aria-pressed="false"><span>Labels on by default</span><span class="switch" aria-hidden="true"></span></button><p class="setting-note">Applies when a region opens or is reset. The Labels button still toggles them while you explore.</p></div>
  <div class="setting-block"><div class="slider-row"><label for="setting-max-labels">Max labels</label><input id="setting-max-labels" type="range" min="${MIN_LABELS}" max="${MAX_LABELS}" step="1"/><output id="setting-max-labels-value"></output></div><p class="setting-note">Most passive labels shown at once when zoomed in. Fewer appear when zoomed out. Selected and hovered structures are always labeled.</p></div>
  <div class="setting-block"><button id="setting-fps" class="toggle-row" aria-pressed="false"><span>Show FPS meter</span><span class="switch" aria-hidden="true"></span></button><p class="setting-version">Version ${version}</p></div>
</section>
</dialog>${loadingScreen(pack.title)}`;
}
