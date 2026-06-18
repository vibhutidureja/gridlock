"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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
  // The Mappls MapMyIndia REST API is returning a 401 Unauthorized for direct tile access.
  // This typically happens because Mappls requires OAuth Bearer tokens for modern SDKs.
  // For this beautiful dark dashboard, we will default to the open CartoDB Dark Matter tiles.
  const tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";

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
      </MapContainer>
    </div>
  );
}
