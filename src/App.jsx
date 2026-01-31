import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BACKGROUND_IMAGE_URL = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"; 

function App() {
  const [step, setStep] = useState(1); 
  const evaluateRef = useRef(null); 

  const [brandData, setBrandData] = useState({ company_name: '', industry: '' });
  const [brandResult, setBrandResult] = useState(null);
  const [brandLoading, setBrandLoading] = useState(false);

  const [dealData, setDealData] = useState({
    city: 'Indore', event_type: 'Food Festival', 
    date: '', price: 100, marketing_budget: 5000, venue_capacity: 500, temperature: 30, is_raining: 0,
  });
  const [dealResult, setDealResult] = useState(null);
  const [dealLoading, setDealLoading] = useState(false);

  const CITIES = ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Ujjain', 'Satna', 'Rewa'];
  const EVENT_TYPES = ['Food Festival', 'Music Concert', 'Tech Meetup', 'Standup Comedy', 'Cricket Screening', 'Religious/Cultural'];

  const handleBrandChange = (e) => setBrandData({ ...brandData, [e.target.name]: e.target.value });
  const handleDealChange = (e) => setDealData({ ...dealData, [e.target.name]: e.target.value });
  const handlePrint = () => window.print();

  const renderValue = (val) => {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === 'object') {
        if (val.name && val.occupation) return `${val.name} (${val.occupation}, ${val.age})`;
        return Object.values(val).join(", ");
    }
    return val;
  };

  const submitBrand = async (e) => {
    e.preventDefault();
    setBrandLoading(true);
    try {
        const res = await axios.post('http://127.0.0.1:8000/analyze-brand', brandData);
        setBrandResult(res.data);
        setStep(2); 
        setTimeout(() => evaluateRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (err) { console.error(err); } 
    finally { setBrandLoading(false); }
  };

  const submitDeal = async (e) => {
    e.preventDefault();
    setDealLoading(true); setDealResult(null);
    const dateObj = new Date(dealData.date);
    try {
        const res = await axios.post('http://127.0.0.1:8000/predict', {
            ...dealData,
            sponsor_category: `${brandData.company_name} (${brandData.industry})`, 
            day_of_week: isNaN(dateObj.getDay()) ? 6 : dateObj.getDay(),
            price: Number(dealData.price)||0, marketing_budget: Number(dealData.marketing_budget)||0,
            venue_capacity: Number(dealData.venue_capacity)||0,
        });
        setDealResult(res.data);
    } catch (err) { console.error(err); } 
    finally { setDealLoading(false); }
  };

  const safe = (val) => Number(val) || 0;
  const glassCard = "bg-white/95 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl transition-all duration-300";
  const score = safe(dealResult?.final_score);
  const bd = dealResult?.breakdown || {};
  
  const getColor = (s) => s < 45 ? "text-red-500" : s < 75 ? "text-yellow-500" : "text-green-500";
  const getBg = (s) => s < 45 ? "bg-red-500" : s < 75 ? "bg-yellow-500" : "bg-green-500";
  const r = 80, circ = 2 * Math.PI * r;
  const offset = circ - ((score / 100) * circ);

  return (
    <div className="min-h-screen font-sans bg-cover bg-center text-slate-800" style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}>
      <div className="absolute inset-0 bg-indigo-900/80 backdrop-blur-sm fixed"></div>

      <header className="relative z-10 py-8 text-center print:hidden">
         <h1 className="text-5xl font-black text-white drop-shadow-lg mb-2">Sponsor<span className="text-yellow-400">Wise</span></h1>
         <p className="text-indigo-200 font-medium">AI-Powered Sponsorship Intelligence</p>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20 space-y-8">
        
        {/* STEP 1 */}
        <div className={`${glassCard} overflow-hidden print:hidden`}>
            <div className="bg-indigo-50/50 p-6 border-b border-indigo-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2"><span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span> Brand Profile</h2>
                {step === 2 && <button onClick={() => setStep(1)} className="text-xs text-indigo-600 font-bold hover:underline">Edit</button>}
            </div>
            {step === 2 ? (
                <div className="p-8 bg-white grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h3 className="text-3xl font-black text-indigo-900">{brandData.company_name}</h3>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-500">{brandData.industry}</span>
                            <span className="bg-yellow-100 px-2 py-1 rounded text-xs font-bold text-yellow-700">Persona: {renderValue(brandResult?.persona)}</span>
                        </div>
                        <p className="text-slate-600 mt-4 italic">"{renderValue(brandResult?.strategy_statement)}"</p>
                    </div>
                    <div className="space-y-3">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">AI Detected Audience</p>
                            <p className="font-bold text-slate-700">{renderValue(brandResult?.target_audience)}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">AI Detected Values</p>
                            <p className="font-bold text-slate-700">{renderValue(brandResult?.core_values)}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={submitBrand} className="p-8"><div className="grid md:grid-cols-2 gap-5 mb-5"><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Company Name</label><input name="company_name" onChange={handleBrandChange} className="w-full p-4 border-2 border-slate-200 rounded-xl font-bold outline-none" /></div><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Industry</label><input name="industry" onChange={handleBrandChange} className="w-full p-4 border-2 border-slate-200 rounded-xl font-bold outline-none" /></div></div><button disabled={brandLoading} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">{brandLoading ? "Analyzing..." : "Generate Profile"}</button></form>
            )}
        </div>

        {/* STEP 2 */}
        {step === 2 && (
            <div ref={evaluateRef} className={`${glassCard} p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 print:shadow-none print:border-none`}>
                <div className="mb-8 border-b border-slate-200 pb-4 print:hidden"><h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2"><span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span> Evaluate Deal</h2></div>
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* INPUT SIDE */}
                    <div className="lg:col-span-4 space-y-4 print:hidden">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Event Type</label>
                            <select name="event_type" value={dealData.event_type} onChange={handleDealChange} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold outline-none cursor-pointer">
                                {EVENT_TYPES.map(o=><option key={o}>{o}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">City</label>
                            <select name="city" value={dealData.city} onChange={handleDealChange} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold outline-none cursor-pointer">
                                {CITIES.map(o=><option key={o}>{o}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Date</label><input type="date" name="date" onChange={handleDealChange} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold outline-none" /></div><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Ask (₹)</label><input type="number" name="marketing_budget" onChange={handleDealChange} value={dealData.marketing_budget} className="w-full p-3 border-2 border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl font-black outline-none" /></div></div>
                        <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Price</label><input type="number" name="price" onChange={handleDealChange} value={dealData.price} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold outline-none" /></div><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Capacity</label><input type="number" name="venue_capacity" onChange={handleDealChange} value={dealData.venue_capacity} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold outline-none" /></div></div>
                        <button onClick={submitDeal} disabled={dealLoading} className="w-full py-4 bg-indigo-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition">{dealLoading ? "Consulting AI..." : "Check Viability"}</button>
                    </div>

                    {/* RESULTS SIDE */}
                    <div className="lg:col-span-8 w-full">
                        {dealResult ? (
                            <div className="h-full flex flex-col">
                                <div className="flex items-center gap-8 mb-8">
                                    <div className="relative w-40 h-40 flex-shrink-0">
                                        <svg className="w-full h-full" viewBox="0 0 200 200"><circle className="text-slate-100" strokeWidth="15" stroke="currentColor" fill="transparent" r={r} cx="100" cy="100" /><circle stroke={score < 50 ? "#ef4444" : score < 75 ? "#eab308" : "#22c55e"} strokeWidth="15" strokeLinecap="round" fill="transparent" r={r} cx="100" cy="100" style={{ strokeDasharray: circ, strokeDashoffset: offset, transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'all 1s' }} /></svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className={`text-4xl font-black ${getColor(score)}`}>{score}%</span></div>
                                    </div>
                                    <div>
                                        <h3 className={`text-3xl font-black uppercase ${getColor(score)}`}>{dealResult.verdict}</h3>
                                        <p className="text-slate-500 text-sm font-medium mt-1 mb-2">Based on Synergy, Crowd, & Cost</p>
                                        <div className="flex gap-2">
                                            {dealResult.factors?.map((f,i)=><span key={i} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100">{f}</span>)}
                                        </div>
                                    </div>
                                </div>

                                {/* REVENUE OPTIMIZER */}
                                {dealResult.optimization && !dealResult.optimization.includes("optimal") && (
                                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-xl text-white shadow-lg mb-6 flex items-center gap-4 animate-pulse print:border print:border-indigo-600 print:text-indigo-900 print:bg-none print:animate-none">
                                        <span className="text-2xl">🚀</span>
                                        <div>
                                            <p className="text-xs font-bold uppercase opacity-80">AI Revenue Recommendation</p>
                                            <p className="font-bold text-sm">{dealResult.optimization}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-5 mb-6">
                                    <div className="flex items-center gap-4 text-sm font-bold text-slate-700">
                                        <div className="w-32">Crowd ({safe(dealResult.attendance)})</div>
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{width: `${safe(bd.audience_score)}%`}}></div></div>
                                        <div className="w-8 text-right">{safe(bd.audience_score)}</div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm font-bold text-slate-700">
                                        <div className="w-32 text-indigo-600">Brand Synergy</div>
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full"><div className={`h-full ${getBg(safe(bd.brand_fit_score))} rounded-full`} style={{width: `${safe(bd.brand_fit_score)}%`}}></div></div>
                                        <div className="w-8 text-right">{safe(bd.brand_fit_score)}</div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm font-bold text-slate-700">
                                        <div className="w-32">Cost Efficiency</div>
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full"><div className={`h-full ${getBg(safe(bd.cost_score))} rounded-full`} style={{width: `${safe(bd.cost_score)}%`}}></div></div>
                                        <div className="w-8 text-right">{safe(bd.cost_score)}</div>
                                    </div>
                                </div>
                                
                                {/* NEW: NEGOTIATION BATTLE CARDS */}
                                {dealResult.negotiation_points && dealResult.negotiation_points.length > 0 && (
                                    <div className="mb-6 grid grid-cols-1 gap-4">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase">🛡️ Negotiation Battle Plan</h4>
                                        {dealResult.negotiation_points.map((p, i) => (
                                            <div key={i} className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                                                <div className="flex items-start gap-3 mb-2">
                                                    <span className="bg-orange-200 text-orange-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Expect Objection</span>
                                                    <p className="text-sm font-bold text-orange-900">"{p.objection}"</p>
                                                </div>
                                                <div className="flex items-start gap-3 pl-4 border-l-2 border-green-300">
                                                    <span className="text-green-600 text-lg">✅</span>
                                                    <p className="text-sm text-slate-600 italic">"Say this: {p.rebuttal}"</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* NEW: EMAIL DRAFTER */}
                                {dealResult.cold_email && (
                                    <div className="bg-slate-800 p-6 rounded-2xl text-slate-200 mb-6 print:border print:border-slate-300 print:text-black print:bg-white">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">✉️ Official Outreach Draft</h4>
                                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{dealResult.cold_email}</pre>
                                        <button onClick={() => navigator.clipboard.writeText(dealResult.cold_email)} className="mt-4 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-xs font-bold text-white print:hidden">Copy to Clipboard</button>
                                    </div>
                                )}

                                {/* DOWNLOAD BUTTON */}
                                <button onClick={handlePrint} className="mt-4 text-xs font-bold text-slate-400 hover:text-indigo-600 underline print:hidden">
                                    📄 Download Official Report
                                </button>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold p-10 text-center">Fill details to see the Magic Gauge.</div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

export default App;