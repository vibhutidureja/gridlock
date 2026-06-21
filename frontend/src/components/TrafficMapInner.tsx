"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, ZoomControl, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState, useRef, Fragment } from "react";

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Custom SVG markers by priority
function createPriorityIcon(priority: string, eventType: string) {
  const colorMap: Record<string, string> = {
    Critical: "#B71C1C",
    High: "#E53935",
    Medium: "#F5A623",
    Low: "#26A541",
  };
  const color = colorMap[priority] || "#2874F0";
  const pulseClass = priority === "Critical" ? "animate-ping" : "";

  const emojiMap: Record<string, string> = {
    Accident: "🚗",
    Breakdown: "🔧",
    Protest: "🪧",
    "VIP Movement": "🚔",
    Waterlogging: "💧",
    "Road Work": "🚧",
    "Fire Incident": "🔥",
  };
  const emoji = emojiMap[eventType] || "⚠️";

  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
    </filter>
    <path d="M18 2 C9 2 2 9 2 18 C2 28 18 42 18 42 C18 42 34 28 34 18 C34 9 27 2 18 2 Z"
      fill="${color}" filter="url(#shadow)"/>
    <circle cx="18" cy="18" r="11" fill="white" opacity="0.95"/>
    <text x="18" y="22" text-anchor="middle" font-size="13">${emoji}</text>
  </svg>`;

  return L.divIcon({
    html: `<div style="position:relative">
      <div style="position:absolute;top:-2px;left:-2px;width:40px;height:40px;border-radius:50%;background:${color};opacity:0.25;animation:${priority === "Critical" ? "pulse-ring 2s infinite" : "none"}"></div>
      ${svgStr}
    </div>`,
    className: "",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
}

// Blockage marker (red X)
function createBlockageIcon() {
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <rect x="0" y="0" width="28" height="28" rx="4" fill="#D0021B" opacity="0.9"/>
    <line x1="7" y1="7" x2="21" y2="21" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <line x1="21" y1="7" x2="7" y2="21" stroke="white" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
  return L.divIcon({
    html: svgStr,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function severityToColor(sev: number): string {
  if (sev >= 8) return "#B71C1C";
  if (sev >= 6) return "#E53935";
  if (sev >= 4) return "#F5A623";
  return "#F5A623";
}

export default function TrafficMapInner({ events, selectedEventId, onMapClick, newPinLocation, onEventSelect }: { events: any[]; selectedEventId?: string; onMapClick?: (lat: number, lon: number) => void; newPinLocation?: [number, number] | null; onEventSelect?: (id: string) => void }) {
  // MapMyIndia tile URL - uses REST API key
  const mapKey = process.env.NEXT_PUBLIC_MAPMYINDIA_API_KEY;
  const tileUrl = mapKey && mapKey.length > 10
    ? `https://apis.mapmyindia.com/advancedmaps/v1/${mapKey}/retina_map/{z}/{x}/{y}.png`
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const attribution = mapKey && mapKey.length > 10
    ? '© <a href="https://www.mapmyindia.com" target="_blank">MapMyIndia</a>'
    : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';

  const [shockwaves, setShockwaves] = useState<Record<string, {coords: [number, number][], isAlternative: boolean}[]>>({});
  const fetchedIds = useRef<Set<string>>(new Set());

  // Parse event location
  function parseLocation(loc: string | undefined): [number, number] {
    if (loc && loc.startsWith("POINT(")) {
      const parts = loc.replace("POINT(", "").replace(")", "").split(" ");
      const lon = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
    }
    return [12.9716, 77.5946];
  }

  useEffect(() => {
    const fetchRoutes = async () => {
      const newShockwaves: Record<string, {coords: [number, number][], isAlternative: boolean}[]> = {};

      for (const event of events) {
        if (fetchedIds.current.has(event.id)) continue;
        fetchedIds.current.add(event.id);

        const [lat, lon] = parseLocation(event.location);
        const sev = event.predicted_severity || 5;
        const dist = 0.005 + (sev * 0.0005); // Smaller realistic distance

        const branches: [number, number][] = [
          [lat + dist * 1.5, lon + dist],
          [lat - dist * 1.2, lon + dist * 1.5],
          [lat + dist * 0.8, lon - dist * 1.5],
        ];

        const paths: {coords: [number, number][], isAlternative: boolean}[] = [];
        try {
          await Promise.all(
            branches.map(async ([blat, blon]) => {
              const res = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${lon},${lat};${blon},${blat}?overview=full&geometries=geojson&alternatives=true`
              );
              if (!res.ok) throw new Error("OSRM API rate limit or error");
              const data = await res.json();
              if (data.routes?.length > 0) {
                const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
                paths.push({ coords, isAlternative: false });
                if (data.routes.length > 1) {
                  const altCoords = data.routes[1].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
                  paths.push({ coords: altCoords, isAlternative: true });
                }
              }
            })
          );
        } catch { 
          // Silently handle OSRM failures 
        }

        if (paths.length === 0) {
          // Straight line fallback
          branches.forEach(([blat, blon]) => {
            paths.push({ coords: [[lat, lon], [blat, blon]], isAlternative: false });
          });
        }

        newShockwaves[event.id] = paths;
      }

      if (Object.keys(newShockwaves).length > 0) {
        setShockwaves(prev => ({ ...prev, ...newShockwaves }));
      }
    };

    if (events.length > 0) fetchRoutes();
  }, [events]);

  // Compute map center: average of all events or Bangalore default
  const center: [number, number] = events.length > 0
    ? (() => {
        const locs = events.map(e => parseLocation(e.location));
        const avgLat = locs.reduce((s, [lat]) => s + lat, 0) / locs.length;
        const avgLon = locs.reduce((s, [, lon]) => s + lon, 0) / locs.length;
        return [avgLat, avgLon];
      })()
    : [12.9716, 77.5946];

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer url={tileUrl} attribution={attribution} />
        <MapClickHandler onMapClick={onMapClick} />

        {newPinLocation && (
          <Marker position={newPinLocation}>
            <Popup>
              <div className="text-sm font-bold text-[#2874F0]">New Event Location</div>
              <div className="text-xs text-[#717171]">Click "Log Event" to proceed</div>
            </Popup>
          </Marker>
        )}

        {events.map((event) => {
          const [lat, lon] = parseLocation(event.location);
          const sev = event.predicted_severity || 5;
          const color = severityToColor(sev);
          const icon = createPriorityIcon(event.priority, event.event_type);
          const isSelected = event.id === selectedEventId;

          return (
            <Fragment key={event.id}>
              {/* Impact radius circle */}
              <Circle
                center={[lat, lon]}
                radius={100 + sev * 30}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.07,
                  weight: 1.5,
                  dashArray: "6 4",
                  opacity: isSelected ? 0.9 : 0.5,
                }}
              />

              {/* Event marker */}
              <Marker 
                position={[lat, lon]} 
                icon={icon}
                eventHandlers={{
                  click: () => {
                    if (onEventSelect) onEventSelect(event.id);
                  }
                }}
              >
                <Popup maxWidth={260}>
                  <div className="font-sans min-w-[220px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-gray-900">{event.event_type}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: event.priority === "Critical" ? "#FCE4E4" : event.priority === "High" ? "#FDECEA" : event.priority === "Medium" ? "#FEF5E7" : "#E8F5EB",
                          color: event.priority === "Critical" ? "#B71C1C" : event.priority === "High" ? "#D0021B" : event.priority === "Medium" ? "#B07800" : "#1B5E20",
                        }}
                      >
                        {event.priority}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Zone</span>
                        <span className="font-semibold text-gray-800">{event.zone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Severity</span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(sev / 10) * 100}%`, background: color }}
                            />
                          </div>
                          <span className="font-semibold text-gray-800">{sev.toFixed(1)}/10</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">ETA</span>
                        <span className="font-semibold text-gray-800">{event.predicted_resolution_time_mins} min</span>
                      </div>
                      {event.road_closure && (
                        <div className="mt-2 p-1.5 rounded bg-red-50 border border-red-200 text-center">
                          <span className="text-red-700 font-semibold">⚠ Road Closure Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Road closure blockage markers on shockwave ends */}
              {event.road_closure && isSelected && shockwaves[event.id]?.map((pathObj, pIdx) => {
                if (pathObj.isAlternative) return null; // Don't block alternatives
                const path = pathObj.coords;
                const endPoint = path[Math.floor(path.length * 0.3)]; // Much closer to the event!
                if (!endPoint) return null;
                return (
                  <Marker key={`block-${event.id}-${pIdx}`} position={endPoint} icon={createBlockageIcon()}>
                    <Popup maxWidth={220}>
                      <div className="font-sans min-w-[180px]">
                        <div className="text-xs font-bold text-[#D0021B] uppercase tracking-wide border-b border-[#FBCDD0] pb-1 mb-2">Road Blocked</div>
                        <div className="text-[11px] text-[#444] leading-relaxed">
                          <strong>{event.event_type}</strong> in {event.zone} zone has caused a major blockage. 
                          <span className="text-[#2874F0] block mt-1 font-semibold">↳ Traffic is being diverted to Alternative Routes.</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Traffic shockwave polylines */}
              {isSelected && (shockwaves[event.id] || []).map((pathObj, pIdx) => (
                <Polyline
                  key={`shock-${event.id}-${pIdx}`}
                  positions={pathObj.coords}
                  pathOptions={{
                    color: pathObj.isAlternative ? "#2874F0" : color,
                    weight: pathObj.isAlternative ? 3 : (sev > 7 ? 5 : sev > 5 ? 4 : 3),
                    opacity: isSelected ? 1.0 : (pathObj.isAlternative ? 0.8 : 0.75),
                    dashArray: pathObj.isAlternative ? "6 6" : (sev > 7 ? undefined : "8 4"),
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              ))}
            </Fragment>
          );
        })}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-8 left-3 z-[1000] bg-white rounded-lg border border-[#E0E3E8] shadow-md p-2.5 text-[11px]">
        <div className="font-semibold text-[#212121] mb-1.5">Legend</div>
        {[
          { color: "#B71C1C", label: "Critical" },
          { color: "#E53935", label: "High" },
          { color: "#F5A623", label: "Medium" },
          { color: "#26A541", label: "Low" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-[#717171]">{label} Severity</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-[#E0E3E8]">
          <div className="w-3 h-3 bg-[#D0021B] rounded-sm flex items-center justify-center">
            <span className="text-white text-[6px] font-bold">X</span>
          </div>
          <span className="text-[#717171]">Road Blockage</span>
        </div>
        <div className="flex items-center gap-2 mt-1 pt-1">
          <div className="w-3 h-1 bg-[#2874F0]" />
          <span className="text-[#717171]">Alternative Route</span>
        </div>
      </div>
    </div>
  );
}
