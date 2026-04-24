import React from "react";

function InsightTile({ label, value, description }) {
  return (
    <div className="bg-[var(--bg-soft)] p-5 rounded-2xl border border-[var(--line)]">
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)] mb-2">{label}</div>
      <div className="text-base font-black text-[var(--text)]">{value || "—"}</div>
      {description ? <div className="mt-2 text-xs leading-relaxed text-[var(--text-soft)] opacity-80">{description}</div> : null}
    </div>
  );
}

export default function BrandPanel({
  step,
  setStep,
  brandData,
  setBrandData,
  brandResult,
  brandLoading,
  brandErr,
  onAnalyzeBrand,
  categories,
}) {
  if (step === 2) {
    return (
      <section className="surface-card !p-0 overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 border-b border-[var(--line)] lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="section-kicker">Brand profile locked</div>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text)]">@{brandData.company_name || "Brand"}</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-soft)]">
                  This brand snapshot frames the sponsorship fit, AI positioning, and negotiation strategy.
                </p>
              </div>
              <button type="button" onClick={() => setStep(1)} className="btn-secondary !py-2 !px-4 !rounded-xl !text-[10px] tracking-widest uppercase font-black">
                Edit profile
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-wider border border-indigo-500/10">
                Industry · {brandData.industry}
              </span>
              {brandResult?.persona ? (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-500/10">
                  Persona · {brandResult.persona}
                </span>
              ) : null}
            </div>

            <div className="mt-8 p-6 rounded-3xl bg-[var(--accent)]/5 border border-[var(--accent)]/10">
              <div className="section-kicker">Strategy statement</div>
              <p className="mt-3 text-lg font-bold leading-relaxed text-[var(--text)]">
                {brandResult?.strategy_statement ? `“${brandResult.strategy_statement}”` : "The model is framing your strategy..."}
              </p>
            </div>

            <div className="mt-6 p-6 rounded-3xl bg-[var(--bg-soft)] border border-[var(--line)]">
              <div className="section-kicker !text-[var(--text-faint)]">Brand context</div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">
                {brandData.brand_description || "Detailed brand context used for AI rationale."}
              </p>
            </div>
          </div>

          <div className="p-8 bg-[var(--bg-soft)]/30">
            <div className="section-kicker">AI brand readout</div>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)]">Strategic Identity</h3>
            <div className="mt-6 grid gap-4">
              <InsightTile label="Target audience" value={brandResult?.target_audience} description="Segment the brand naturally resonates with." />
              <InsightTile label="Core values" value={brandResult?.core_values} description="Thematic fit brand seeks in partnerships." />
              <div className="p-6 rounded-3xl bg-[var(--bg)] border border-[var(--line)] shadow-sm">
                <div className="section-kicker !text-[var(--text-faint)]">What happens next</div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">
                  Move to Step 2 to test event fit against this brief.
                </p>
                <div className="mt-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Context active
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // STEP 1 UI REFACTORED
  return (
    <section className="surface-card !p-0 overflow-hidden shadow-md border border-[var(--line)]">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        
        {/* Left Side: Context & Benefits */}
        <div className="p-8 lg:p-10 border-b border-[var(--line)] lg:border-b-0 lg:border-r bg-[var(--bg-soft)]/30 flex flex-col justify-center">
          <div className="section-kicker">Step 1 · Brand foundation</div>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--text)] leading-[1.2]">Define the brand you are pitching</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-soft)]">
            Create a rich brand context first so the analysis feels like a premium decision room, not a raw form.
          </p>

          <div className="mt-10 grid gap-6">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-black flex-shrink-0">
                01
              </div>
              <div>
                <p className="text-base font-bold text-[var(--text)]">Better sponsor fit explanation</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">Industry context improves AI-generated positioning.</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-black flex-shrink-0">
                02
              </div>
              <div>
                <p className="text-base font-bold text-[var(--text)]">Persona & messaging alignment</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">The recommendation engine uses these fields later.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <form onSubmit={onAnalyzeBrand} className="p-8 lg:p-10 flex flex-col justify-center bg-[var(--bg)]">
          <div className="space-y-6">
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-soft)] block mb-2">Company name</label>
              <input
                name="company_name"
                value={brandData.company_name}
                onChange={(e) => setBrandData({ ...brandData, company_name: e.target.value })}
                placeholder="e.g. Red Bull India"
                className="input-field w-full"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-soft)] block mb-2">Industry category</label>
              <select
                name="industry"
                value={brandData.industry}
                onChange={(e) => setBrandData({ ...brandData, industry: e.target.value })}
                className="select-field w-full"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-soft)] block mb-2">Brand context & description</label>
              <textarea
                name="brand_description"
                rows="4"
                value={brandData.brand_description || ""}
                onChange={(e) => setBrandData({ ...brandData, brand_description: e.target.value })}
                placeholder="Summarize the brand promise, target audience, tone, and goals."
                className="textarea-field w-full min-h-[120px]"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <button 
              type="submit" 
              disabled={brandLoading} 
              className="btn-primary w-full !py-4"
            >
              {brandLoading ? "Analyzing brand..." : "Generate brand profile →"}
            </button>
            <p className="text-[11px] text-center text-[var(--text-soft)] font-medium opacity-80">
              Profiles are temporarily cached for the current session.
            </p>
          </div>

          {brandErr ? (
            <div className="mt-4 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-bold text-center">
              {brandErr}
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}