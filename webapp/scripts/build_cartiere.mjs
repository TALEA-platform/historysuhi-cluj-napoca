import fs from "node:fs/promises";
import proj4 from "proj4";

// Two-step build for the Cluj-Napoca cartier layer:
//   1) Classify each input polygon to its nearest OSM place=suburb centroid.
//   2) Dissolve every polygon assigned to the same cartier into a single
//      (Multi)Polygon by edge-counting — edges that appear in more than one
//      input polygon of the same cartier are interior and dropped; the
//      remaining edges form the cartier outline.
//
// The result is a drop-in replacement for districts_enriched_2025.geojson:
// ~27 features, one per cartier, with no internal UTR seams.
// The script is idempotent: re-running on its own output keeps cartier
// assignments (when properties.cartier is already set) and re-emits the same
// dissolved geometry.

const sourceGeojson = "data/webapp_vectors/districts_enriched_2025.geojson";
const outputGeojson = "data/webapp_vectors/districts_enriched_2025.geojson";
const suburbsCache = "scripts/cache/osm_suburbs.json";

const wgs84 = "EPSG:4326";
const utm = "+proj=utm +zone=34 +datum=WGS84 +units=m +no_defs";
const PRECISION = 8;

function round(v) {
  return Number(v.toFixed(PRECISION));
}

function projectPoint([lon, lat]) {
  return proj4(wgs84, utm, [lon, lat]);
}

function polygonRepresentativePoint(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let sumX = 0, sumY = 0, count = 0;
  for (const polygon of polygons) {
    const ring = polygon[0];
    for (let i = 0; i < ring.length - 1; i++) {
      sumX += ring[i][0];
      sumY += ring[i][1];
      count += 1;
    }
  }
  return [sumX / count, sumY / count];
}

function nearestSuburb([lon, lat], suburbsUtm) {
  const [x, y] = proj4(wgs84, utm, [lon, lat]);
  let bestIndex = 0;
  let bestDist2 = Infinity;
  for (let i = 0; i < suburbsUtm.length; i += 1) {
    const [sx, sy] = suburbsUtm[i].xy;
    const dx = sx - x;
    const dy = sy - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      bestIndex = i;
    }
  }
  return suburbsUtm[bestIndex];
}

function edgeKey(ax, ay, bx, by) {
  const [x1, y1, x2, y2] = ax < bx || (ax === bx && ay < by)
    ? [ax, ay, bx, by]
    : [bx, by, ax, ay];
  return `${x1},${y1}|${x2},${y2}`;
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return area / 2;
}

function stitchRings(edges) {
  const adj = new Map();
  function addAdj(key, edge) {
    if (!adj.has(key)) adj.set(key, []);
    adj.get(key).push(edge);
  }
  for (const e of edges) {
    addAdj(`${e[0]},${e[1]}`, e);
    addAdj(`${e[2]},${e[3]}`, e);
  }
  const used = new Set();
  const rings = [];
  for (const startEdge of edges) {
    const startKey = `${startEdge[0]},${startEdge[1]}|${startEdge[2]},${startEdge[3]}`;
    if (used.has(startKey)) continue;
    used.add(startKey);
    const ring = [[startEdge[0], startEdge[1]]];
    let cx = startEdge[2];
    let cy = startEdge[3];
    while (true) {
      ring.push([cx, cy]);
      if (cx === startEdge[0] && cy === startEdge[1]) break;
      const candidates = adj.get(`${cx},${cy}`) || [];
      let found = false;
      for (const edge of candidates) {
        const eKey = `${edge[0]},${edge[1]}|${edge[2]},${edge[3]}`;
        if (used.has(eKey)) continue;
        let nx, ny;
        if (edge[0] === cx && edge[1] === cy) {
          nx = edge[2];
          ny = edge[3];
        } else if (edge[2] === cx && edge[3] === cy) {
          nx = edge[0];
          ny = edge[1];
        } else {
          continue;
        }
        used.add(eKey);
        cx = nx;
        cy = ny;
        found = true;
        break;
      }
      if (!found) break;
    }
    if (ring.length >= 4) rings.push(ring);
  }
  return rings;
}

function ringContainsPoint(ring, point) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const denom = yj - yi || Number.EPSILON;
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / denom + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Group stitched rings into (outer, holes) sets. A ring is a hole when it
// falls inside a larger ring of the same cartier.
function buildPolygonsFromRings(rings) {
  const items = rings
    .map((ring) => ({ ring, area: Math.abs(ringArea(ring)), assigned: false }))
    .sort((a, b) => b.area - a.area);

  const polygons = [];
  for (const item of items) {
    if (item.assigned) continue;
    item.assigned = true;
    const polygon = [item.ring];
    for (const candidate of items) {
      if (candidate.assigned) continue;
      if (ringContainsPoint(item.ring, candidate.ring[0])) {
        candidate.assigned = true;
        polygon.push(candidate.ring);
      }
    }
    polygons.push(polygon);
  }
  return polygons;
}

function multiPolygonArea(geometry) {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let total = 0;
  for (const poly of polys) total += Math.abs(ringArea(poly[0]));
  return total;
}

// ── main ─────────────────────────────────────────────────────────────────────

const cache = JSON.parse(await fs.readFile(suburbsCache, "utf8"));
const suburbs = cache.nodes.map((node) => ({
  name: node.name,
  xy: projectPoint([node.lon, node.lat]),
}));

const geojson = JSON.parse(await fs.readFile(sourceGeojson, "utf8"));

// Step 1 — classify (idempotent: trust an existing cartier label if present).
const classified = geojson.features.map((feature) => {
  const existing = feature.properties?.cartier;
  if (existing) return { feature, cartier: existing };
  const [lon, lat] = polygonRepresentativePoint(feature.geometry);
  const suburb = nearestSuburb([lon, lat], suburbs);
  return { feature, cartier: suburb.name };
});

// Step 2 — collect undirected edges per cartier, counting appearances.
const cartierEdges = new Map();
for (const { feature, cartier } of classified) {
  let edgeMap = cartierEdges.get(cartier);
  if (!edgeMap) {
    edgeMap = new Map();
    cartierEdges.set(cartier, edgeMap);
  }
  const polys = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  for (const polygon of polys) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length - 1; i += 1) {
        const ax = round(ring[i][0]);
        const ay = round(ring[i][1]);
        const bx = round(ring[i + 1][0]);
        const by = round(ring[i + 1][1]);
        if (ax === bx && ay === by) continue;
        const key = edgeKey(ax, ay, bx, by);
        let entry = edgeMap.get(key);
        if (!entry) {
          entry = { count: 0, directed: [ax, ay, bx, by] };
          edgeMap.set(key, entry);
        }
        entry.count += 1;
      }
    }
  }
}

// Step 3 — dissolve each cartier's edges into one or more polygons.
const dissolved = [];
for (const [cartier, edgeMap] of cartierEdges) {
  const outerEdges = [];
  for (const { count, directed } of edgeMap.values()) {
    if (count === 1) outerEdges.push(directed);
  }
  const rings = stitchRings(outerEdges);
  if (!rings.length) continue;
  for (const ring of rings) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
  }
  const polygons = buildPolygonsFromRings(rings);
  dissolved.push({
    type: "Feature",
    properties: {
      cartier,
      area_statistica: cartier,
      quartiere: cartier,
      source_layer: "OSM place=suburb classifier + per-cartier UTR dissolve",
    },
    geometry: polygons.length === 1
      ? { type: "Polygon", coordinates: polygons[0] }
      : { type: "MultiPolygon", coordinates: polygons },
  });
}

// Render larger cartiere first so smaller cartiere (and enclaves) sit on top
// in MapLibre's natural draw order.
dissolved.sort((a, b) => multiPolygonArea(b.geometry) - multiPolygonArea(a.geometry));

const output = {
  type: "FeatureCollection",
  name: "districts_enriched_2025",
  crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  features: dissolved,
};

await fs.writeFile(outputGeojson, JSON.stringify(output), "utf8");

console.log(`Classified ${classified.length} input polygons.`);
console.log(`Dissolved into ${dissolved.length} cartier features.`);
for (const feat of dissolved) {
  const polys = feat.geometry.type === "Polygon" ? 1 : feat.geometry.coordinates.length;
  console.log(`  ${feat.properties.cartier.padEnd(24)} ${polys} polygon(s)`);
}
