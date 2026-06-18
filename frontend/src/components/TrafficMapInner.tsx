"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

// Fix for default marker icons in Leaflet with webpack
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function TrafficMapInner({ events }: { events: any[] }) {
  const mapKey = process.env.NEXT_PUBLIC_MAPMYINDIA_API_KEY;
  const tileUrl = mapKey && mapKey !== "dummy" 
    ? `https://apis.mapmyindia.com/advancedmaps/v1/${mapKey}/retina_map/{z}/{x}/{y}.png`
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";


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

        {/* Generate Simulated Traffic Shockwave Polylines (Red/Orange) */}
        {events.map((event, idx) => {
          let lat = 12.9716;
          let lon = 77.5946;
          if (event.location && event.location.startsWith("POINT(")) {
            const coords = event.location.replace("POINT(", "").replace(")", "").split(" ");
            lon = parseFloat(coords[0]);
            lat = parseFloat(coords[1]);
          }

          const sev = event.predicted_severity || 5.0;
          const lineColor = sev > 7 ? "#ef4444" : "#f97316"; // Red or Orange
          
          // Create a fake traffic line extending from the event
          const trafficLine: [number, number][] = [
            [lat, lon],
            [lat + (Math.random() - 0.5) * 0.02, lon + (Math.random() - 0.5) * 0.02],
            [lat + (Math.random() - 0.5) * 0.03, lon + (Math.random() - 0.5) * 0.03]
          ];

          return (
            <Polyline 
              key={`line-${event.id || idx}`} 
              positions={trafficLine} 
              pathOptions={{ color: lineColor, weight: sev > 7 ? 5 : 3, opacity: 0.8 }} 
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
