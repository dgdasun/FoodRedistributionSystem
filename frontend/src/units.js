// The units a donor can list food in - mirrors DonationUnits on the backend.
// Quantities in different units are never added together.
export const UNITS = [
  { key: "kg", label: "Kilograms (kg)", short: "kg", noun: "Weight" },
  { key: "liters", label: "Liters (L)", short: "L", noun: "Volume" },
  { key: "items", label: "Items / packets", short: "items", noun: "Count" },
];

const BY_KEY = Object.fromEntries(UNITS.map((u) => [u.key, u]));

/** Unit definition for a listing; records from before units existed were always kg. */
export const unitOf = (item) => BY_KEY[item?.unit] || BY_KEY.kg;

/** "12 kg", "5 L", "30 items" */
export const formatQty = (value, item) => `${value} ${unitOf(item).short}`;

/** Units one packet can be measured in - a packet of packets means nothing. */
export const PACK_UNITS = UNITS.filter((u) => u.key !== "items");

const num = (v) => Math.round(Number(v) * 100) / 100;

/** True when an items/packets listing says how much each packet holds. */
export const hasPackSize = (item) => item?.unit === "items" && Number(item.packSize) > 0;

/** "500 g each" style text for one packet, or null when not given. */
export const packText = (item) => {
  if (!hasPackSize(item)) return null;
  const size = Number(item.packSize);
  // Small packets read better in grams / millilitres.
  if (size < 1) return `${num(size * 1000)} ${item.packUnit === "liters" ? "ml" : "g"} each`;
  return `${num(size)} ${unitOf({ unit: item.packUnit }).short} each`;
};

/** Total weight/volume of `count` packets, e.g. "12.5 kg", or null without a pack size. */
export const packTotal = (count, item) =>
  hasPackSize(item) ? `${num(Number(count) * Number(item.packSize))} ${unitOf({ unit: item.packUnit }).short}` : null;
