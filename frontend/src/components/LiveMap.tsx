"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Red icon for User SOS Webhooks
const tacticalIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#ff3e3e; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #ff3e3e;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Orange/Yellow icon for Macro OSINT Disasters
const osintIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#f97316; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow: 0 0 15px #f97316;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

function MapClickInterceptor({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng); }
  });
  return null;
}

export default function LiveMap({ signals, onMapClick, macroScan }: any) {
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
    <div className="h-[500px] w-full border border-[#00ffd0]/40 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,255,208,0.15)] relative z-0">
      <MapContainer center={[21.1458, 79.0882]} zoom={4} scrollWheelZoom={true} className="h-full w-full bg-[#050505]">
        <MapClickInterceptor onMapClick={onMapClick} />
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OMNI-GUARD INTEL'
        />

        {/* PLOT 1: OSINT MACRO DISASTERS (Orange) */}
        {macroScan && macroScan.incidents && macroScan.incidents.map((incident: any, idx: number) => {
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

        {/* PLOT 2: INDIVIDUAL SOS SIGNALS (Red) */}
        {signals.map((signal: any) => {
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