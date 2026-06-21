"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, ZoomControl, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState, useRef, Fragment } from "react";

const DEBUG_ROUTES = true;

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Haversine distance in meters
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance from point to line segment
function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  let A = px - x1;
  let B = py - y1;
  let C = x2 - x1;
  let D = y2 - y1;

  let dot = A * C + B * D;
  let len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  let dx = px - xx;
  let dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Min distance from point to polyline (meters)
function getMinDistanceFromRoute(eventLat: number, eventLon: number, coords: [number, number][]) {
  let minDistance = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i+1];
    
    const latMeters = 111139;
    const lonMeters = 111139 * Math.cos(eventLat * Math.PI / 180);
    
    const x1 = (p1[1] - eventLon) * lonMeters;
    const y1 = (p1[0] - eventLat) * latMeters;
    const x2 = (p2[1] - eventLon) * lonMeters;
    const y2 = (p2[0] - eventLat) * latMeters;
    
    const d = distanceToSegment(0, 0, x1, y1, x2, y2);
    if (d < minDistance) minDistance = d;
  }
  return minDistance;
}

function getRouteLength(coords: [number, number][]) {
  let length = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    length += getDistanceFromLatLonInM(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1]);
  }
  return length;
}

// Check if alternative is sufficiently different (at least 20% different path)
function isRouteDifferent(primary: [number, number][], alt: [number, number][]) {
  if (primary.length === 0 || alt.length === 0) return false;
  // Simple check: difference in length
  const pLen = getRouteLength(primary);
  const aLen = getRouteLength(alt);
  if (Math.abs(pLen - aLen) > 50) return true; // > 50 meters diff
  return false;
}

// Custom SVG markers
function createPriorityIcon(priority: string, eventType: string, isSelected: boolean) {
  const colorMap: Record<string, string> = {
    Critical: "#B71C1C",
    High: "#E53935",
    Medium: "#F5A623",
    Low: "#26A541",
  };
  const color = colorMap[priority] || "#2874F0";

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

  // Scale up slightly if selected
  const scale = isSelected ? 1.2 : 1;
  const width = 36 * scale;
  const height = 44 * scale;
  
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 36 44">
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
    </filter>
    <path d="M18 2 C9 2 2 9 2 18 C2 28 18 42 18 42 C18 42 34 28 34 18 C34 9 27 2 18 2 Z"
      fill="${color}" filter="url(#shadow)"/>
    <circle cx="18" cy="18" r="11" fill="white" opacity="0.95"/>
    <text x="18" y="22" text-anchor="middle" font-size="13">${emoji}</text>
  </svg>`;

  return L.divIcon({
    html: `<div style="position:relative; z-index: ${isSelected ? 1000 : 1}; opacity: ${isSelected ? 1 : 0.85}; transition: all 0.3s ease;">
      ${svgStr}
    </div>`,
    className: "",
    iconSize: [width, height],
    iconAnchor: [width/2, height],
    popupAnchor: [0, -height],
  });
}

function createBlockageIcon(isSelected: boolean) {
  const scale = isSelected ? 1.1 : 0.9;
  const width = 28 * scale;
  const height = 28 * scale;
  
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 28 28">
    <rect x="0" y="0" width="28" height="28" rx="4" fill="#D0021B" opacity="0.95"/>
    <line x1="7" y1="7" x2="21" y2="21" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <line x1="21" y1="7" x2="7" y2="21" stroke="white" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
  return L.divIcon({
    html: svgStr,
    className: "",
    iconSize: [width, height],
    iconAnchor: [width/2, height/2],
    popupAnchor: [0, -height/2],
  });
}

function severityToColor(sev: number): string {
  if (sev >= 8) return "#B71C1C";
  if (sev >= 6) return "#E53935";
  if (sev >= 4) return "#F5A623";
  return "#26A541";
}

export default function TrafficMapInner({ events, selectedEventId, onMapClick, newPinLocation, onEventSelect }: { events: any[]; selectedEventId?: string; onMapClick?: (lat: number, lon: number) => void; newPinLocation?: [number, number] | null; onEventSelect?: (id: string) => void }) {
  const mapKey = process.env.NEXT_PUBLIC_MAPMYINDIA_API_KEY;
  const tileUrl = mapKey && mapKey.length > 10
    ? `https://apis.mapmyindia.com/advancedmaps/v1/${mapKey}/retina_map/{z}/{x}/{y}.png`
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const attribution = mapKey && mapKey.length > 10
    ? '© <a href="https://www.mapmyindia.com" target="_blank">MapMyIndia</a>'
    : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';

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

  // Caching routes: { "eventId_lat_lon": { paths } }
  const routeCache = useRef<Record<string, {coords: [number, number][], isAlternative: boolean}[]>>({});
  const [activeRoutes, setActiveRoutes] = useState<Record<string, {coords: [number, number][], isAlternative: boolean}[]>>({});

  useEffect(() => {
    let isMounted = true;
    
    const fetchEventRoutes = async () => {
      const newActiveRoutes: Record<string, {coords: [number, number][], isAlternative: boolean}[]> = {};

      for (const event of events) {
        const [lat, lon] = parseLocation(event.location);
        const cacheKey = `${event.id}_${lat}_${lon}`;

        if (routeCache.current[cacheKey]) {
          newActiveRoutes[event.id] = routeCache.current[cacheKey];
          continue;
        }

        const dist = 0.003; // ~300m
        const directions = [
          { name: 'N->S', start: [lat + dist, lon], end: [lat - dist, lon] },
          { name: 'S->N', start: [lat - dist, lon], end: [lat + dist, lon] },
          { name: 'E->W', start: [lat, lon + dist], end: [lat, lon - dist] },
          { name: 'W->E', start: [lat, lon - dist], end: [lat, lon + dist] },
        ];

        let bestRoute: [number, number][] | null = null;
        let bestAlt: [number, number][] | null = null;
        let minRouteDist = Infinity;

        for (const dir of directions) {
          try {
            const res = await fetch(
              `https://router.project-osrm.org/route/v1/driving/${dir.start[1]},${dir.start[0]};${lon},${lat};${dir.end[1]},${dir.end[0]}?overview=full&geometries=geojson&alternatives=true&continue_straight=true`
            );
            if (!res.ok) continue;
            
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
              const primaryCoords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
              const primaryLen = getRouteLength(primaryCoords);
              const distFromEvent = getMinDistanceFromRoute(lat, lon, primaryCoords);
              
              if (DEBUG_ROUTES) {
                console.log(`[DEBUG] ${event.id} | ${dir.name} | Len:${primaryLen.toFixed(0)}m | Dist:${distFromEvent.toFixed(0)}m`);
              }

              // Route Validation:
              // Reject if too far (> 100m) or too long (> 2000m) or too short (< 50m)
              if (distFromEvent < 100 && primaryLen > 50 && primaryLen < 2000) {
                if (distFromEvent < minRouteDist) {
                  minRouteDist = distFromEvent;
                  bestRoute = primaryCoords;
                  
                  if (data.routes.length > 1) {
                    const altCoords = data.routes[1].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
                    if (isRouteDifferent(primaryCoords, altCoords)) {
                      bestAlt = altCoords;
                    } else {
                      bestAlt = null;
                    }
                  } else {
                    bestAlt = null;
                  }
                }
              } else {
                if (DEBUG_ROUTES) console.log(`[DEBUG] Rejected ${event.id} ${dir.name} due to limits.`);
              }
            }
          } catch (e) {
            // Silently handle
          }
        }

        const paths: {coords: [number, number][], isAlternative: boolean}[] = [];
        if (bestRoute) {
          if (DEBUG_ROUTES) console.log(`[DEBUG] Accepted ${event.id} with Dist: ${minRouteDist.toFixed(0)}m`);
          paths.push({ coords: bestRoute, isAlternative: false });
          if (bestAlt) paths.push({ coords: bestAlt, isAlternative: true });
        }

        routeCache.current[cacheKey] = paths;
        newActiveRoutes[event.id] = paths;
      }

      if (isMounted) {
        setActiveRoutes(newActiveRoutes);
      }
    };

    fetchEventRoutes();

    return () => { isMounted = false; };
  }, [events]);

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
          const isSelected = event.id === selectedEventId;
          const icon = createPriorityIcon(event.priority, event.event_type, isSelected);
          
          const routes = activeRoutes[event.id] || [];

          return (
            <Fragment key={event.id}>
              {/* OSRM Routes */}
              {routes.map((pathObj, pIdx) => (
                <Polyline
                  key={`route-${event.id}-${pIdx}`}
                  positions={pathObj.coords}
                  pathOptions={{
                    color: pathObj.isAlternative ? "#2874F0" : color,
                    weight: isSelected ? (pathObj.isAlternative ? 5 : 6) : (pathObj.isAlternative ? 3 : (sev > 7 ? 4 : 3)),
                    opacity: isSelected ? 1.0 : (pathObj.isAlternative ? 0.8 : 0.75),
                    dashArray: pathObj.isAlternative ? "8 6" : undefined,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              ))}

              {/* Road Closure Barrier Marker (placed EXACTLY at event location) */}
              {event.road_closure && (
                <Marker 
                  position={[lat, lon]} 
                  icon={createBlockageIcon(isSelected)}
                >
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
              )}

              {/* Main Event Marker */}
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

            </Fragment>
          );
        })}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-8 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg border border-[#E0E3E8] shadow-md p-3 text-[11px] font-sans">
        <div className="font-bold text-[#212121] mb-2 uppercase tracking-wide text-[10px]">Severity</div>
        {[
          { color: "#B71C1C", label: "Critical" },
          { color: "#E53935", label: "High" },
          { color: "#F5A623", label: "Medium" },
          { color: "#26A541", label: "Low" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 mb-1.5">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: color }} />
            <span className="text-[#444] font-medium">{label}</span>
          </div>
        ))}
        
        <div className="mt-2.5 pt-2.5 border-t border-[#E0E3E8]">
          <div className="font-bold text-[#212121] mb-2 uppercase tracking-wide text-[10px]">Impact Visuals</div>
          
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-3 h-3 bg-[#D0021B] rounded-[3px] shadow-sm flex items-center justify-center">
              <span className="text-white text-[7px] font-bold">X</span>
            </div>
            <span className="text-[#444] font-medium">Road Closure</span>
          </div>
          
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-3 h-0.5 bg-[#2874F0] opacity-80" style={{ borderTop: "2px dashed #2874F0" }} />
            <span className="text-[#444] font-medium">Diversion Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}
