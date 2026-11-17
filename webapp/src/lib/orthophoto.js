import { CLUJ_NAPOCA_CITY_BOUNDS } from "./mapBounds.js";

const ORTHOPHOTO_SOURCES = Object.freeze({
  2025: {
    tiles: [
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: "Esri World Imagery · Maxar, Earthstar Geographics and the GIS User Community",
    maxzoom: 19,
  },
});

export const AVAILABLE_ORTHOPHOTO_YEARS = Object.freeze(Object.keys(ORTHOPHOTO_SOURCES).map(Number));
export const EARLIEST_ORTHOPHOTO_YEAR = AVAILABLE_ORTHOPHOTO_YEARS[0];
export const LATEST_ORTHOPHOTO_YEAR = AVAILABLE_ORTHOPHOTO_YEARS[AVAILABLE_ORTHOPHOTO_YEARS.length - 1];
export const ORTHOPHOTO_AVAILABLE_YEARS_LABEL = "current Esri World Imagery";

const ORTHOPHOTO_BOUNDS = Object.freeze([
  CLUJ_NAPOCA_CITY_BOUNDS[0][0],
  CLUJ_NAPOCA_CITY_BOUNDS[0][1],
  CLUJ_NAPOCA_CITY_BOUNDS[1][0],
  CLUJ_NAPOCA_CITY_BOUNDS[1][1],
]);

function normalizeOrthophotoYear(year) {
  const numericYear = Number(year);
  return Number.isFinite(numericYear) ? Math.round(numericYear) : LATEST_ORTHOPHOTO_YEAR;
}

export function resolveOrthophotoYear(requestedYear = LATEST_ORTHOPHOTO_YEAR) {
  const year = normalizeOrthophotoYear(requestedYear);
  if (year <= EARLIEST_ORTHOPHOTO_YEAR) return EARLIEST_ORTHOPHOTO_YEAR;

  const exactYear = AVAILABLE_ORTHOPHOTO_YEARS.find((item) => item === year);
  if (exactYear) return exactYear;

  const nextAvailableYear = AVAILABLE_ORTHOPHOTO_YEARS.find((item) => item > year);
  return nextAvailableYear || LATEST_ORTHOPHOTO_YEAR;
}

export function getOrthophotoConfig(requestedYear = LATEST_ORTHOPHOTO_YEAR) {
  const year = resolveOrthophotoYear(requestedYear);
  const source = ORTHOPHOTO_SOURCES[year];
  return {
    year,
    tiles: source.tiles,
    attribution: source.attribution,
    bounds: ORTHOPHOTO_BOUNDS,
    maxzoom: source.maxzoom,
  };
}
