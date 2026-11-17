// Derived from districts_enriched_2025.geojson (same geometry as districts_enriched_2026.geojson) extent [23.499–23.718, 46.690–46.862]
// with ~15 % margin on each side.
export const CLUJ_NAPOCA_CITY_BOUNDS = [
  [23.466, 46.664],
  [23.751, 46.888],
];

export function expandBounds(bounds, { xMultiplier = 1, yMultiplier = xMultiplier } = {}) {
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const halfWidth = ((maxLng - minLng) * xMultiplier) / 2;
  const halfHeight = ((maxLat - minLat) * yMultiplier) / 2;

  return [
    [centerLng - halfWidth, centerLat - halfHeight],
    [centerLng + halfWidth, centerLat + halfHeight],
  ];
}

export const CLUJ_NAPOCA_MAX_PAN_BOUNDS = expandBounds(CLUJ_NAPOCA_CITY_BOUNDS, {
  xMultiplier: 4.5,
  yMultiplier: 3.75,
});
