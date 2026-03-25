"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, GeoJSON, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const tacticalIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#ff3e3e; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #ff3e3e;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const osintIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#f97316; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow: 0 0 15px #f97316;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const droneIcon = L.divIcon({
  className: 'drone-icon',
  html: `<div style="background-color:#050505; color:#00ffd0; width:28px; height:28px; border-radius:50%; border:2px solid #00ffd0; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 20px #00ffd0; font-size:16px; z-index: 9999;">🛸</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// Hardcoded safe zones across India
const NDRF_SAFE_ZONES = [
  { name: "NDRF Base HQ - New Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "NDRF Base - Pune", lat: 18.5204, lng: 73.8567 },
  { name: "NDRF Base - Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "NDRF Base - Guwahati", lat: 26.1445, lng: 91.7362 },
  { name: "NDRF Base - Arakkonam", lat: 13.0827, lng: 79.6670 }
];

function MapClickInterceptor({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng); }
  });
  return null;
}

export default function LiveMap({ signals, onMapClick, macroScan, activeRoute, isPublicView }: any) {
  const [dronePos, setDronePos] = useState<[number, number] | null>(null);
  const [indiaBoundary, setIndiaBoundary] = useState<any>(null);

  // Fetch India's GeoJSON boundary on load
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(res => res.json())
      .then(data => {
        const india = data.features.find((f: any) => f.properties.ADMIN === 'India');
        if (india) setIndiaBoundary(india);
      })
      .catch(err => console.error("Failed to load India boundaries.", err));
  }, []);

  useEffect(() => {
    if (!activeRoute || activeRoute.length < 2) {
      setDronePos(null);
      return;
    }

    let currentSegment = 0;
    let progress = 0;
    const speed = 0.002; 
    let animationFrameId: number;

    const animateDrone = () => {
      if (currentSegment >= activeRoute.length - 1) return; 

      const start = activeRoute[currentSegment];
      const end = activeRoute[currentSegment + 1];

      const lat = start[0] + (end[0] - start[0]) * progress;
      const lng = start[1] + (end[1] - start[1]) * progress;
      
      setDronePos([lat, lng]);
      progress += speed;

      if (progress >= 1) {
        progress = 0;
        currentSegment++;
      }
      animationFrameId = requestAnimationFrame(animateDrone);
    };

    animateDrone();
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeRoute]);

  const parseLocation = (locStr: string): [number, number] | null => {
    if (!locStr || typeof locStr !== 'string' || locStr.includes("Not Provided")) return null;
    const cleanStr = locStr.replace(/Lat:/g, '').replace(/Lng:/g, '');
    const matches = cleanStr.match(/([-+]?[\d.]+)/g);
    if (matches && matches.length >= 2) {
      return [parseFloat(matches[0]), parseFloat(matches[1])];
    }
    return null;
  };

  return (
    <div className="h-full min-h-[400px] w-full border border-[#00ffd0]/40 lg:border-none rounded-b-xl lg:rounded-b-none overflow-hidden relative z-0">
      <MapContainer center={[21.1458, 79.0882]} zoom={4.5} scrollWheelZoom={true} className={`h-full w-full ${isPublicView ? 'bg-blue-50' : 'bg-[#050505]'}`}>
        <MapClickInterceptor onMapClick={onMapClick} />
        <TileLayer 
          url={isPublicView ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
          attribution='© OMNI-GUARD INTEL'
        />

        {/* --- PUBLIC VIEW: GREEN INDIA BASE LAYER --- */}
        {isPublicView && indiaBoundary && (
          <GeoJSON 
            key="india-boundary" 
            data={indiaBoundary} 
            pathOptions={{ 
              fillColor: '#10b981', // Emerald Green
              color: '#059669',     // Darker Green Border
              weight: 2, 
              fillOpacity: 0.25     // 25% opacity so underlying map is visible
            }} 
          />
        )}

        {/* --- PUBLIC VIEW: GREEN SAFE ZONES --- */}
        {isPublicView && NDRF_SAFE_ZONES.map((zone, idx) => (
          <Circle 
            key={`green-zone-${idx}`} 
            center={[zone.lat, zone.lng]} 
            radius={20000} // 20km safe zone radius
            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.6, weight: 2 }}
          >
            <Popup>
              <div className="text-green-800 p-1 font-sans text-xs">
                <p className="font-black border-b border-green-200 mb-1 pb-1">✅ SECURE SAFE ZONE</p>
                <p className="font-bold">{zone.name}</p>
                <p>Proceed here for supplies and shelter.</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* --- PUBLIC VIEW: RED THREAT ZONES (Overlays on Green India) --- */}
        {isPublicView && macroScan && macroScan.incidents && macroScan.incidents.map((incident: any, idx: number) => {
          if (!incident.approx_lat || !incident.approx_lng) return null;
          return (
            <Circle 
              key={`red-zone-${idx}`} 
              center={[incident.approx_lat, incident.approx_lng]} 
              radius={60000} // Realistic 60km hazard radius
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.55, weight: 2 }}
            >
              <Popup>
                <div className="text-red-700 p-1 font-sans text-xs">
                  <p className="font-black border-b border-red-200 mb-1 pb-1">🛑 DANGER ZONE</p>
                  <p className="font-bold">{incident.type}</p>
                  <p>{incident.location}</p>
                  <p className="mt-1">Affected: {incident.dead + incident.injured + incident.trapped_or_missing} People</p>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* ADMIN VIEW: TACTICAL FLIGHT PATH & DRONE */}
        {activeRoute && activeRoute.length > 0 && !isPublicView && (
          <Polyline 
            positions={activeRoute} 
            pathOptions={{ color: '#00ffd0', weight: 3, dashArray: '10, 15', lineCap: 'square', lineJoin: 'round', opacity: 0.5 }} 
          />
        )}

        {dronePos && !isPublicView && (
          <Marker position={dronePos} icon={droneIcon} zIndexOffset={1000}>
            <Popup className="tactical-popup">
              <div className="bg-[#050505] text-[#00ffd0] p-2 border border-[#00ffd0]/50 font-mono text-[10px]">
                <p className="font-bold border-b border-[#00ffd0]/20 mb-1 pb-1">🛸 OMNIGUARD RECON-1</p>
                <p className="italic">Status: En Route to Waypoint</p>
                <p>Telemetry: {dronePos[0].toFixed(4)}, {dronePos[1].toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ADMIN VIEW: ORANGE OSINT PINS */}
        {!isPublicView && macroScan && macroScan.incidents && macroScan.incidents.map((incident: any, idx: number) => {
          if (!incident.approx_lat || !incident.approx_lng) return null;
          return (
            <Marker key={`macro-${idx}`} position={[incident.approx_lat, incident.approx_lng]} icon={osintIcon}>
              <Popup className="tactical-popup">
                <div className="bg-[#050505] text-[#f97316] p-2 border border-[#f97316]/50 font-mono text-[10px] w-48">
                  <p className="font-bold border-b border-[#f97316]/20 mb-1 pb-1">⚠️ OSINT: {incident.type}</p>
                  <p className="text-white font-bold">{incident.location}</p>
                  <p className="mt-1">Dead: {incident.dead} | Inj: {incident.injured}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ADMIN VIEW: INDIVIDUAL SOS SIGNALS */}
        {!isPublicView && signals.map((signal: any) => {
          const coords = parseLocation(signal.location_str);
          if (!coords) return null; 
          return (
            <Marker key={signal.id} position={coords} icon={tacticalIcon}>
              <Popup className="tactical-popup">
                <div className="bg-[#050505] text-[#00ffd0] p-2 border border-[#00ffd0]/50 font-mono text-[10px]">
                  <p className="font-bold border-b border-[#00ffd0]/20 mb-1 pb-1">SIGNAL_ID: {(signal.hashed_id || "Unknown").substring(0,8)}</p>
                  <p className="italic">"{signal.raw_message || "No data"}"</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}