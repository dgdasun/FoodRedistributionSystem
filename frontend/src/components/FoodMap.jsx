import React, { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { freshnessOf } from "./FreshnessMeter.jsx";
import { toPins, SRI_LANKA_CENTER } from "../geo.js";
import { useTheme } from "../ThemeContext.jsx";

/**
 * Donations on a map.
 *
 * Markers are built as inline SVG rather than Leaflet's default PNG pin: the
 * bundled default loads its image by a relative URL that Vite doesn't rewrite,
 * which is the classic "markers are invisible in the build" bug. Drawing them
 * ourselves also lets each pin carry its freshness colour, so urgency reads
 * from the map itself.
 */

/** Freshness colour + the item's initial, as a self-contained marker. */
function pinIcon(item) {
  const f = freshnessOf(item);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
      <path d="M15 39C15 39 28 24.5 28 14.5A13 13 0 1 0 2 14.5C2 24.5 15 39 15 39Z"
            fill="${f.color}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="15" cy="14" r="5.2" fill="#ffffff"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "food-map-pin",
    iconSize: [30, 40],
    // Anchor at the tip, so the point sits on the actual coordinate.
    iconAnchor: [15, 39],
    popupAnchor: [0, -34],
  });
}

/** Keeps the viewport around whatever is currently pinned. */
function FitToPins({ pins }) {
  const map = useMap();

  useEffect(() => {
    if (!pins.length) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 12);
      return;
    }
    map.fitBounds(
      L.latLngBounds(pins.map((p) => [p.lat, p.lng])),
      { padding: [36, 36], maxZoom: 13 }
    );
  }, [pins, map]);

  return null;
}

/** Leaflet measures itself on mount; inside a tab or accordion that can be 0×0. */
function InvalidateOnShow() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 180);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function FoodMap({ items, height = 420, onSelect, actionLabel = "View food" }) {
  const { isDark } = useTheme();
  const { pins, unplaceable } = useMemo(() => toPins(items), [items]);
  const mapRef = useRef(null);

  if (!pins.length) {
    return (
      <div className="card empty-state" style={{ minHeight: 160 }}>
        {unplaceable > 0
          ? `None of the ${unplaceable} current listing${unplaceable === 1 ? "" : "s"} has a location we can place on the map yet.`
          : "No listings to show on the map right now."}
      </div>
    );
  }

  return (
    <div>
      <div className={isDark ? "food-map-wrap is-dark" : "food-map-wrap"} style={{ height }}>
        <MapContainer
          ref={mapRef}
          center={SRI_LANKA_CENTER}
          zoom={8}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          {/* Standard OSM tiles: free and keyless. CARTO's themed basemaps
              would give a real dark map, but their CDN now stamps
              "API KEY REQUIRED" across unkeyed tiles, so the dark variant is
              done with a CSS filter on the tile pane instead (see
              .food-map-wrap in index.css). Attribution is required. */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <FitToPins pins={pins} />
          <InvalidateOnShow />

          {pins.map((item) => {
            const f = freshnessOf(item);
            return (
              <Marker key={item.id} position={[item.lat, item.lng]} icon={pinIcon(item)}>
                <Popup>
                  <div className="food-map-popup">
                    <strong>{item.name}</strong>
                    <div className="food-map-popup-meta">
                      {item.quantityKg} kg · {item.category}
                    </div>
                    <div className="food-map-popup-meta">{item.pickupLocation}</div>
                    <span className="food-map-popup-chip" style={{ background: f.tint, color: f.color }}>
                      {f.label}
                    </span>
                    {/* Say so when the pin is the donor's registered address
                        rather than the pickup site, so nobody navigates to the
                        wrong place. */}
                    {item.locationSource === "donor" && (
                      <div className="food-map-popup-note">Approximate - donor's registered address</div>
                    )}
                    {item.locationSource === "town" && (
                      <div className="food-map-popup-note">Approximate - town centre</div>
                    )}
                    {onSelect && (
                      <button className="btn btn-primary btn-sm" onClick={() => onSelect(item)}>
                        {actionLabel}
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {unplaceable > 0 && (
        <p className="food-map-footnote">
          {unplaceable} listing{unplaceable === 1 ? "" : "s"} not shown - no location we could place on the map.
        </p>
      )}
    </div>
  );
}
