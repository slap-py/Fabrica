import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource-variable/manrope";
import "./style.css";
import "./introduction.css";
import { introductionPage, bindIntroductionPreview } from "./introduction";
import { regionCatalog } from "./regions/catalog";
import { validateRegionPack } from "./regions";
import { parseRoute, LAST_REGION_KEY } from "./router";
import "./viewerDiagnostics";
import { loadingScreen } from "./loading";
import { combinedTitleForIds } from "./regions/combinedTitle";
import { renderBodyMap, bindBodyMap } from "./bodyMap";
import { bindSkipLink, siteFooter, siteHeader, skipLink } from "./siteChrome";
import { adaptedModels, generatedNote, libraries, upstreamSources } from "./sources";
import { howToUseBody } from "./howToUse";
import { phoneScreenNotice, phoneScreenQuery } from "./phoneScreen";

const app = document.querySelector<HTMLElement>("#app")!;
const regionIds = regionCatalog.map(region => region.id);
const phoneScreen = matchMedia(phoneScreenQuery);
let routeRevision = 0;
let previousPage = "#/";
let currentPage = location.hash || "#/";
let mounted: ReturnType<typeof import("./main").mountViewer> | undefined;
let mountedRegion: string | undefined;

function renderHub(error?: string) {
  document.title = "Browser · Fabrica";
  document.body.dataset.page = "hub";
  app.innerHTML = `<div id="hub">${skipLink("hub-main")}
    ${siteHeader("browser")}
    <main id="hub-main" class="hub-main hub-body-main"><div class="hub-intro"><h1>Explore by region</h1><p>Select Right Arm and Back individually or together, or choose neighboring leg sections. Press Go to explore in 3D.</p></div>
    ${error ? '<p class="hub-error" role="alert">The viewer could not start. Please try opening the region again.</p>' : ""}
    ${renderBodyMap()}
    </main>
    ${siteFooter}
  </div>`;
  bindSkipLink(app);
  bindBodyMap(app.querySelector<HTMLElement>(".body-map")!);
}

const backLabels: Record<string, string> = { landing: "Home", "how-it-works": "How it works", hub: "Browser" };

function creditsSections() {
  const sources = `<section class="credits-section" aria-labelledby="credits-sources"><h2 id="credits-sources">Original sources</h2>
    <ul class="credit-list">${upstreamSources.map(source => `<li><a class="credit-name" href="${source.url}">${source.name}</a><span>${source.author}</span><a href="${source.licenseUrl}">${source.license}</a></li>`).join("")}</ul></section>`;
  const models = `<section class="credits-section" aria-labelledby="credits-models"><h2 id="credits-models">Adapted models</h2>
    <p class="credits-note">The changes to each original model are listed below.</p>
    ${adaptedModels.map(model => `<article class="credit-model" id="model-${model.id}"><h3>${model.name}</h3><p class="credit-from">From ${model.from.join(" and ")}</p><ul>${model.changes.map(change => `<li>${change}</li>`).join("")}</ul></article>`).join("")}</section>`;
  const generated = `<section class="credits-section" aria-labelledby="credits-generated"><h2 id="credits-generated">Generated</h2><p>${generatedNote}</p></section>`;
  const software = `<section class="credits-section" aria-labelledby="credits-software"><h2 id="credits-software">Software and fonts</h2><ul class="credit-list credit-list--compact">${libraries.map(lib => `<li><span>${lib.name}</span><span>${lib.license}</span></li>`).join("")}</ul></section>`;
  const records = `<p class="credits-records"><a href="${import.meta.env.BASE_URL}models/CREDITS.md">Full model records and manifests</a></p>`;
  return sources + models + generated + software + records;
}

function renderCredits() {
  document.title = "Sources & credits · Fabrica";
  document.body.dataset.page = "hub";
  const back = parseRoute(previousPage, regionIds).kind;
  app.innerHTML = `<div id="hub">${skipLink("hub-main")}${siteHeader()}
    <main id="hub-main" class="hub-main credits-main"><a class="credits-back" href="${previousPage}">← Back to ${backLabels[back] ?? "Viewer"}</a><h1>Sources &amp; credits</h1>
      <p class="credits-lede">Fabrica's models are adapted from two open anatomy datasets. Their creators are credited here, along with what was changed in each model.</p>
      ${creditsSections()}
    </main>${siteFooter}
  </div>`;
  bindSkipLink(app);
}

function renderHowToUse() {
  document.title = "How to use · Fabrica";
  document.body.dataset.page = "hub";
  app.innerHTML = `<div id="hub">${skipLink("hub-main")}${siteHeader()}
    <main id="hub-main" class="hub-main guide-main">${howToUseBody()}</main>
    ${siteFooter}
  </div>`;
  bindSkipLink(app);
}

async function route() {
  const revision = ++routeRevision;
  const next = parseRoute(location.hash, regionIds);
  if (location.hash !== currentPage) {
    if (next.kind === "credits") previousPage = currentPage;
    currentPage = location.hash;
  }
  // Gate tool routes before importing region packs or creating a viewer.
  if (phoneScreen.matches && (next.kind === "hub" || next.kind === "region" || next.kind === "regions")) {
    mounted?.dispose(); mounted = undefined; mountedRegion = undefined;
    document.title = "Larger screen needed · Fabrica";
    document.body.dataset.page = "phone-screen";
    app.innerHTML = phoneScreenNotice();
    window.scrollTo(0, 0);
    return;
  }
  const selectedRegionIds = next.kind === 'region' ? [next.regionId] : next.kind === 'regions' ? next.regionIds : [];
  const regionKey = selectedRegionIds.join('+');
  if ((next.kind === "region" || next.kind === "regions") && mounted && mountedRegion === regionKey) {
    mounted.select(next.select);
    return;
  }
  const session = selectedRegionIds.length ? mounted?.captureSession() : undefined;
  mounted?.dispose(); mounted = undefined; mountedRegion = undefined;
  if (next.kind === "landing" || next.kind === "how-it-works") {
    document.title = next.kind === "landing" ? "Home · Fabrica" : "How it works · Fabrica";
    document.body.dataset.page = "introduction";
    app.innerHTML = introductionPage(next.kind === "how-it-works");
    bindIntroductionPreview(app);
    window.scrollTo(0, 0);
    return;
  }
  if (next.kind === "hub") { renderHub(); window.scrollTo(0, 0); return; }
  if (next.kind === "credits") { renderCredits(); window.scrollTo(0, 0); return; }
  if (next.kind === "how-to-use") { renderHowToUse(); window.scrollTo(0, 0); return; }
  const entries = selectedRegionIds.map(id => regionCatalog.find(region => region.id === id)!);
  const title = entries.length > 1 ? combinedTitleForIds(selectedRegionIds) : entries[0].title;
  document.title = `${title} · Fabrica`;
  document.body.dataset.page = "viewer";
  app.innerHTML = loadingScreen(title);
  try {
    const [packs, viewer, combine] = await Promise.all([
      Promise.all(entries.map(entry => entry.load())), import("./main"),
      entries.length > 1 ? import("./regions/combine") : Promise.resolve(null),
    ]);
    const pack = combine ? combine.combineRegionPacks(packs) : packs[0];
    if (revision !== routeRevision) return;
    validateRegionPack(pack);
    document.title = `${pack.title} · Fabrica`;
    mounted = viewer.mountViewer(pack, app, next.select, session);
    mountedRegion = regionKey;
    try { localStorage.setItem(LAST_REGION_KEY, selectedRegionIds.length === 1 ? selectedRegionIds[0] : JSON.stringify(selectedRegionIds)); } catch {}
  } catch (error) {
    if (revision !== routeRevision) return;
    console.error(error);
    renderHub(String(error));
  }
}

app.addEventListener("click", event => { if ((event.target as Element).closest("[data-home]")) location.hash = "#/browser"; });
// The viewer is a tool surface: suppress the browser menu everywhere on it (text fields keep theirs).
document.addEventListener("contextmenu", event => {
  if (document.body.dataset.page === "viewer" && !(event.target as Element).closest("input, textarea")) event.preventDefault();
});
window.addEventListener("hashchange", () => { void route(); });
phoneScreen.addEventListener("change", () => { void route(); });
if (!location.hash) history.replaceState(null, "", `${location.pathname}${location.search}#/`);
void route();
