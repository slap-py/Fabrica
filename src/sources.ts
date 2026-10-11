/**
 * Single source of truth for third-party sources, licenses and attribution.
 * The Sources & credits page, the site footer and the About text draw from here.
 * Region-specific adaptation notes stay in each region's credits.ts.
 */

export type SourceRecord = {
  name: string;
  credit?: string;
  license: string;
  licenseUrl: string;
  url?: string;
};

export const sourceRecords: readonly SourceRecord[] = [
  {
    name: "Z-Anatomy — The libre 3D atlas of anatomy",
    credit: "Design, 3D and anatomy: Gauthier Kervyn",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    url: "https://github.com/Z-Anatomy/Models-of-human-anatomy",
  },
  {
    name: "BodyParts3D — The Database Center for Life Science",
    credit: "Original model: Kousaku Okubo",
    license: "CC BY-SA 2.1 Japan",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.1/jp/",
    url: "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html",
  },
  {
    name: "three-mesh-bvh",
    credit: "Garrett Johnson",
    license: "MIT",
    licenseUrl: "https://github.com/gkjohnson/three-mesh-bvh/blob/master/LICENSE",
    url: "https://github.com/gkjohnson/three-mesh-bvh",
  },
  {
    name: "Three.js",
    license: "MIT",
    licenseUrl: "https://github.com/mrdoob/three.js/blob/dev/LICENSE",
    url: "https://github.com/mrdoob/three.js",
  },
  {
    name: "camera-controls",
    license: "MIT",
    licenseUrl: "https://github.com/yomotsu/camera-controls/blob/main/LICENSE",
    url: "https://github.com/yomotsu/camera-controls",
  },
  {
    name: "Inter",
    license: "SIL Open Font License",
    licenseUrl: "https://openfontlicense.org/",
    url: "https://rsms.me/inter/",
  },
];

/** Attribution that must appear wherever adapted Z-Anatomy or BodyParts3D models are shown. */
export const attribution = "Z-Anatomy — The libre 3D atlas of anatomy, Gauthier Kervyn, CC BY-SA 4.0. BodyParts3D — The Database Center for Life Science, original model Kousaku Okubo, CC BY-SA 2.1 Japan.";

export const footerAttribution = "Models adapted from Z-Anatomy and BodyParts3D.";
