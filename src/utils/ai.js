// =============================================================
// AI Processing Utilities
// Uses: Web Speech API (free), Python Backend + Ollama (local)
// =============================================================

const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:8000';

// ── Speech Recognition (Web Speech API — FREE, runs in browser) ──

export function createSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  return recognition;
}

// ── Audio Recording (MediaRecorder API — FREE) ──

export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
  }

  async start() {
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      },
    });
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(1000);
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.stream?.getTracks().forEach((t) => t.stop());
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  get isRecording() {
    return this.mediaRecorder?.state === 'recording';
  }
}

// ── AI Text Processing (Python Backend + Ollama) ──

async function queryBackend(endpoint, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

  try {
    const res = await fetch(`${AI_BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Backend error: ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ── Generate SOAP Note from Transcript ──

export async function generateSOAPNote(transcript, patientInfo) {
  try {
    const result = await queryBackend('/api/soap', {
      transcript,
      patient: {
        full_name: patientInfo.full_name || '',
        age: patientInfo.age || null,
        gender: patientInfo.gender || null,
        blood_pressure: patientInfo.blood_pressure || null,
        heart_rate: patientInfo.heart_rate || null,
        temperature: patientInfo.temperature || null,
        oxygen_sat: patientInfo.oxygen_sat || null,
        allergies: patientInfo.allergies || [],
        medical_history: patientInfo.medical_history || null,
      },
    });
    return result;
  } catch (err) {
    console.warn('Backend API failed, using local parsing:', err.message);
    return parseSOAPFallback('', transcript);
  }
}

// ── Generate Prescription from Transcript ──

export async function generatePrescription(transcript, patientInfo, doctorInfo) {
  try {
    const result = await queryBackend('/api/prescription', {
      transcript,
      patient: {
        full_name: patientInfo.full_name || '',
        age: patientInfo.age || null,
        gender: patientInfo.gender || null,
        allergies: patientInfo.allergies || [],
      },
      doctor: {
        full_name: doctorInfo?.full_name || '',
        specialization: doctorInfo?.specialization || null,
      },
    });
    return result;
  } catch (err) {
    console.warn('Backend API failed, using local parsing:', err.message);
    return parsePrescriptionFallback(transcript);
  }
}

// ── Smart Fallback Parsers (extract structured data from transcript) ──

function parseSOAPFallback(aiText, transcript) {
  const t = transcript.toLowerCase();
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

  // Extract subjective (complaints, symptoms, history)
  const subjectiveKeywords = ['complain', 'presenting', 'reports', 'pain', 'ache', 'feeling', 'nausea', 'vomiting', 'fever', 'cough', 'symptoms', 'history', 'days', 'weeks', 'worse', 'better', 'started', 'noticed', 'experiencing'];
  const subjective = sentences.filter(s => subjectiveKeywords.some(k => s.toLowerCase().includes(k)));

  // Extract objective (examination findings, vitals)
  const objectiveKeywords = ['examination', 'exam', 'on exam', 'vitals', 'blood pressure', 'heart rate', 'temperature', 'oxygen', 'tenderness', 'soft', 'bowel', 'lungs', 'clear', 'normal', 'stable', 'auscultation', 'palpation', 'guarding', 'rigidity', 'swelling'];
  const objective = sentences.filter(s => objectiveKeywords.some(k => s.toLowerCase().includes(k)));

  // Extract assessment (diagnosis, impression)
  const assessmentKeywords = ['assessment', 'diagnosis', 'impression', 'likely', 'suspect', 'consistent with', 'acute', 'chronic', 'mild', 'moderate', 'severe', 'related to', 'no red flags', 'no signs of'];
  const assessment = sentences.filter(s => assessmentKeywords.some(k => s.toLowerCase().includes(k)));

  // Extract plan (treatment, follow-up, instructions)
  const planKeywords = ['prescri', 'recommend', 'advise', 'follow up', 'follow-up', 'return', 'avoid', 'should', 'come back', 'refer', 'schedule', 'medication', 'treatment', 'therapy'];
  const plan = sentences.filter(s => planKeywords.some(k => s.toLowerCase().includes(k)));

  // Extract follow-up days
  const followUpDays = extractFollowUpDays(transcript);

  return {
    subjective: subjective.length ? subjective.join('. ') + '.' : `Patient reports: ${transcript.substring(0, 500)}`,
    objective: objective.length ? objective.join('. ') + '.' : 'Vitals as recorded. Physical examination performed.',
    assessment: assessment.length ? assessment.join('. ') + '.' : 'Assessment pending review by physician.',
    plan: plan.length ? plan.join('. ') + '.' : 'Plan to be determined based on clinical findings.',
    icd_codes: [],
    follow_up_days: followUpDays,
  };
}

function parsePrescriptionFallback(transcript) {
  const medications = extractMedications(transcript);
  const diagnosis = extractDiagnosis(transcript);
  const notes = extractNotes(transcript);
  const followUpDays = extractFollowUpDays(transcript);

  return {
    diagnosis: diagnosis || 'Diagnosis pending physician review.',
    medications,
    notes: notes || '',
    follow_up_days: followUpDays,
  };
}

/**
 * Extract medications from transcript text.
 * Looks for patterns like: "prescribing Omeprazole 20mg once daily for 14 days"
 */
function extractMedications(transcript) {
  const medications = [];
  const t = transcript.toLowerCase();

  // Common medication patterns in speech
  // Pattern: medication_name + dosage + frequency + duration
  const medPatterns = [
    // "prescribing X 20mg, take one tablet once daily for 14 days"
    /(?:prescrib(?:ing|e)|giving|start(?:ing)?|also|and)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(\d+\s*(?:mg|mcg|ml|g|milligrams?|micrograms?|milliliters?))/gi,
    // "X 20 milligrams" or "X 20mg"
    /([A-Z][a-z]{2,}(?:azole|prazole|ine|cin|cillin|mycin|fen|pril|artan|olol|dipine|statin|arin|amide|azepam|oxacin|icam|profen|afen|alate|dine|parin|mab|nib|vir|afil)?)\s+(\d+\s*(?:mg|mcg|ml|g|milligrams?|micrograms?|milliliters?))/gi,
  ];

  // Known medication names to look for
  const knownMeds = [
    'omeprazole', 'pantoprazole', 'esomeprazole', 'lansoprazole', 'rabeprazole',
    'sucralfate', 'antacid', 'ranitidine', 'famotidine',
    'ondansetron', 'metoclopramide', 'domperidone',
    'amoxicillin', 'azithromycin', 'ciprofloxacin', 'metronidazole', 'doxycycline',
    'ibuprofen', 'acetaminophen', 'paracetamol', 'aspirin', 'naproxen', 'diclofenac',
    'metformin', 'insulin', 'glimepiride', 'sitagliptin',
    'amlodipine', 'lisinopril', 'losartan', 'atenolol', 'hydrochlorothiazide',
    'atorvastatin', 'rosuvastatin', 'simvastatin',
    'cetirizine', 'loratadine', 'fexofenadine', 'montelukast',
    'prednisone', 'prednisolone', 'dexamethasone', 'hydrocortisone',
    'albuterol', 'salbutamol', 'fluticasone', 'budesonide',
    'sertraline', 'fluoxetine', 'escitalopram', 'alprazolam', 'diazepam',
    'gabapentin', 'pregabalin', 'tramadol', 'codeine',
    'metoprolol', 'propranolol', 'carvedilol',
    'warfarin', 'clopidogrel', 'apixaban', 'rivaroxaban',
    'levothyroxine', 'methimazole',
  ];

  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const foundMedNames = new Set();

  // First pass: find medication names
  for (const medName of knownMeds) {
    const idx = t.indexOf(medName);
    if (idx !== -1) {
      foundMedNames.add(medName);
    }
  }

  // Also find capitalized words followed by dosage numbers
  const capsWithDose = transcript.match(/([A-Z][a-z]{3,}(?:azole|prazole|ine|cin|cillin|mycin|fen|pril|artan|olol|statin|afil|alate|amide)?)\s+\d+/g);
  if (capsWithDose) {
    capsWithDose.forEach(m => {
      const name = m.match(/([A-Z][a-z]+)/)?.[1]?.toLowerCase();
      if (name && name.length > 3 && !['patient', 'doctor', 'blood', 'heart', 'follow', 'after', 'before', 'about', 'take', 'days', 'times', 'once', 'twice'].includes(name)) {
        foundMedNames.add(name);
      }
    });
  }

  // For each found medication, extract details from surrounding text
  for (const medName of foundMedNames) {
    const med = extractMedicationDetails(transcript, medName);
    medications.push(med);
  }

  return medications;
}

/**
 * Given a transcript and a medication name, extract dosage, frequency, duration, route, instructions
 */
function extractMedicationDetails(transcript, medName) {
  const t = transcript.toLowerCase();
  const idx = t.indexOf(medName);

  // Get context: ~200 chars around the medication mention
  const start = Math.max(0, idx - 50);
  const end = Math.min(t.length, idx + 250);
  const context = transcript.substring(start, end).toLowerCase();

  // Extract dosage (number + unit)
  const dosageMatch = context.match(new RegExp(medName + '\\s+(\\d+\\s*(?:mg|mcg|ml|g|milligrams?|micrograms?|milliliters?|gram))', 'i'))
    || context.match(/(\d+\s*(?:mg|mcg|ml|g|milligrams?|micrograms?|milliliters?|gram))/i);
  const dosage = dosageMatch ? dosageMatch[1].replace(/milligrams?/i, 'mg').replace(/micrograms?/i, 'mcg').replace(/milliliters?/i, 'ml') : '';

  // Extract frequency
  let frequency = '';
  if (/three times\s*(?:a|per)\s*day|thrice daily|tid|t\.i\.d/i.test(context)) frequency = 'Three times daily';
  else if (/twice\s*(?:a|per)\s*day|two times\s*(?:a|per)\s*day|bid|b\.i\.d/i.test(context)) frequency = 'Twice daily';
  else if (/once\s*(?:a|per)\s*day|once daily|qd|q\.d|one time/i.test(context)) frequency = 'Once daily';
  else if (/four times\s*(?:a|per)\s*day|qid|q\.i\.d/i.test(context)) frequency = 'Four times daily';
  else if (/every\s*(\d+)\s*hours?/i.test(context)) {
    const hrs = context.match(/every\s*(\d+)\s*hours?/i)[1];
    frequency = `Every ${hrs} hours`;
  }
  else if (/as needed|as required|prn|p\.r\.n/i.test(context)) frequency = 'As needed';
  else if (/at bedtime|before bed|at night|qhs/i.test(context)) frequency = 'At bedtime';

  // Extract duration
  let duration = '';
  const durationMatch = context.match(/(?:for|x)\s*(\d+)\s*(days?|weeks?|months?)/i);
  if (durationMatch) duration = `${durationMatch[1]} ${durationMatch[2]}`;

  // Extract route
  let route = 'oral';
  if (/topical|apply|cream|ointment|gel/i.test(context)) route = 'topical';
  else if (/inject|injection|im|iv|subcutaneous/i.test(context)) route = 'injection';
  else if (/inhal|inhaler|nebulize|puff/i.test(context)) route = 'inhalation';
  else if (/sublingual|under.?tongue/i.test(context)) route = 'sublingual';
  else if (/rectal|suppository/i.test(context)) route = 'rectal';
  else if (/eye|ophthalmic|drops/i.test(context)) route = 'ophthalmic';

  // Extract instructions
  let instructions = '';
  if (/before\s*(?:meals?|breakfast|food|eating)/i.test(context)) instructions = 'Take before meals';
  else if (/after\s*(?:meals?|food|eating)/i.test(context)) instructions = 'Take after meals';
  else if (/with\s*(?:meals?|food)/i.test(context)) instructions = 'Take with food';
  else if (/empty stomach/i.test(context)) instructions = 'Take on empty stomach';
  else if (/before breakfast|in the morning before/i.test(context)) instructions = 'Take in the morning before breakfast';

  if (/30 minutes? before/i.test(context)) {
    instructions = instructions ? instructions + ', 30 minutes before meals' : '30 minutes before meals';
  }

  // Max per day
  const maxMatch = context.match(/maximum\s*(?:of\s*)?(\d+)\s*times?\s*(?:a|per)\s*day/i);
  if (maxMatch) {
    instructions = instructions ? `${instructions}. Maximum ${maxMatch[1]} times per day` : `Maximum ${maxMatch[1]} times per day`;
  }

  // "one capsule", "one tablet", "two tablets" etc.
  const formMatch = context.match(/(?:take\s+)?(?:one|two|three|1|2|3)\s+(tablet|capsule|pill|teaspoon|tablespoon|puff|drop)/i);
  if (formMatch) {
    const numMatch = context.match(/(one|two|three|1|2|3)\s+(?:tablet|capsule|pill)/i);
    const num = numMatch ? numMatch[1] : '';
    instructions = instructions ? `${num} ${formMatch[1]}. ${instructions}` : `Take ${num} ${formMatch[1]}`;
  }

  return {
    medication_name: medName.charAt(0).toUpperCase() + medName.slice(1),
    dosage: dosage || '',
    frequency: frequency || '',
    duration: duration || '',
    route,
    instructions: instructions.trim() || '',
  };
}

/**
 * Extract diagnosis from transcript
 */
function extractDiagnosis(transcript) {
  const t = transcript.toLowerCase();
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

  // Look for explicit diagnosis patterns
  const diagnosisPatterns = [
    /(?:my |the )?(?:assessment|diagnosis|impression) (?:is|would be|suggests?)\s+(.+?)(?:\.|,|$)/i,
    /(?:presenting with|consistent with|indicative of|likely|suspect)\s+(.+?)(?:\.|,|$)/i,
    /(?:diagnosed with|suffering from|has)\s+(acute|chronic)?\s*(.+?)(?:\.|,|$)/i,
  ];

  for (const pattern of diagnosisPatterns) {
    const match = transcript.match(pattern);
    if (match) {
      const diagnosis = (match[1] || match[2] || '').trim();
      if (diagnosis.length > 5 && diagnosis.length < 200) {
        return diagnosis.charAt(0).toUpperCase() + diagnosis.slice(1);
      }
    }
  }

  // Look for sentences with diagnosis keywords
  const diagKeywords = ['diagnosis', 'assessment', 'acute', 'chronic', 'gastritis', 'infection', 'disorder', 'syndrome', 'disease', 'condition', 'inflammation', '-itis', 'fracture', 'strain', 'deficiency'];
  for (const s of sentences) {
    if (diagKeywords.some(k => s.toLowerCase().includes(k))) {
      return s;
    }
  }

  return '';
}

/**
 * Extract notes/instructions from transcript (dietary advice, lifestyle, warnings)
 */
function extractNotes(transcript) {
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const noteKeywords = ['avoid', 'should', 'recommend', 'advise', 'lifestyle', 'diet', 'exercise', 'rest', 'sleep', 'hydrat', 'drink', 'alcohol', 'smoking', 'caffeine', 'spicy', 'stress', 'eat', 'smaller', 'frequent', 'come back', 'immediately', 'worsen', 'emergency', 'if symptoms'];

  const notes = sentences.filter(s => noteKeywords.some(k => s.toLowerCase().includes(k)));
  return notes.length ? notes.join('. ') + '.' : '';
}

/**
 * Extract follow-up days from transcript
 */
function extractFollowUpDays(transcript) {
  const t = transcript.toLowerCase();

  // "follow up in two weeks" / "follow up in 14 days"
  const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, ten: 10, fourteen: 14 };
  const followMatch = t.match(/follow.?up\s+(?:in\s+)?(\d+|one|two|three|four|five|six|seven|eight|ten|fourteen)\s*(days?|weeks?|months?)/i);

  if (followMatch) {
    let num = parseInt(followMatch[1]) || wordToNum[followMatch[1]] || 7;
    const unit = followMatch[2].toLowerCase();
    if (unit.startsWith('week')) num *= 7;
    else if (unit.startsWith('month')) num *= 30;
    return num;
  }

  return 14;
}

// ── Notification / Reminder Utilities ──

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function scheduleReminder(medicationName, dosage, time, message) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;

  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (target <= now) target.setDate(target.getDate() + 1);

  const delay = target.getTime() - now.getTime();

  return setTimeout(() => {
    new Notification(`💊 ${medicationName}`, {
      body: `${dosage} — ${message || 'Time to take your medication'}`,
      icon: '/icons/icon-192.png',
      tag: `med-${medicationName}-${time}`,
      requireInteraction: true,
    });
  }, delay);
}