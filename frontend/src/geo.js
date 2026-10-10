/**
 * Turning a listing into a map pin.
 *
 * `pickupLocation` is free text the donor types - in practice a site name, a
 * town, or "Site, Town" ("Glow mark, Kottawa", "ABC Supermarket Hub"). There is
 * no geocoding service in this stack, and adding a network call per listing to
 * an external one would put the map behind a third party's rate limit and
 * privacy terms for what is, today, a fixed set of Sri Lankan towns.
 *
 * So resolution is local and ordered, most trustworthy first:
 *
 *   1. the listing's own latitude/longitude, when a donor supplied them
 *   2. a town name found inside the pickup text, matched against the gazetteer
 *   3. the donor's registered coordinates (served as donorLatitude/Longitude)
 *
 * Anything that matches none of the three is reported as unplaceable rather
 * than dropped silently or pinned to a guessed centre - the map says how many
 * it couldn't place, so a missing pin never reads as "no donations here".
 */

/** Sri Lankan towns, lowercased. Seeded coordinates reused where they exist. */
const GAZETTEER = {
  "colombo 05": [6.8845, 79.8578],
  "colombo 5": [6.8845, 79.8578],
  "colombo 03": [6.9101, 79.8529],
  "colombo 07": [6.9061, 79.8636],
  colombo: [6.9271, 79.8612],
  kottawa: [6.841, 79.9653],
  homagama: [6.8442, 80.0025],
  maharagama: [6.8482, 79.9267],
  nugegoda: [6.8649, 79.8997],
  dehiwala: [6.8511, 79.8656],
  moratuwa: [6.7734, 79.8816],
  panadura: [6.7132, 79.9026],
  kalutara: [6.5854, 79.9607],
  kadawatha: [7.0011, 79.95],
  gampaha: [7.0917, 79.9999],
  negombo: [7.2083, 79.8358],
  kandy: [7.2906, 80.6337],
  peradeniya: [7.2599, 80.5977],
  matale: [7.4675, 80.6234],
  "nuwara eliya": [6.9497, 80.7891],
  badulla: [6.9934, 81.055],
  galle: [6.0535, 80.221],
  matara: [5.9549, 80.555],
  tangalle: [6.024, 80.7943],
  hambantota: [6.1241, 81.1185],
  ratnapura: [6.6828, 80.4126],
  kurunegala: [7.4863, 80.3623],
  anuradhapura: [8.3114, 80.4037],
  polonnaruwa: [7.9403, 81.0188],
  trincomalee: [8.5874, 81.2152],
  batticaloa: [7.7102, 81.6924],
  jaffna: [9.6615, 80.0255],
  vavuniya: [8.7514, 80.4971],
  puttalam: [8.0362, 79.8283],
  chilaw: [7.5758, 79.7953],
  avissawella: [6.9539, 80.2044],
};

/* Longest names first, so "colombo 05" is matched before bare "colombo" and a
   listing in Colombo 5 doesn't land on the city centre. */
const TOWNS = Object.keys(GAZETTEER).sort((a, b) => b.length - a.length);

/** Centre of the covered area, for an empty or single-pin map. */
export const SRI_LANKA_CENTER = [7.4, 80.7];

function isCoord(lat, lng) {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
}

/** The town this free-text location mentions, or null. */
export function townIn(text) {
  if (!text) return null;
  const haystack = String(text).toLowerCase();
  const name = TOWNS.find((town) => haystack.includes(town));
  return name ? { name, coords: GAZETTEER[name] } : null;
}

/**
 * Resolve one donation to `{ lat, lng, source }`, or null if it can't be placed.
 * `source` records which rule fired, so the popup can be honest about whether a
 * pin is the exact site or only the donor's registered address.
 */
export function locate(item) {
  if (!item) return null;

  if (isCoord(item.latitude, item.longitude)) {
    return { lat: item.latitude, lng: item.longitude, source: "listing" };
  }

  const town = townIn(item.pickupLocation);
  if (town) {
    return { lat: town.coords[0], lng: town.coords[1], source: "town", town: town.name };
  }

  if (isCoord(item.donorLatitude, item.donorLongitude)) {
    return { lat: item.donorLatitude, lng: item.donorLongitude, source: "donor" };
  }

  return null;
}

/**
 * Split a list into placeable pins and the count that couldn't be resolved.
 *
 * Pins that resolve to the same point are nudged apart on a small ring:
 * several listings from one supermarket would otherwise stack into a single
 * marker and only the top one would ever be clickable.
 */
export function toPins(items) {
  const pins = [];
  let unplaceable = 0;
  const seen = new Map();

  for (const item of items || []) {
    const at = locate(item);
    if (!at) {
      unplaceable += 1;
      continue;
    }

    const key = `${at.lat.toFixed(4)},${at.lng.toFixed(4)}`;
    const n = seen.get(key) || 0;
    seen.set(key, n + 1);

    let { lat, lng } = at;
    if (n > 0) {
      // ~150m ring, tight enough to still read as "this place".
      const angle = (n * 2 * Math.PI) / 8;
      lat += 0.0014 * Math.cos(angle);
      lng += 0.0014 * Math.sin(angle);
    }

    pins.push({ ...item, lat, lng, locationSource: at.source });
  }

  return { pins, unplaceable };
}
