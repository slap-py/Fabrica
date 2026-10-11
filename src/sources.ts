/**
 * Single source of truth for credits: the upstream sources, the models adapted from them
 * (with the changes made, as the CC BY-SA licenses require), and the software used.
 * The Sources & credits page and the site footer draw from here.
 */
export type UpstreamSource = {
  name: string;
  author: string;
  license: string;
  licenseUrl: string;
  url: string;
};

export const upstreamSources: readonly UpstreamSource[] = [
  {
    name: "Z-Anatomy — The libre 3D atlas of anatomy",
    author: "Design, 3D and anatomy: Gauthier Kervyn",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    url: "https://github.com/Z-Anatomy/Models-of-human-anatomy",
  },
  {
    name: "BodyParts3D — The Database Center for Life Science",
    author: "Original model: Kousaku Okubo",
    license: "CC BY-SA 2.1 Japan",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.1/jp/",
    url: "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html",
  },
];

export type AdaptedModel = {
  id: string;
  name: string;
  /** Upstream sources this model is adapted from. */
  from: readonly string[];
  changes: readonly string[];
};

export const adaptedModels: readonly AdaptedModel[] = [
  {
    id: "arm-back",
    name: "Right arm and back",
    from: ["Z-Anatomy", "BodyParts3D"],
    changes: [
      "Separated source materials and capped the seams.",
      "Reduced triangle counts and tessellated curves, keeping source radii.",
      "Rotated into the viewer's anatomical orientation and exported at meter scale.",
    ],
  },
  {
    id: "upper-leg",
    name: "Left and right hip and upper leg",
    from: ["Z-Anatomy", "BodyParts3D"],
    changes: [
      "Cropped from the hip to the proximal lower leg.",
      "Separated tendon and cartilage materials.",
      "Subdivided and reduced surfaces, converted curves with source radii, and registered each femur.",
      "Exported as GLB. Exterior patches are the original body-region surfaces, shown double-sided.",
    ],
  },
  {
    id: "lower-leg",
    name: "Right lower leg and foot",
    from: ["Z-Anatomy", "BodyParts3D"],
    changes: [
      "Extracted the right-side objects and separated the sesamoids.",
      "Removed tendon-material faces, capped muscle bellies and repaired local topology.",
      "Subdivided and decimated surfaces, registered them to the bone frame, and exported as GLB.",
    ],
  },
  {
    id: "left-lower-leg",
    name: "Left lower leg and foot",
    from: ["Right lower leg and foot"],
    changes: [
      "Mirrored from the right-side lower leg and foot across the anatomical midline, with orientation and winding corrected.",
      "A study orientation only. It is not independently measured left-side anatomy.",
    ],
  },
  {
    id: "neurovascular",
    name: "Arteries, veins and nerves of the right lower leg and foot",
    from: ["Z-Anatomy", "BodyParts3D"],
    changes: [
      "Selected 49 source objects by name: 19 arteries, 14 veins and 16 nerves.",
      "Converted curves to tubes with source radii, cropped at the full-tibia boundary, and registered to the bone model.",
      "Exported as GLB.",
    ],
  },
  {
    id: "skin",
    name: "Skin envelope",
    from: ["Structures from the models above"],
    changes: [
      "Generated outer envelope fitted around the structures above, with a project-defined thickness.",
      "Not scanned skin and not extracted from Z-Anatomy. The upper-leg envelope stops at a groin-level cut.",
    ],
  },
];

/** Structures that are not in the sources. Stated so no one mistakes them for source anatomy. */
export const generatedNote =
  "Tendons, ligaments, fascia and cartilage are procedural surface fits, not source anatomy. Attachment footprints are illustrative and are not measured boundaries.";

export const libraries: readonly { name: string; license: string }[] = [
  { name: "Three.js", license: "MIT" },
  { name: "three-mesh-bvh by Garrett Johnson", license: "MIT" },
  { name: "camera-controls", license: "MIT" },
  { name: "Inter", license: "SIL Open Font License" },
  { name: "Manrope", license: "SIL Open Font License" },
];

export const footerAttribution = "Models adapted from Z-Anatomy and BodyParts3D.";
