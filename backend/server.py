"""
MedConnect AI Backend
FastAPI server that uses Ollama (Llama 3.2) for medical transcript processing.
Generates SOAP notes and prescriptions from doctor-patient consultation transcripts.

Setup:
  1. Install Ollama: https://ollama.com/download
  2. Pull model: ollama pull llama3.2
  3. pip install -r requirements.txt
  4. python server.py
"""

import json
import re
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="MedConnect AI", version="1.0.0")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2"


# ── Request/Response Models ──

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


# ── Ollama Communication ──

async def query_ollama(prompt: str, system: str = "") -> str:
    """Send a prompt to Ollama and return the response text."""
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 2048,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(OLLAMA_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "")
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Start it with: ollama serve"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Ollama request timed out. The model may still be loading."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama error: {str(e)}")


def extract_json(text: str) -> dict:
    """Extract a JSON object from LLM response text."""
    # Try to find JSON block
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    # Try cleaning common issues
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {}


# ── API Endpoints ──

@app.get("/health")
async def health_check():
    """Check if server and Ollama are running."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("http://localhost:11434/api/tags")
            models = resp.json().get("models", [])
            model_names = [m["name"] for m in models]
            has_model = any(MODEL in name for name in model_names)
            return {
                "status": "ok",
                "ollama": "connected",
                "model": MODEL,
                "model_available": has_model,
                "available_models": model_names,
            }
    except Exception:
        return {
            "status": "degraded",
            "ollama": "not connected",
            "message": "Start Ollama with: ollama serve",
        }


@app.post("/api/soap", response_model=SOAPResponse)
async def generate_soap_note(req: SOAPRequest):
    """Generate a SOAP note from a consultation transcript."""

    system_prompt = """You are a medical scribe AI assistant. Your job is to analyze doctor-patient consultation transcripts and generate structured SOAP notes.

You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no preamble. Just pure JSON.

The JSON must have these exact keys:
- "subjective": Patient's reported symptoms, concerns, history of present illness
- "objective": Clinical findings, vital signs, physical examination results
- "assessment": Diagnosis, differential diagnosis, clinical impression
- "plan": Treatment plan, medications, follow-up instructions, referrals
- "icd_codes": Array of relevant ICD-10 codes (e.g. ["K29.70", "R11.0"])
- "follow_up_days": Number of days until follow-up (integer)

Be thorough, professional, and use proper medical terminology."""

    patient = req.patient
    vitals = []
    if patient.blood_pressure:
        vitals.append(f"BP {patient.blood_pressure}")
    if patient.heart_rate:
        vitals.append(f"HR {patient.heart_rate} bpm")
    if patient.temperature:
        vitals.append(f"Temp {patient.temperature}°F")
    if patient.oxygen_sat:
        vitals.append(f"SpO2 {patient.oxygen_sat}%")

    prompt = f"""Analyze this consultation transcript and generate a SOAP note as JSON.

Patient: {patient.full_name}, Age: {patient.age or 'N/A'}, Gender: {patient.gender or 'N/A'}
Vitals: {', '.join(vitals) if vitals else 'N/A'}
Allergies: {', '.join(patient.allergies) if patient.allergies else 'None known'}
Medical History: {patient.medical_history or 'N/A'}

TRANSCRIPT:
{req.transcript}

Respond with ONLY a JSON object:"""

    response_text = await query_ollama(prompt, system_prompt)
    parsed = extract_json(response_text)

    if not parsed:
        # Fallback: use the transcript as-is
        return SOAPResponse(
            subjective=f"Patient reports: {req.transcript[:500]}",
            objective="Vitals as recorded. Physical examination performed.",
            assessment="Assessment pending physician review.",
            plan="Plan to be determined.",
            icd_codes=[],
            follow_up_days=14,
        )

    return SOAPResponse(
        subjective=parsed.get("subjective", ""),
        objective=parsed.get("objective", ""),
        assessment=parsed.get("assessment", ""),
        plan=parsed.get("plan", ""),
        icd_codes=parsed.get("icd_codes", []),
        follow_up_days=parsed.get("follow_up_days", 14),
    )


@app.post("/api/prescription", response_model=PrescriptionResponse)
async def generate_prescription(req: PrescriptionRequest):
    """Generate a prescription from a consultation transcript."""

    system_prompt = """You are a medical AI assistant that extracts prescription details from doctor-patient consultation transcripts.

You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no preamble. Just pure JSON.

The JSON must have these exact keys:
- "diagnosis": The primary diagnosis as a string
- "medications": Array of medication objects, each with:
    - "medication_name": Drug name
    - "dosage": Dose amount and unit (e.g. "20mg", "500mg", "1g")
    - "frequency": How often (e.g. "Once daily", "Twice daily", "Three times daily", "As needed")
    - "duration": How long (e.g. "7 days", "14 days", "2 weeks")
    - "route": Administration route (e.g. "oral", "topical", "injection", "inhalation")
    - "instructions": Special instructions (e.g. "Take before breakfast", "Take with food")
- "notes": Additional clinical notes, dietary advice, lifestyle recommendations, warnings
- "follow_up_days": Number of days until follow-up (integer)

Extract ALL medications mentioned. Be precise with dosages and frequencies."""

    patient = req.patient
    prompt = f"""Extract the prescription from this consultation transcript as JSON.

Doctor: {req.doctor.full_name or 'N/A'}, {req.doctor.specialization or 'General Practice'}
Patient: {patient.full_name}, Age: {patient.age or 'N/A'}
Allergies: {', '.join(patient.allergies) if patient.allergies else 'None known'}

TRANSCRIPT:
{req.transcript}

Respond with ONLY a JSON object:"""

    response_text = await query_ollama(prompt, system_prompt)
    parsed = extract_json(response_text)

    if not parsed:
        return PrescriptionResponse(
            diagnosis="Diagnosis pending physician review.",
            medications=[],
            notes=f"Based on consultation transcript.",
            follow_up_days=7,
        )

    # Parse medications carefully
    meds = []
    for m in parsed.get("medications", []):
        if isinstance(m, dict):
            meds.append(Medication(
                medication_name=m.get("medication_name", m.get("name", "")),
                dosage=m.get("dosage", m.get("dose", "")),
                frequency=m.get("frequency", ""),
                duration=m.get("duration", ""),
                route=m.get("route", "oral"),
                instructions=m.get("instructions", m.get("special_instructions", "")),
            ))

    return PrescriptionResponse(
        diagnosis=parsed.get("diagnosis", ""),
        medications=meds,
        notes=parsed.get("notes", parsed.get("additional_notes", "")),
        follow_up_days=parsed.get("follow_up_days", 7),
    )


@app.post("/api/analyze")
async def analyze_transcript(req: PrescriptionRequest):
    """General-purpose transcript analysis — returns both SOAP and prescription data."""

    soap_req = SOAPRequest(transcript=req.transcript, patient=req.patient)
    rx_req = req

    soap = await generate_soap_note(soap_req)
    prescription = await generate_prescription(rx_req)

    return {
        "soap": soap.model_dump(),
        "prescription": prescription.model_dump(),
    }


# ── Run Server ──

if __name__ == "__main__":
    import uvicorn
    print("\n🏥 MedConnect AI Backend")
    print("=" * 40)
    print(f"Model: {MODEL}")
    print(f"Ollama: {OLLAMA_URL}")
    print(f"Server: http://localhost:8000")
    print(f"Health: http://localhost:8000/health")
    print("=" * 40)
    print("\nMake sure Ollama is running: ollama serve")
    print(f"Make sure model is pulled: ollama pull {MODEL}\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)