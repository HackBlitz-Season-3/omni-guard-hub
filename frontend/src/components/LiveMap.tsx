"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Next.js Leaflet icon bug
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const criticalIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Helper component to capture map clicks
function MapClickInterceptor({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

interface LiveMapProps {
  signals: any[];
  isPublicView?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  macroScan?: { lat: number; lng: number; threatLevel: string } | null;
}

export default function LiveMap({ signals, isPublicView = false, onMapClick, macroScan }: LiveMapProps) {
  const centerPosition: [number, number] = [21.1458, 79.0882]; 

  const safeZones = [
    { id: 1, lat: 21.1500, lng: 79.0900, radius: 400, name: "Govt Hospital Relief Camp" },
    { id: 2, lat: 21.1350, lng: 79.0800, radius: 600, name: "High-Ground School Shelter" }
  ];

  const parseLocation = (locStr: string): [number, number] | null => {
    if (!locStr || locStr.includes("Not Provided")) return null;
    const matches = locStr.match(/([\d.-]+)/g);
    if (matches && matches.length >= 2) {
      return [parseFloat(matches[0]), parseFloat(matches[1])];
    }
    return null;
  };

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border-2 border-gray-700 z-0 relative cursor-crosshair">
      <MapContainer 
        center={centerPosition} 
        zoom={3} // Zoomed out to see the world for global scanning
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <MapClickInterceptor onMapClick={onMapClick} />
        
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        {/* Render Global Macro Scan Radar Zone */}
        {macroScan && (
          <Circle 
            center={[macroScan.lat, macroScan.lng]} 
            radius={250000} // 250km radius for a massive regional scan
            pathOptions={{ 
              color: macroScan.threatLevel === 'DEFCON 1' ? '#ef4444' : macroScan.threatLevel === 'DEFCON 3' ? '#f97316' : '#10b981', 
              fillColor: macroScan.threatLevel === 'DEFCON 1' ? '#ef4444' : macroScan.threatLevel === 'DEFCON 3' ? '#f97316' : '#10b981', 
              fillOpacity: 0.3 
            }}
          >
            <Popup>
              <div className="text-gray-900 font-sans">
                <strong>📡 God's Eye Radar</strong><br/>
                Threat Level: {macroScan.threatLevel}
              </div>
            </Popup>
          </Circle>
        )}

        {/* Render Safe Zones */}
        {safeZones.map(zone => (
          <Circle key={zone.id} center={[zone.lat, zone.lng]} radius={zone.radius} pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.4 }}>
            <Popup><strong>✅ {zone.name}</strong><br/>Verified Safe Zone</Popup>
          </Circle>
        ))}

        {/* Render Distress Signals */}
        {signals.map((signal) => {
          const coords = parseLocation(signal.location_str);
          if (!coords) return null;

          return (
            <Marker key={signal.id} position={coords} icon={signal.severity === 'CRITICAL' ? criticalIcon : defaultIcon}>
              <Popup>
                <div className="text-gray-900 font-sans">
                  <h3 className="font-bold text-red-600 mb-1">{signal.severity} ALERT</h3>
                  {!isPublicView ? (
                    <>
                      <p className="text-xs italic mb-2">"{signal.raw_message}"</p>
                      <div className="bg-gray-100 p-2 rounded text-xs border border-gray-300">
                        <span className="font-bold text-blue-600">OSINT Truth Score: {signal.truth_verification_score}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-600">Active Rescue Operation Area. AVOID.</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}