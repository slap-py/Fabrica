/** Draft guide for the Browser and the 3D viewer. Content is static; the layout lives in style.css (.guide-*). */

const sections = [
  {
    id: "choose",
    title: "Choose a region",
    items: [
      "Open the Browser from the header. Click a region on the body map.",
      "Regions marked Available now open a 3D model. Regions marked Coming soon cannot be opened yet.",
      "To combine regions, add touching regions on the same side, up to three at once, then press Go.",
    ],
  },
  {
    id: "move",
    title: "Move around the model",
    items: [
      "Drag to orbit. Right-drag or Shift-drag to pan. Scroll or pinch to zoom.",
      "The view buttons jump to fixed angles. Number keys 1–5 do the same.",
      "R resets the model, layers and filters. Esc clears the selection.",
    ],
  },
  {
    id: "layers",
    title: "Show and hide layers",
    items: [
      "Use the switches under Layers to show or hide bones, muscles, tendons, ligaments, fascia, cartilage, arteries, veins and nerves.",
      "Lower the Muscle slider to see through the muscles. Choose Skeleton for a bone-only view.",
      "Section planes cut the model along a sagittal, coronal or transverse plane.",
      "L toggles labels.",
    ],
  },
  {
    id: "select",
    title: "Find and select structures",
    items: [
      "Search the structure list, or click a structure in the 3D model.",
      "The details panel shows the structure's name, description, available facts and references.",
      "Shift-click to add structures to a selection.",
      "F brings the selection into focus.",
    ],
  },
  {
    id: "connections",
    title: "See how structures connect",
    items: [
      "Turn on Highlight connections to show a selection's modeled connections.",
      "Neighbors shows adjacent and attached structures.",
      "Where attachment cards are available, select one to zoom to its footprint. Select it again to return.",
    ],
  },
] as const;

const keys = [
  ["1–5", "Jump to a fixed view"],
  ["F", "Focus the selection"],
  ["L", "Toggle labels"],
  ["R", "Reset the model, layers and filters"],
  ["P", "Toggle pan mode"],
  ["Esc", "Clear the selection"],
] as const;

export function howToUseBody() {
  return `
    <h1>How to use</h1>
    <p class="guide-lede">A short guide to the Browser and the 3D viewer.</p>
    ${sections.map(section => `<section class="guide-section" aria-labelledby="guide-${section.id}"><h2 id="guide-${section.id}">${section.title}</h2><ul>${section.items.map(item => `<li>${item}</li>`).join("")}</ul></section>`).join("")}
    <section class="guide-section" aria-labelledby="guide-keys"><h2 id="guide-keys">Keyboard shortcuts</h2>
      <dl class="guide-keys">${keys.map(([key, action]) => `<div><dt><kbd>${key}</kbd></dt><dd>${action}</dd></div>`).join("")}</dl>
    </section>
    <p class="guide-note">Fabrica uses static, simplified study models. Available facts and attachments vary by structure. See <a href="#/credits">Sources &amp; credits</a> for where the models come from.</p>
  `;
}
