"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState, useRef, Fragment } from "react";

// Fix for default marker icons in Leaflet with webpack
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TrafficMapInner({ events }: { events: any[] }) {
  const mapKey = process.env.NEXT_PUBLIC_MAPMYINDIA_API_KEY;
  const tileUrl = mapKey && mapKey !== "dummy" 
    ? `https://apis.mapmyindia.com/advancedmaps/v1/${mapKey}/retina_map/{z}/{x}/{y}.png`
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";

  const [shockwaves, setShockwaves] = useState<Record<string, [number, number][][]>>({});
  const fetchedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchRoutes = async () => {
      const newShockwaves: Record<string, [number, number][][]> = {};
      
      for (const event of events) {
        if (fetchedIds.current.has(event.id)) continue; // Already fetched
        fetchedIds.current.add(event.id);
        
        let lat = 12.9716;
        let lon = 77.5946;
        if (event.location && event.location.startsWith("POINT(")) {
          const coords = event.location.replace("POINT(", "").replace(")", "").split(" ");
          lon = parseFloat(coords[0]);
          lat = parseFloat(coords[1]);
        }
        
        // Pick 3 pseudo-random branches to simulate outward traffic jam spread
        // We use the event ID string to seed the randomness so it is consistent
        const seed = event.id ? event.id.charCodeAt(0) % 10 : 5;
        const dist = 0.015 + (seed * 0.001); // Approx 1.5 - 2.5 km
        
        const branches = [
          [lat + dist, lon + dist], // North East
          [lat - dist, lon + (dist/2)], // South East
          [lat + (dist/2), lon - dist]  // North West
        ];
        
        const paths: [number, number][][] = [];
        
        try {
          await Promise.all(branches.map(async (branch) => {
             const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon},${lat};${branch[1]},${branch[0]}?overview=full&geometries=geojson`);
             const data = await res.json();
             if (data.routes && data.routes.length > 0) {
                 // OSRM returns [lon, lat], Leaflet Polyline needs [lat, lon]
                 const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
                 paths.push(coords);
             }
          }));
        } catch (e) {
          console.error("OSRM fetch failed", e);
        }
        newShockwaves[event.id] = paths;
      }
      
      if (Object.keys(newShockwaves).length > 0) {
        setShockwaves(prev => ({...prev, ...newShockwaves}));
      }
    };
    
    fetchRoutes();
  }, [events]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden glass-card border-[var(--color-card-border)] relative z-10">
      <MapContainer 
        center={[12.9716, 77.5946]} // Default to Bangalore
        zoom={12} 
        style={{ height: "100%", width: "100%", background: "transparent" }}
        attributionControl={false}
      >
        <TileLayer url={tileUrl} />
        
        {events.map((event) => {
          // Parse POINT(lon lat) to [lat, lon]
          let lat = 12.9716;
          let lon = 77.5946;
          if (event.location && event.location.startsWith("POINT(")) {
            const coords = event.location.replace("POINT(", "").replace(")", "").split(" ");
            lon = parseFloat(coords[0]);
            lat = parseFloat(coords[1]);
          }

          return (
            <Marker key={event.id} position={[lat, lon]} icon={icon}>
              <Popup className="custom-popup">
                <div className="text-sm font-semibold text-gray-900">
                  {event.event_type} - {event.zone}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Severity: {event.predicted_severity?.toFixed(1)}/10
                </div>
                <div className="text-xs text-gray-600">
                  Resolution: {event.predicted_resolution_time_mins} mins
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Generate Simulated Traffic Shockwave Polylines snapped to real roads */}
        {events.map((event, idx) => {
          const sev = event.predicted_severity || 5.0;
          const lineColor = sev > 7 ? "#ef4444" : "#f97316"; // Red or Orange
          
          const eventPaths = shockwaves[event.id] || [];

          return (
            <Fragment key={`group-${event.id || idx}`}>
              {eventPaths.map((path, pathIdx) => (
                <Polyline 
                  key={`line-${event.id || idx}-${pathIdx}`} 
                  positions={path} 
                  pathOptions={{ color: lineColor, weight: sev > 7 ? 5 : 4, opacity: 0.85 }} 
                />
              ))}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
