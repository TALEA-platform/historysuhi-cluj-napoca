import fs from "node:fs/promises";

// Cluj-Napoca's source UTR coverage has 17 disjoint regions (cadastral gaps),
// which previously produced a MultiPolygon city outline with raster holes.
// We replace that with the convex hull of every UTR/cartier vertex, which is
// guaranteed to be a single closed polygon that fully encloses the city —
// good enough for raster clipping and for the visible boundary outline.

const INPUT = "data/webapp_vectors/districts_enriched_2025.geojson";
const OUTPUT = "data/webapp_vectors/cluj_napoca_boundary_outline.geojson";

// Andrew's monotone chain convex hull. Input: array of [x, y]. Output: a
// counter-clockwise closed ring (first point repeated at the end).
function convexHull(points) {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  const hull = lower.concat(upper);
  hull.push([hull[0][0], hull[0][1]]); // close the ring
  return hull;
}

const geojson = JSON.parse(await fs.readFile(INPUT, "utf8"));

const vertices = [];
const collect = (node) => {
  if (!node) return;
  if (typeof node[0] === "number" && typeof node[1] === "number") {
    vertices.push([node[0], node[1]]);
    return;
  }
  for (const child of node) collect(child);
};
for (const feature of geojson.features) collect(feature.geometry?.coordinates);

console.log(`Collected ${vertices.length} vertices from ${geojson.features.length} features.`);
const hull = convexHull(vertices);
console.log(`Convex hull: ${hull.length - 1} vertices.`);

const output = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Cluj-Napoca boundary (convex hull)" },
      geometry: { type: "Polygon", coordinates: [hull] },
    },
  ],
};

await fs.writeFile(OUTPUT, JSON.stringify(output), "utf8");
console.log(`Written → ${OUTPUT} (${(JSON.stringify(output).length / 1024).toFixed(1)} KB)`);
