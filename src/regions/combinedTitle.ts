const sideOfId = (id: string) => id.startsWith('left-') ? 'left' : 'right';
const isUpperId = (id: string) => id.endsWith('upper-leg');

/** "Right Leg" for a side's upper and lower leg; otherwise a count, since mixed selections have no shared name. */
export function combinedTitleForIds(ids: readonly string[]) {
  const arms = ids.filter(id => id === "left-arm" || id === "right-arm");
  if (arms.length && ids.every(id => id === "back" || id === "left-arm" || id === "right-arm")) {
    const title = arms.length === 2 ? "Both Arms" : arms[0] === "left-arm" ? "Left Arm" : "Right Arm";
    return title + (ids.includes("back") ? " & Back" : "");
  }
  const sides = new Set(ids.map(sideOfId));
  if (sides.size === 1) {
    const side = sideOfId(ids[0]) === 'left' ? 'Left' : 'Right';
    if (ids.length === 2 && ids.some(isUpperId) && ids.some(id => id === "lower-leg" || id === "left-lower-leg")) return `${side} Leg`;
  }
  return `${ids.length} Body Regions`;
}
