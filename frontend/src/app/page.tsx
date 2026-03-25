"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Phone, Map, ShieldAlert, Send, MapPin, MessageSquare, AlertTriangle, Info } from 'lucide-react';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { 
  ssr: false,
  loading: () => <div className="h-full w-full min-h-[300px] bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 font-mono text-sm">Initializing Satellite Uplink...</div>
});

export default function PublicPortal() {
  const [locationStatus, setLocationStatus] = useState("Click to capture GPS");
  const [reportText, setReportText] = useState(""); 
  const [userEmail, setUserEmail] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{success: boolean, message: string} | null>(null);
  
  const [liveIntel, setLiveIntel] = useState<any>(null);
  const [loadingIntel, setLoadingIntel] = useState(true);

  const emergencyNumber = "917588387675";
  const whatsappTemplate = encodeURI(
    "🚨 EMERGENCY 🚨\n\nI need immediate rescue.\n\n(Please send your LIVE LOCATION and a VOICE NOTE describing the situation and number of people trapped)"
  );
  const whatsappUrl = `https://wa.me/${emergencyNumber}?text=${whatsappTemplate}`;

  useEffect(() => {
    const fetchLiveIntel = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/osint/global-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ region_name: "INDIA", lat: "21.14", lon: "79.08" })
        });
        const data = await res.json();
        setLiveIntel(data);
      } catch (err) {
        console.error("Failed to fetch live intelligence.", err);
      } finally {
        setLoadingIntel(false);
      }
    };
    fetchLiveIntel();
  }, []);

  const captureLocation = () => {
    setLocationStatus("Locating satellite...");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationStatus(`📍 Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
        },
        () => {
          setLocationStatus("GPS Failed. Type manually in description.");
        }
      );
    } else {
      setLocationStatus("Geolocation not supported.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const latMatch = locationStatus.match(/Lat: ([\d.]+)/);
    const lngMatch = locationStatus.match(/Lng: ([\d.]+)/);
    const lat = latMatch ? latMatch[1] : "Unknown";
    const lng = lngMatch ? lngMatch[1] : "Unknown";

    const payload = {
      message: reportText || "Silent report: Immediate assistance required.",
      latitude: lat,
      longitude: lng,
      email: userEmail,
      contact: "Anonymous"
    };

    try {
      const response = await fetch('http://localhost:8000/api/v1/twilio/incoming-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (!data.is_disaster) {
          setSubmissionResult({
            success: true, 
            message: `Report routed to local authorities. Please contact: ${data.contact_info}. An email has been sent to you.`
          });
        } else {
          setSubmissionResult({
            success: true, 
            message: "Report Received. NDRF Rescue assigned. Confirmation email sent."
          });
        }
      }
    } catch (error) {
      console.error("Transmission failed", error);
      setSubmissionResult({success: false, message: "Network failure. Please use WhatsApp."});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-gray-900 font-sans selection:bg-red-200">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col items-center justify-center text-center space-y-3 pt-4 pb-2">
          <div className="inline-flex items-center justify-center p-3 bg-red-100 text-red-600 rounded-2xl mb-2 shadow-sm border border-red-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">OMNI<span className="text-red-600">GUARD</span></h1>
          <p className="text-sm md:text-base font-bold text-gray-500 uppercase tracking-[0.2em]">Public Disaster Response Hub</p>
        </header>

        {/* 2x2 BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

          {/* BOX 1 (TOP LEFT): WHATSAPP FAST-TRACK */}
          <div className="bg-gradient-to-br from-emerald-500 to-green-700 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 opacity-10 transition-transform duration-500 group-hover:scale-110">
              <MessageSquare className="w-64 h-64" />
            </div>
            <div className="relative z-10">
              <span className="bg-white/20 text-white px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase backdrop-blur-md border border-white/20">
                Recommended
              </span>
              <h2 className="font-extrabold text-3xl md:text-4xl mt-6 mb-3 tracking-tight">Fastest Method</h2>
              <p className="text-green-50 text-sm md:text-base max-w-[85%] leading-relaxed font-medium">
                Works offline on 2G/EDGE networks. Send a voice note and your live location directly to our AI Triage engine.
              </p>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 mt-10 bg-white text-green-700 hover:bg-green-50 font-black py-4 px-6 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 text-lg border border-transparent hover:border-green-200"
            >
              <Phone className="w-6 h-6" /> Open Secure WhatsApp
            </a>
          </div>

          {/* BOX 2 (TOP RIGHT): LIVE MAP */}
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col min-h-[400px] lg:min-h-[450px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shadow-sm border border-blue-200">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-red-600 text-lg leading-tight">Live Danger Zones</h2>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">GIS Satellite Uplink</p>
                </div>
              </div>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            </div>
            <div className="flex-1 bg-gray-100 relative">
              <LiveMap signals={[]} isPublicView={true} macroScan={liveIntel ? { incidents: liveIntel.intelligence?.active_incidents || [] } : null} />
            </div>
          </div>

          {/* BOX 3 (BOTTOM LEFT): SILENT WEB REPORT */}
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 md:p-10 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="font-bold text-gray-900 text-2xl mb-2">Silent Web Report</h2>
              <p className="text-sm text-gray-500 font-medium">If you cannot speak or make noise, send a discrete SOS. Our AI will route it immediately.</p>
            </div>
            
            {submissionResult ? (
              <div className={`p-6 rounded-2xl text-center flex flex-col items-center justify-center gap-3 border ${submissionResult.message.includes('routed') ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <ShieldAlert className="w-10 h-10 mb-2 opacity-80" />
                <p className="font-bold leading-relaxed">{submissionResult.message}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Describe Emergency</label>
                  <textarea 
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="E.g., 3 people trapped on roof, water rising... OR Power out for 2 days."
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-all resize-none shadow-inner"
                    rows={3}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Contact Email</label>
                    <input 
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none transition-all shadow-inner"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Your Location</label>
                    <button 
                      type="button" 
                      onClick={captureLocation}
                      className="w-full text-left px-5 py-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-sm font-mono text-gray-600 transition-all flex items-center justify-between group shadow-inner"
                    >
                      <span className="truncate">{locationStatus}</span>
                      <MapPin className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full mt-4 bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-lg disabled:bg-gray-400 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Encrypting & Sending...</span>
                  ) : (
                    <><Send className="w-4 h-4" /> Transmit Rescue Signal</>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* BOX 4 (BOTTOM RIGHT): LIVE REAL-TIME OSINT ALERTS */}
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 md:p-10 flex flex-col h-full max-h-[500px]">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-50 p-3 rounded-2xl border border-red-100 shadow-sm">
                <ShieldAlert className="text-red-600 w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-xl leading-tight">Live Threat Intel (India)</h2>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Auto-updating via Web OSINT</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-5">
              {loadingIntel ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-gray-100 rounded-2xl w-full border border-gray-200"></div>
                  <div className="h-24 bg-gray-100 rounded-2xl w-full border border-gray-200"></div>
                  <div className="flex justify-center mt-2"><span className="text-xs text-gray-400 font-bold tracking-widest uppercase">Fetching Live Data...</span></div>
                </div>
              ) : liveIntel?.intelligence?.active_incidents && liveIntel.intelligence.active_incidents.length > 0 ? (
                liveIntel.intelligence.active_incidents.map((incident: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-200 relative overflow-hidden group">
                    
                    <div className="flex justify-between items-start mb-4 border-b border-gray-200 pb-3">
                      <span className="inline-block px-3 py-1 bg-gray-900 text-white text-[10px] font-black rounded uppercase tracking-widest">
                        {incident.location}
                      </span>
                      <span className="text-[11px] text-gray-500 font-bold bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                        {incident.type}
                      </span>
                    </div>
                    
                    {/* NEW: PROBLEM / SOLUTION UI */}
                    <div className="space-y-3">
                      <div className="bg-white p-3.5 rounded-xl border border-red-100 shadow-sm">
                        <strong className="text-red-700 uppercase text-[10px] tracking-widest flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> 
                          Live Problem / Threat
                        </strong> 
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                          Casulties reported ({incident.dead} Dead, {incident.injured} Injured). {incident.action_taken || "Active severe weather emergency in progress."}
                        </p>
                      </div>

                      <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                        <strong className="text-emerald-700 uppercase text-[10px] tracking-widest flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
                          Solution / Safe Directive
                        </strong> 
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                          {incident.suggested_ndrf_action || "Remain indoors. Ensure phones are charged. If flooded, evacuate to nearest Green Safe Zone."}
                        </p>
                      </div>
                    </div>

                  </div>
                ))
              ) : (
                <div className="bg-green-50 rounded-2xl p-6 border border-green-200 flex flex-col items-center justify-center text-green-700 h-full">
                  <Info className="w-8 h-8 mb-2 opacity-80" />
                  <p className="font-bold text-center">No major regional threats detected via OSINT at this time.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}