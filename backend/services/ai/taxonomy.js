/**
 * backend/services/ai/taxonomy.js
 * Canonical Fabric Defect Taxonomy
 *
 * Verified against the trained YOLO11n model weights checkpoint (yolo-service/best.pt):
 *   Class ID 0: hole
 *   Class ID 1: oil spot
 *   Class ID 2: scratch
 *   Class ID 3: stain
 *   Class ID 4: thread error
 */

export const CANONICAL_DEFECT_CLASSES = [
  'hole',
  'oil spot',
  'scratch',
  'stain',
  'thread error',
];

export const DEFECT_DISPLAY_NAMES = {
  'hole': 'Hole',
  'oil spot': 'Oil Spot',
  'scratch': 'Scratch',
  'stain': 'Stain',
  'thread error': 'Thread Error',
};

/**
 * Mapping legacy names from prototypes and earlier datasets to canonical classes.
 */
export const LEGACY_TAXONOMY_MAP = {
  // Direct canonical mappings
  'hole': 'hole',
  'oil spot': 'oil spot',
  'scratch': 'scratch',
  'stain': 'stain',
  'thread error': 'thread error',

  // Formatting variants
  'oilspot': 'oil spot',
  'threaderror': 'thread error',
  'thread_error': 'thread error',
  'oil_spot': 'oil spot',

  // Legacy prototype taxonomy
  'holes': 'hole',
  'stains': 'stain',
  'scratches': 'scratch',
  'broken yarn': 'thread error',
  'slub knot': 'thread error',
  'weft tear': 'hole',
  'weft tears': 'hole',
  'tear': 'hole',
  'tears': 'hole',
  'contamination': 'oil spot',
  'knot': 'thread error',
};

/**
 * Normalizes a defect type into its canonical and display format.
 * Preserves the original model label if not recognized.
 */
export function normalizeDefectType(rawType) {
  if (!rawType || typeof rawType !== 'string') {
    return { canonical: 'unknown', display: 'Unknown Defect', raw: rawType };
  }
  const clean = rawType.trim().toLowerCase();
  const canonical = LEGACY_TAXONOMY_MAP[clean] || clean;
  const display = DEFECT_DISPLAY_NAMES[canonical] || rawType.trim();
  return { canonical, display, raw: rawType };
}

/**
 * Severity heuristic based on defect type and confidence.
 */
export function getDefectSeverity(canonicalType, confidence = 0.85) {
  const conf = confidence > 1 ? confidence : confidence * 100;
  if (canonicalType === 'hole') {
    return 'Critical'; // Structural breach is always critical
  }
  if (canonicalType === 'oil spot' || canonicalType === 'stain') {
    return conf > 90 ? 'Moderate' : 'Low';
  }
  if (canonicalType === 'thread error') {
    return conf > 92 ? 'Moderate' : 'Low';
  }
  if (canonicalType === 'scratch') {
    return 'Low';
  }
  return 'Moderate';
}

export default {
  CANONICAL_DEFECT_CLASSES,
  DEFECT_DISPLAY_NAMES,
  LEGACY_TAXONOMY_MAP,
  normalizeDefectType,
  getDefectSeverity,
};
