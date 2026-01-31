from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import uvicorn
import json
import re
import random
from groq import Groq
import os
from dotenv import load_dotenv

# 1. LOAD SECRETS
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '.env')
load_dotenv(env_path)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("❌ ERROR: GROQ_API_KEY is missing! Make sure you have a .env file.")
else:
    print("✅ API Key loaded successfully.")

app = FastAPI()
client = Groq(api_key=GROQ_API_KEY)

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

try:
    model_path = os.path.join(current_dir, "mp_event_model.pkl")
    artifacts = joblib.load(model_path)
    model = artifacts["model"]
    le_city = artifacts["le_city"]
    le_event = artifacts["le_event"]
    print("✅ ML Model loaded.")
except Exception as e:
    print(f"⚠️ ML Model Warning: {e}")

class BrandInput(BaseModel):
    company_name: str
    industry: str

class EventInput(BaseModel):
    city: str
    event_type: str
    sponsor_category: str
    day_of_week: int
    price: float
    marketing_budget: float
    venue_capacity: int
    temperature: float
    is_raining: int

# --- HELPER: ROBUST JSON EXTRACTOR ---
def extract_json(text):
    try:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match: return json.loads(match.group())
        clean = text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except: return None

def generate_smart_tips(data, attendance, cost_per_head, occupancy, roi_score, synergy_score):
    tips = []
    if synergy_score < 50:
        tips.append(f"⚠️ Low Synergy: {data.sponsor_category} + {data.event_type} is a weak match.")
    elif synergy_score > 85:
        tips.append(f"🔥 Perfect Match: {data.sponsor_category} aligns perfectly with this audience.")
    
    if occupancy < 40:
        tips.append("📉 Low Turnout: Reduce ticket price by 20% to fill seats.")
    elif occupancy > 90:
        tips.append("💰 High Demand: Increase ticket prices to maximize revenue.")
        
    if roi_score < 40:
        tips.append("💸 Overpriced: The sponsorship ask is too high for this crowd size.")
    elif roi_score > 80:
        tips.append("💎 Great Value: The cost per reach is excellent.")
    return tips[:3]

@app.post("/analyze-brand")
def analyze_brand_inference(data: BrandInput):
    ai_analysis = {
        "target_audience": "General Audience", "core_values": "Growth", "persona": "Standard",
        "high_synergy": ["Events"], "strategy_statement": "Maximize visibility."
    }
    
    system_prompt = "You are a backend JSON processor. Output ONLY valid JSON. No Markdown. No Intro."
    prompt = f"Analyze Brand: {data.company_name} ({data.industry}). Return JSON with keys: 'target_audience', 'core_values', 'persona', 'high_synergy', 'strategy_statement'."
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}],
            response_format={"type": "json_object"}, temperature=0.2, max_tokens=1024
        )
        parsed = extract_json(completion.choices[0].message.content)
        if parsed: ai_analysis.update(parsed)
    except Exception as e:
        print(f"❌ Brand AI Error: {e}") 
    
    return ai_analysis

@app.post("/predict")
def predict_sponsorship_final(data: EventInput):
    # 1. PREDICTION
    try:
        city_enc = le_city.transform([data.city])[0]
        event_enc = le_event.transform([data.event_type])[0]
        features = pd.DataFrame([[
            city_enc, event_enc, data.day_of_week, 
            data.price, data.marketing_budget, 
            data.venue_capacity, 
            data.temperature, data.is_raining
        ]], columns=['city', 'event_type', 'day_of_week', 'price', 'marketing_budget', 'venue_capacity', 'temperature', 'is_raining'])
        base_attendance = int(model.predict(features)[0])
    except:
        base_attendance = int(data.venue_capacity * 0.4)

    day_mult = 1.4 if data.day_of_week in [0, 5, 6] and data.event_type in ["Food Festival", "Music Concert"] else 0.8
    predicted_attendance = int(base_attendance * day_mult)
    predicted_attendance = max(10, min(predicted_attendance, data.venue_capacity))

    # 2. REVENUE OPTIMIZER
    price_options = [data.price * 0.8, data.price * 0.9, data.price, data.price * 1.1, data.price * 1.2]
    best_price = data.price
    max_revenue = predicted_attendance * data.price
    optimization_msg = "✅ Your pricing is optimal for maximum revenue."

    for p in price_options:
        try:
            temp_features = features.copy()
            temp_features['price'] = p 
            raw_att = model.predict(temp_features)[0]
            adj_att = int(raw_att * day_mult)
            adj_att = max(10, min(adj_att, data.venue_capacity))
            rev = adj_att * p
            if rev > max_revenue:
                max_revenue = rev
                best_price = p
        except: pass

    if best_price < data.price:
        optimization_msg = f"📉 Opportunity: Lower price to ₹{int(best_price)} to capture volume. (Proj. Revenue: ₹{int(max_revenue):,})"
    elif best_price > data.price:
        optimization_msg = f"📈 Opportunity: Demand is high! You can raise price to ₹{int(best_price)}. (Proj. Revenue: ₹{int(max_revenue):,})"

    # 3. METRICS
    cost_per_head = data.marketing_budget / predicted_attendance if predicted_attendance > 0 else 0
    occupancy = (predicted_attendance / data.venue_capacity) * 100
    
    acceptable_cost = 50 + (data.price * 0.2)
    if cost_per_head <= 1: roi_score = 100
    elif cost_per_head <= acceptable_cost:
        roi_score = 60 + ((acceptable_cost - cost_per_head)/acceptable_cost * 40)
    else:
        roi_score = max(0, 60 - ((cost_per_head - acceptable_cost) * 0.5))

    # 4. AI AGENT (Negotiation + Email + Synergy)
    system_prompt = "You are a Sponsorship Agent. Output ONLY valid JSON."
    
    # NEW: We ask for Negotiation Tips & Email Draft
    prompt = f"""
    Brand: {data.sponsor_category}. Event: {data.event_type} in {data.city}.
    Stats: {predicted_attendance} ppl, ₹{cost_per_head:.2f}/head.
    
    Task:
    1. Synergy Score (0-100).
    2. Analysis (1 sentence).
    3. Verdict (HIGH POTENTIAL / MODERATE / POOR FIT).
    4. Two "Negotiation Points": {{"objection": "Their likely worry", "rebuttal": "Your winning answer"}}.
    5. A "Cold Email": Subject line + Body (Short, professional, mentioning the stats).

    Output Keys: "synergy_score", "analysis", "verdict", "negotiation_points" (list), "cold_email" (string).
    """
    
    ai_resp = {
        "synergy_score": 50, "analysis": "Using logic metrics.", "verdict": "MODERATE", 
        "negotiation_points": [{"objection": "Cost", "rebuttal": "ROI is high."}], 
        "cold_email": "Error generating email."
    }

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}],
            response_format={"type": "json_object"}, temperature=0.4, max_tokens=1024
        )
        parsed = extract_json(completion.choices[0].message.content)
        if parsed: ai_resp = parsed
    except Exception as e: print(f"❌ AI Error: {e}") 

    synergy_score = int(ai_resp.get("synergy_score", 50))
    final_score = int((synergy_score * 0.45) + (roi_score * 0.35) + (occupancy * 0.20))
    verdict = ai_resp.get("verdict", "MODERATE").upper()
    if synergy_score < 40: verdict = "POOR FIT"
    elif final_score > 80: verdict = "HIGH POTENTIAL"

    tips = generate_smart_tips(data, predicted_attendance, cost_per_head, occupancy, roi_score, synergy_score)

    return {
        "attendance": predicted_attendance,
        "final_score": min(final_score, 99),
        "breakdown": {
            "audience_score": int(occupancy),
            "brand_fit_score": synergy_score,
            "cost_score": int(roi_score),
            "cost_per_head": round(cost_per_head, 2)
        },
        "tips": tips,
        "ai_analysis": ai_resp.get("analysis"),
        "verdict": verdict,
        "optimization": optimization_msg,
        "negotiation_points": ai_resp.get("negotiation_points", []), # <--- NEW
        "cold_email": ai_resp.get("cold_email", "")                  # <--- NEW
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)