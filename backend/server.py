"""
MedConnect AI Backend v3
FastAPI + Anthropic Claude API for medical transcript processing.
Claude Sonnet provides superior extraction accuracy for medical data.

Setup:
  1. Get API key: https://console.anthropic.com/settings/keys
  2. pip install -r requirements.txt
  3. ANTHROPIC_API_KEY=sk-ant-xxx python server.py

Deploy (Render):
  Set ANTHROPIC_API_KEY in environment variables.
"""

import json, re, os
import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="MedConnect AI", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-20250514"

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


# ── Models ──

class PatientInfo(BaseModel):
    full_name: str = ""
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_sat: Optional[float] = None
    allergies: Optional[list[str]] = []
    medical_history: Optional[str] = None

class DoctorInfo(BaseModel):
    full_name: str = ""
    specialization: Optional[str] = None

class SOAPRequest(BaseModel):
    transcript: str
    patient: PatientInfo

class PrescriptionRequest(BaseModel):
    transcript: str
    patient: PatientInfo
    doctor: DoctorInfo = DoctorInfo()

class Medication(BaseModel):
    medication_name: str
    dosage: str = ""
    frequency: str = ""
    duration: str = ""
    route: str = "oral"
    instructions: str = ""

class SOAPResponse(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str
    icd_codes: list[str] = []
    follow_up_days: int = 14

class PrescriptionResponse(BaseModel):
    diagnosis: str
    medications: list[Medication] = []
    notes: str = ""
    follow_up_days: int = 7


# ══════════════════════════════════════════════════════════════
# CLAUDE API
# ══════════════════════════════════════════════════════════════

def query_claude(system: str, user_prompt: str) -> str:
    """Call Claude API and return the response text."""
    if not client:
        raise HTTPException(503, "ANTHROPIC_API_KEY not set.")

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=0.0,  # deterministic for structured extraction
        )
        return response.content[0].text
    except anthropic.AuthenticationError:
        raise HTTPException(401, "Invalid Anthropic API key.")
    except anthropic.RateLimitError:
        raise HTTPException(429, "Anthropic rate limit hit. Try again shortly.")
    except Exception as e:
        raise HTTPException(500, f"Claude API error: {str(e)}")


def extract_json(text: str) -> dict:
    """Robustly extract JSON from Claude's response."""
    # Strategy 1: Find outermost balanced braces
    depth = 0; start = -1
    for i, ch in enumerate(text):
        if ch == '{':
            if depth == 0: start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and start != -1:
                candidate = text[start:i+1]
                candidate = re.sub(r',\s*([}\]])', r'\1', candidate)
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    start = -1; continue

    # Strategy 2: Strip markdown fences
    cleaned = text.strip()
    for prefix in ["```json", "```JSON", "```"]:
        if cleaned.startswith(prefix): cleaned = cleaned[len(prefix):]
    if cleaned.endswith("```"): cleaned = cleaned[:-3]
    try:
        return json.loads(cleaned.strip())
    except:
        return {}


# ══════════════════════════════════════════════════════════════
# PRESCRIPTION ENDPOINT
# ══════════════════════════════════════════════════════════════

PRESCRIPTION_SYSTEM = """You are an expert medical scribe AI. Your job is to extract structured prescription data from a doctor-patient consultation transcript.

You MUST output ONLY a valid JSON object. No markdown fences, no explanation, no preamble — just raw JSON.

The JSON schema is:
{
  "diagnosis": "Primary diagnosis as a clear clinical statement",
  "medications": [
    {
      "medication_name": "Drug name (capitalize first letter)",
      "dosage": "Exact dose with unit, e.g. '20mg', '500mg', '1g', '5ml'",
      "frequency": "Exactly one of: 'Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Once daily (morning)', 'Once daily (bedtime)'",
      "duration": "e.g. '7 days', '14 days', '2 weeks', '1 month', 'Ongoing'",
      "route": "Exactly one of: 'oral', 'topical', 'injection', 'inhalation', 'sublingual', 'rectal', 'ophthalmic', 'nasal', 'transdermal'",
      "instructions": "Specific instructions like 'Take before breakfast', 'Take 30 minutes before meals', 'Take with food', 'Take on empty stomach'. Include tablet/capsule form if mentioned."
    }
  ],
  "notes": "All lifestyle advice, dietary restrictions, warning signs, and non-medication instructions. Combine into a clear paragraph.",
  "follow_up_days": 14
}

CRITICAL RULES:
1. Extract EVERY medication mentioned in the transcript — do not skip any.
2. Convert spoken dosages to standard format: "twenty milligrams" → "20mg", "one gram" → "1g".
3. Convert spoken frequencies: "twice a day" → "Twice daily", "three times a day" → "Three times daily".
4. Capture ALL special instructions: timing relative to meals, warnings, maximum doses.
5. Put dietary advice, lifestyle changes, and red-flag warnings in "notes" — not in medication instructions.
6. For follow_up_days, extract the exact number from the transcript. "two weeks" = 14, "one week" = 7, "one month" = 30.
7. If a medication detail is not explicitly stated, use empty string "" — never guess.
8. The diagnosis should be a clear medical assessment, not just "stomach pain" but the actual clinical diagnosis like "Acute gastritis".
"""


@app.post("/api/prescription", response_model=PrescriptionResponse)
async def api_prescription(req: PrescriptionRequest):
    """Generate a prescription from a consultation transcript."""
    p = req.patient
    allergies = ", ".join(p.allergies) if p.allergies else "No known allergies"

    user_prompt = f"""Extract the prescription from this consultation transcript.

PATIENT INFO:
- Name: {p.full_name or 'Unknown'}
- Age: {p.age or 'N/A'}
- Gender: {p.gender or 'N/A'}
- Allergies: {allergies}

DOCTOR INFO:
- Name: {req.doctor.full_name or 'N/A'}
- Specialization: {req.doctor.specialization or 'General Practice'}

CONSULTATION TRANSCRIPT:
\"\"\"
{req.transcript}
\"\"\"

Extract all medications, diagnosis, notes, and follow-up into the JSON format specified. Output ONLY the JSON object:"""

    try:
        response_text = query_claude(PRESCRIPTION_SYSTEM, user_prompt)
        parsed = extract_json(response_text)
        print(f"[Rx] Claude extracted: {len(parsed.get('medications', []))} medications")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Rx] Claude failed: {e}")
        parsed = {}

    if not parsed or not parsed.get("medications"):
        # If Claude returned nothing useful, return what we got with defaults
        return PrescriptionResponse(
            diagnosis=parsed.get("diagnosis", "Diagnosis pending physician review."),
            medications=[],
            notes=parsed.get("notes", ""),
            follow_up_days=parsed.get("follow_up_days", 14),
        )

    # Build validated medications list
    meds = []
    for m in parsed.get("medications", []):
        if not isinstance(m, dict):
            continue
        name = (m.get("medication_name") or m.get("name", "")).strip()
        if not name:
            continue
        meds.append(Medication(
            medication_name=name,
            dosage=m.get("dosage", m.get("dose", "")),
            frequency=m.get("frequency", ""),
            duration=m.get("duration", ""),
            route=m.get("route", "oral"),
            instructions=m.get("instructions", m.get("special_instructions", "")),
        ))

    diagnosis = parsed.get("diagnosis", "").strip()
    if not diagnosis:
        diagnosis = "Diagnosis pending physician review."

    notes = parsed.get("notes", parsed.get("additional_notes", "")).strip()
    follow_up = parsed.get("follow_up_days", 14)
    if isinstance(follow_up, str):
        try:
            follow_up = int(re.search(r'\d+', follow_up).group())
        except:
            follow_up = 14

    print(f"[Rx] Final: {len(meds)} meds, diagnosis='{diagnosis[:60]}', follow_up={follow_up}d")

    return PrescriptionResponse(
        diagnosis=diagnosis,
        medications=meds,
        notes=notes,
        follow_up_days=follow_up,
    )


# ══════════════════════════════════════════════════════════════
# SOAP NOTE ENDPOINT
# ══════════════════════════════════════════════════════════════

SOAP_SYSTEM = """You are an expert medical scribe AI. Your job is to analyze a doctor-patient consultation transcript and produce a structured SOAP note.

You MUST output ONLY a valid JSON object. No markdown fences, no explanation — just raw JSON.

The JSON schema is:
{
  "subjective": "Patient's chief complaint, history of present illness, symptoms described by the patient in their own words. Include onset, duration, severity, aggravating/relieving factors, and associated symptoms.",
  "objective": "Clinical findings from physical examination, vital signs, lab results, and any observable data. Use proper medical terminology.",
  "assessment": "Clinical diagnosis or differential diagnoses. Include severity. Be specific — 'Acute gastritis secondary to dietary factors' not just 'stomach issue'.",
  "plan": "Treatment plan including medications prescribed (with dosages), lifestyle modifications, patient education, referrals, and follow-up schedule. Be detailed.",
  "icd_codes": ["Array of relevant ICD-10 codes like 'K29.70' for gastritis"],
  "follow_up_days": 14
}

RULES:
1. Be thorough — include ALL relevant clinical information from the transcript.
2. Use proper medical terminology and formatting.
3. The subjective section should reflect what the patient reported, not clinical findings.
4. The objective section should include examination findings AND vitals.
5. The assessment should be a specific clinical diagnosis, not a symptom description.
6. The plan should list specific medications with dosages, and all non-medication instructions.
7. Include appropriate ICD-10 codes for the diagnoses mentioned.
8. Extract the exact follow-up timeline from the transcript.
"""


@app.post("/api/soap", response_model=SOAPResponse)
async def api_soap(req: SOAPRequest):
    """Generate a SOAP note from a consultation transcript."""
    p = req.patient
    vitals = ", ".join(filter(None, [
        f"BP {p.blood_pressure}" if p.blood_pressure else "",
        f"HR {p.heart_rate} bpm" if p.heart_rate else "",
        f"Temp {p.temperature}°F" if p.temperature else "",
        f"SpO2 {p.oxygen_sat}%" if p.oxygen_sat else "",
    ])) or "Not recorded"

    allergies = ", ".join(p.allergies) if p.allergies else "No known allergies"

    user_prompt = f"""Analyze this consultation transcript and create a SOAP note.

PATIENT INFO:
- Name: {p.full_name or 'Unknown'}
- Age: {p.age or 'N/A'}
- Gender: {p.gender or 'N/A'}
- Vitals: {vitals}
- Allergies: {allergies}
- Medical History: {p.medical_history or 'Not provided'}

CONSULTATION TRANSCRIPT:
\"\"\"
{req.transcript}
\"\"\"

Create a complete SOAP note. Output ONLY the JSON object:"""

    try:
        response_text = query_claude(SOAP_SYSTEM, user_prompt)
        parsed = extract_json(response_text)
        print(f"[SOAP] Claude extracted {len(parsed)} keys")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[SOAP] Claude failed: {e}")
        parsed = {}

    # Validate — fall back to transcript for empty fields
    subjective = (parsed.get("subjective") or "").strip()
    if not subjective:
        subjective = f"Patient reports: {req.transcript[:500]}"

    objective = (parsed.get("objective") or "").strip()
    if not objective:
        objective = f"Vitals: {vitals}. Physical examination performed."

    assessment = (parsed.get("assessment") or "").strip()
    if not assessment:
        assessment = "Assessment pending physician review."

    plan = (parsed.get("plan") or "").strip()
    if not plan:
        plan = "Plan to be determined based on clinical findings."

    icd_codes = parsed.get("icd_codes", [])
    if isinstance(icd_codes, str):
        icd_codes = [c.strip() for c in icd_codes.split(",") if c.strip()]

    follow_up = parsed.get("follow_up_days", 14)
    if isinstance(follow_up, str):
        try:
            follow_up = int(re.search(r'\d+', follow_up).group())
        except:
            follow_up = 14

    return SOAPResponse(
        subjective=subjective,
        objective=objective,
        assessment=assessment,
        plan=plan,
        icd_codes=icd_codes,
        follow_up_days=follow_up,
    )


# ══════════════════════════════════════════════════════════════
# COMBINED ANALYSIS ENDPOINT
# ══════════════════════════════════════════════════════════════

@app.post("/api/analyze")
async def api_analyze(req: PrescriptionRequest):
    """Full analysis — returns both SOAP and prescription in one call."""
    soap = await api_soap(SOAPRequest(transcript=req.transcript, patient=req.patient))
    rx = await api_prescription(req)
    return {"soap": soap.model_dump(), "prescription": rx.model_dump()}


# ══════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    if not ANTHROPIC_API_KEY:
        return {"status": "error", "message": "ANTHROPIC_API_KEY not set"}
    try:
        # Quick validation — just check that the key format looks right
        if not ANTHROPIC_API_KEY.startswith("sk-ant-"):
            return {"status": "warning", "message": "API key format looks unusual"}
        return {
            "status": "ok",
            "provider": "anthropic",
            "model": MODEL,
            "key_set": True,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ══════════════════════════════════════════════════════════════
# SERVER
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    print(f"\n🏥 MedConnect AI Backend v3 (Anthropic Claude)")
    print("=" * 55)
    print(f"  Model:     {MODEL}")
    print(f"  API Key:   {'✓ Set' if ANTHROPIC_API_KEY else '✗ MISSING — set ANTHROPIC_API_KEY'}")
    print(f"  Server:    http://localhost:8000")
    print(f"  Health:    http://localhost:8000/health")
    print(f"  Docs:      http://localhost:8000/docs")
    print("=" * 55)

    if not ANTHROPIC_API_KEY:
        print("\n⚠️  ANTHROPIC_API_KEY not set!")
        print("  Get one at: https://console.anthropic.com/settings/keys")
        print("  Then run:   ANTHROPIC_API_KEY=sk-ant-xxx python server.py\n")

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)