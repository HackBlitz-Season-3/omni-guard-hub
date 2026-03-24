"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false, loading: () => <div className="h-[400px] bg-gray-900 animate-pulse rounded-xl border-2 border-gray-800 flex items-center justify-center text-gray-500">Initializing GIS Satellites...</div> });

export default function AdminDashboard() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // MACRO SCANNER STATE
  const [macroData, setMacroData] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanRegion, setScanRegion] = useState("Click on the map to set target");
  const [scanLat, setScanLat] = useState("");
  const [scanLng, setScanLng] = useState("");
  const [lastScannedLocation, setLastScannedLocation] = useState<{lat: number, lng: number} | null>(null);

  const fetchSignals = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/twilio/signals');
      const json = await res.json();
      if (json.data) setSignals(json.data);
    } catch (error) {
      console.error("Failed to fetch signals", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const handleDispatch = async (signal: any) => {
    const isConfirmed = confirm(`Dispatch rescue and send email alert for ${signal.hashed_id}?`);
    if (!isConfirmed) return;
    try {
      await fetch('http://localhost:8000/api/v1/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: ["shivarkarvedant@gmail.com"],
          severity: signal.severity,
          location: signal.location_str,
          message: `UNIT DEPLOYED for: "${signal.raw_message}"`,
          instructions: `OSINT Data: ${signal.osint_context}. Proceed with caution.`
        })
      });
      alert('✅ Rescue unit dispatched and email sent.');
    } catch (err) {
      alert('❌ Failed to dispatch email.');
    }
  };

  // NEW: Handle clicks directly on the map
  const handleMapClick = async (lat: number, lng: number) => {
    setScanLat(lat.toFixed(4));
    setScanLng(lng.toFixed(4));
    setScanRegion("Triangulating Region...");
    
    // Free Reverse Geocoding via OpenStreetMap
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      const area = data.address?.country || data.address?.state || data.address?.city || `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`;
      setScanRegion(area);
    } catch (error) {
      setScanRegion(`Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`);
    }
  };

  const runMacroScan = async () => {
    if (!scanLat || !scanLng) {
      alert("Please click on the map first to select a target zone.");
      return;
    }
    setIsScanning(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/osint/global-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region_name: scanRegion, lat: scanLat, lon: scanLng })
      });
      const json = await res.json();
      setMacroData(json);
      setLastScannedLocation({ lat: parseFloat(scanLat), lng: parseFloat(scanLng) });
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const getBannerStyle = () => {
    if (!macroData) return { bg: "bg-blue-900/20", border: "border-blue-500", text: "text-blue-400" };
    const threat = macroData.intelligence.threat_level;
    if (threat === "DEFCON 1") return { bg: "bg-red-900/30", border: "border-red-500", text: "text-red-400" };
    if (threat === "DEFCON 3") return { bg: "bg-orange-900/30", border: "border-orange-500", text: "text-orange-400" };
    return { bg: "bg-green-900/20", border: "border-green-500", text: "text-green-400" };
  };

  const bannerStyle = getBannerStyle();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      
      {/* GOD'S EYE RADAR: DYNAMIC MACRO SCANNER */}
      <div className={`w-full border-l-4 p-4 mb-6 rounded shadow-lg transition-colors duration-500 ${bannerStyle.bg} ${bannerStyle.border}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h4 className={`font-bold text-sm uppercase tracking-wider ${bannerStyle.text}`}>
              {macroData ? `GLOBAL OSINT ASSESSMENT: ${macroData.region.toUpperCase()} [${macroData.intelligence.threat_level}]` : "GLOBAL OSINT RADAR: IDLE"}
            </h4>
            <p className="text-xs text-gray-300 mt-1 max-w-4xl leading-relaxed">
              {macroData 
                ? <><strong className="text-white">Hazard: {macroData.intelligence.primary_hazard} (Confidence: {macroData.intelligence.confidence_score}).</strong> {macroData.intelligence.executive_summary}</>
                : "Standby. Click anywhere on the map to set a target coordinates, then execute a macro-level News, Weather, and Social Media threat assessment."}
            </p>
          </div>
          
          {/* Scanner Controls */}
          <div className="flex items-center gap-2 bg-gray-900/80 p-2 rounded border border-gray-700">
            <input type="text" readOnly value={scanRegion} className="bg-gray-800 text-xs px-2 py-1.5 rounded w-40 border border-gray-700 text-gray-400" />
            <input type="text" readOnly value={scanLat} placeholder="Lat" className="bg-gray-800 text-xs px-2 py-1.5 rounded w-20 border border-gray-700 text-gray-400" />
            <input type="text" readOnly value={scanLng} placeholder="Lng" className="bg-gray-800 text-xs px-2 py-1.5 rounded w-20 border border-gray-700 text-gray-400" />
            <button 
              onClick={runMacroScan} 
              disabled={isScanning || !scanLat}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap"
            >
              {isScanning ? "Scanning..." : "📡 Run Sweep"}
            </button>
          </div>
        </div>
      </div>

      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">OmniGuard Command</h1>
        </div>
        <button onClick={fetchSignals} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded text-sm font-bold transition-colors border border-gray-700">Force Sync Local Data</button>
      </header>

      {/* SPLIT VIEW: MAP & TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT: GIS MAP */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live Map Intelligence</h2>
          <LiveMap 
            signals={signals} 
            isPublicView={false} 
            onMapClick={handleMapClick}
            macroScan={macroData && lastScannedLocation ? {
              lat: lastScannedLocation.lat,
              lng: lastScannedLocation.lng,
              threatLevel: macroData.intelligence.threat_level
            } : null}
          />
          <p className="text-xs text-gray-500 italic">Click anywhere on the map to set target coordinates for the God's Eye radar.</p>
        </div>

        {/* RIGHT: DATA TABLE */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-300">Individual Triage Pipeline</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-y-auto max-h-[400px] shadow-2xl custom-scrollbar">
            {loading ? (
               <div className="p-10 text-center text-gray-500 font-mono text-sm">Decrypting Intelligence...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-950 border-b border-gray-800 z-10">
                  <tr className="text-gray-400 text-xs uppercase tracking-widest">
                    <th className="p-4 font-semibold">Intelligence Stream</th>
                    <th className="p-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {signals.map((signal) => (
                    <tr key={signal.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${signal.severity === 'CRITICAL' ? 'bg-red-900/30 text-red-400 border border-red-800/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : signal.severity === 'WARNING' ? 'bg-orange-900/30 text-orange-400 border border-orange-800/50' : 'bg-blue-900/30 text-blue-400 border border-blue-800/50'}`}>
                            {signal.severity}
                          </span>
                          <span className="text-emerald-400 font-mono text-[11px] bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50">Truth: {signal.truth_verification_score}</span>
                        </div>
                        <p className="text-gray-200 font-medium truncate max-w-sm">"{signal.raw_message}"</p>
                        <p className="text-[11px] text-gray-500 mt-1.5 uppercase tracking-wide leading-relaxed">{signal.osint_context}</p>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <button 
                          onClick={() => handleDispatch(signal)}
                          className="bg-blue-600/90 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-95 border border-blue-500/50"
                        >
                          Deploy Unit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {signals.length === 0 && (
                     <tr>
                        <td colSpan={2} className="p-8 text-center text-gray-600 font-mono text-xs">NO ACTIVE LOCAL SIGNALS DETECTED</td>
                     </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}