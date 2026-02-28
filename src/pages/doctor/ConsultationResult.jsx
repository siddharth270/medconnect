import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { generateSOAPNote, generatePrescription } from '../../utils/ai';
import {
  createConsultation, createSOAPNote, createPrescription,
  createPrescriptionMedications, createAppointment, uploadAudio,
} from '../../utils/db';
import { generatePrescriptionDocument, generateSOAPDocument } from '../../utils/documentGenerator';
import {
  FileText, Pill, Save, Edit3, Check, ArrowLeft,
  Loader2, Clock, Mic, AlertTriangle, Plus, Trash2, FileDown,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';

export default function ConsultationResult() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { patient, consultType, transcript, duration, audioBlob } = location.state || {};

  const [processing, setProcessing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // SOAP state
  const [soap, setSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '', icd_codes: [], follow_up_days: 14 });

  // Prescription state
  const [rx, setRx] = useState({ diagnosis: '', medications: [], notes: '', follow_up_days: 7 });

  useEffect(() => {
    if (!patient || !consultType || !transcript) {
      navigate('/doctor/consult', { replace: true });
      return;
    }
    processTranscript();
  }, []);

  async function processTranscript() {
    setProcessing(true);
    try {
      if (consultType === 'soap_note') {
        const result = await generateSOAPNote(transcript, patient);
        setSoap({
          subjective: result.subjective || '',
          objective: result.objective || '',
          assessment: result.assessment || '',
          plan: result.plan || '',
          icd_codes: result.icd_codes || [],
          follow_up_days: result.follow_up_days || 14,
        });
      } else {
        const result = await generatePrescription(transcript, patient, profile);
        setRx({
          diagnosis: result.diagnosis || '',
          medications: result.medications || [],
          notes: result.notes || '',
          follow_up_days: result.follow_up_days || 7,
        });
      }
    } catch (err) {
      console.error('AI processing error:', err);
      toast.error('AI processing failed. You can edit manually.');
    } finally {
      setProcessing(false);
      setEditing(true); // Allow editing after processing
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Upload audio if available (non-blocking)
      let audioPath = null;
      if (audioBlob) {
        try {
          const filename = `consult_${Date.now()}.webm`;
          audioPath = await uploadAudio(profile.id, audioBlob, filename);
        } catch (e) {
          console.warn('Audio upload skipped:', e.message);
          // Continue without audio — don't block save
        }
      }

      // Create consultation record
      console.log('Creating consultation...');
      const consultation = await createConsultation({
        doctor_id: profile.id,
        patient_id: patient.id,
        type: consultType,
        transcript: transcript || '',
        audio_url: audioPath,
        duration_secs: duration || 0,
        ai_processed: true,
      });
      console.log('Consultation created:', consultation.id);

      // Create the typed record
      if (consultType === 'soap_note') {
        const followUp = soap.follow_up_days ? addDays(new Date(), soap.follow_up_days) : null;
        await createSOAPNote({
          consultation_id: consultation.id,
          doctor_id: profile.id,
          patient_id: patient.id,
          subjective: soap.subjective || '',
          objective: soap.objective || '',
          assessment: soap.assessment || '',
          plan: soap.plan || '',
          icd_codes: soap.icd_codes || [],
          follow_up_date: followUp?.toISOString()?.split('T')[0] || null,
        });

        if (followUp) {
          try {
            await createAppointment({
              doctor_id: profile.id,
              patient_id: patient.id,
              scheduled_at: followUp.toISOString(),
              status: 'scheduled',
              chief_complaint: 'Follow-up',
            });
          } catch (e) {
            console.warn('Follow-up appointment creation failed:', e.message);
          }
        }
      } else {
        const followUp = rx.follow_up_days ? addDays(new Date(), rx.follow_up_days) : null;
        const prescription = await createPrescription({
          consultation_id: consultation.id,
          doctor_id: profile.id,
          patient_id: patient.id,
          diagnosis: rx.diagnosis || '',
          notes: rx.notes || '',
          follow_up_date: followUp?.toISOString()?.split('T')[0] || null,
        });

        if (rx.medications.length > 0) {
          await createPrescriptionMedications(
            rx.medications.map(med => ({
              prescription_id: prescription.id,
              medication_name: med.medication_name || '',
              dosage: med.dosage || '',
              frequency: med.frequency || '',
              duration: med.duration || null,
              route: med.route || 'oral',
              instructions: med.instructions || null,
            }))
          );
        }

        if (followUp) {
          try {
            await createAppointment({
              doctor_id: profile.id,
              patient_id: patient.id,
              scheduled_at: followUp.toISOString(),
              status: 'scheduled',
              chief_complaint: 'Follow-up',
            });
          } catch (e) {
            console.warn('Follow-up appointment creation failed:', e.message);
          }
        }
      }

      toast.success('Consultation saved!');
      navigate(`/doctor/patients/${patient.id}`);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleGenerateDocument() {
    if (consultType === 'soap_note') {
      generateSOAPDocument({
        doctor: profile,
        patient,
        soapNote: soap,
        consultation: { duration_secs: duration },
      });
    } else {
      generatePrescriptionDocument({
        doctor: profile,
        patient,
        prescription: { diagnosis: rx.diagnosis, notes: rx.notes, follow_up_date: rx.follow_up_days ? new Date(Date.now() + rx.follow_up_days * 86400000).toISOString().split('T')[0] : null },
        medications: rx.medications,
        consultation: { duration_secs: duration },
      });
    }
    toast.success('Document opened — use Save as PDF / Print');
  }

  // Add medication to prescription
  const addMedication = () => {
    setRx({
      ...rx,
      medications: [
        ...rx.medications,
        { medication_name: '', dosage: '', frequency: '', duration: '', route: 'oral', instructions: '' },
      ],
    });
  };

  const updateMed = (index, field, value) => {
    const meds = [...rx.medications];
    meds[index] = { ...meds[index], [field]: value };
    setRx({ ...rx, medications: meds });
  };

  const removeMed = (index) => {
    setRx({ ...rx, medications: rx.medications.filter((_, i) => i !== index) });
  };

  if (!patient) return null;

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/doctor/consult')} className="w-9 h-9 rounded-xl bg-surface-100 border border-surface-200 flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold">
            {consultType === 'soap_note' ? 'SOAP Note' : 'Prescription'}
          </h2>
          <p className="text-xs text-gray-500">{patient.full_name} · {formatTime(duration)}</p>
        </div>
      </div>

      {processing ? (
        <div className="card text-center py-16">
          <Loader2 size={32} className="text-brand-400 mx-auto mb-4 animate-spin" />
          <h3 className="font-display font-semibold mb-1">Processing Transcript</h3>
          <p className="text-sm text-gray-500">
            AI is analyzing the conversation and generating your {consultType === 'soap_note' ? 'SOAP note' : 'prescription'}...
          </p>
        </div>
      ) : (
        <>
          {/* SOAP Note Form */}
          {consultType === 'soap_note' && (
            <div className="space-y-4">
              {[
                { key: 'subjective', label: 'S — Subjective', desc: "Patient's reported symptoms and history" },
                { key: 'objective', label: 'O — Objective', desc: 'Clinical findings and test results' },
                { key: 'assessment', label: 'A — Assessment', desc: 'Diagnosis and clinical impression' },
                { key: 'plan', label: 'P — Plan', desc: 'Treatment plan and next steps' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="card space-y-2">
                  <div>
                    <h3 className="font-display font-semibold text-sm">{label}</h3>
                    <p className="text-[10px] text-gray-600">{desc}</p>
                  </div>
                  <textarea
                    value={soap[key]}
                    onChange={(e) => setSoap({ ...soap, [key]: e.target.value })}
                    rows={4}
                    className="w-full bg-surface-100 border border-surface-300 text-white text-sm placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
                  />
                </div>
              ))}

              <div className="card space-y-2">
                <h3 className="font-display font-semibold text-sm">ICD Codes</h3>
                <input
                  type="text"
                  placeholder="e.g. J06.9, R50.9 (comma-separated)"
                  value={soap.icd_codes?.join(', ') || ''}
                  onChange={(e) => setSoap({ ...soap, icd_codes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full text-sm"
                />
              </div>

              <div className="card space-y-2">
                <h3 className="font-display font-semibold text-sm">Follow-up</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={soap.follow_up_days}
                    onChange={(e) => setSoap({ ...soap, follow_up_days: parseInt(e.target.value) || 0 })}
                    className="w-20 text-sm text-center"
                  />
                  <span className="text-sm text-gray-400">days from today</span>
                </div>
              </div>
            </div>
          )}

          {/* Prescription Form */}
          {consultType === 'prescription' && (
            <div className="space-y-4">
              <div className="card space-y-2">
                <h3 className="font-display font-semibold text-sm">Diagnosis</h3>
                <textarea
                  value={rx.diagnosis}
                  onChange={(e) => setRx({ ...rx, diagnosis: e.target.value })}
                  rows={2}
                  className="w-full bg-surface-100 border border-surface-300 text-white text-sm placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-sm">Medications</h3>
                  <button onClick={addMedication} className="text-xs text-brand-400 flex items-center gap-1 hover:text-brand-300">
                    <Plus size={12} /> Add
                  </button>
                </div>

                {rx.medications.length > 0 ? (
                  <div className="space-y-3">
                    {rx.medications.map((med, i) => (
                      <div key={i} className="card space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                          <button onClick={() => removeMed(i)} className="text-coral hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          type="text" placeholder="Medication name"
                          value={med.medication_name} onChange={(e) => updateMed(i, 'medication_name', e.target.value)}
                          className="w-full text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text" placeholder="Dosage (e.g. 500mg)"
                            value={med.dosage} onChange={(e) => updateMed(i, 'dosage', e.target.value)}
                            className="w-full text-sm"
                          />
                          <input
                            type="text" placeholder="Frequency"
                            value={med.frequency} onChange={(e) => updateMed(i, 'frequency', e.target.value)}
                            className="w-full text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text" placeholder="Duration (e.g. 7 days)"
                            value={med.duration} onChange={(e) => updateMed(i, 'duration', e.target.value)}
                            className="w-full text-sm"
                          />
                          <select value={med.route} onChange={(e) => updateMed(i, 'route', e.target.value)} className="w-full text-sm">
                            <option value="oral">Oral</option>
                            <option value="topical">Topical</option>
                            <option value="injection">Injection</option>
                            <option value="inhalation">Inhalation</option>
                            <option value="sublingual">Sublingual</option>
                          </select>
                        </div>
                        <input
                          type="text" placeholder="Special instructions"
                          value={med.instructions} onChange={(e) => updateMed(i, 'instructions', e.target.value)}
                          className="w-full text-sm"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card text-center py-6">
                    <Pill size={20} className="text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-2">No medications added</p>
                    <button onClick={addMedication} className="text-sm text-brand-400">+ Add Medication</button>
                  </div>
                )}
              </div>

              <div className="card space-y-2">
                <h3 className="font-display font-semibold text-sm">Notes</h3>
                <textarea
                  value={rx.notes}
                  onChange={(e) => setRx({ ...rx, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional notes..."
                  className="w-full bg-surface-100 border border-surface-300 text-white text-sm placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
                />
              </div>

              <div className="card space-y-2">
                <h3 className="font-display font-semibold text-sm">Follow-up</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number" value={rx.follow_up_days}
                    onChange={(e) => setRx({ ...rx, follow_up_days: parseInt(e.target.value) || 0 })}
                    className="w-20 text-sm text-center"
                  />
                  <span className="text-sm text-gray-400">days</span>
                </div>
              </div>
            </div>
          )}

          {/* Transcript Preview */}
          <details className="card">
            <summary className="text-xs text-gray-400 uppercase tracking-wider font-medium cursor-pointer flex items-center gap-2">
              <Mic size={12} /> Original Transcript
            </summary>
            <p className="text-sm text-gray-500 mt-3 font-mono leading-relaxed whitespace-pre-wrap">
              {transcript}
            </p>
          </details>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button onClick={handleGenerateDocument} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <FileDown size={16} /> Generate Document
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save size={16} /> Save {consultType === 'soap_note' ? 'SOAP Note' : 'Prescription'}</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function formatTime(secs) {
  if (!secs) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}