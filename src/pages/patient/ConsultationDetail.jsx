import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generatePrescriptionDocument, generateSOAPDocument } from '../../utils/documentGenerator';
import {
  ArrowLeft, FileText, Pill, Mic, Calendar,
  Clock, Activity, ChevronDown, ChevronUp, FileDown,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ConsultationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    loadConsultation();
  }, [id]);

  async function loadConsultation() {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          soap_notes(*),
          prescriptions(*, prescription_medications(*)),
          patients(full_name, age, gender, blood_group, blood_pressure, heart_rate, temperature, oxygen_sat, allergies),
          profiles!consultations_doctor_id_fkey(full_name, specialization, license_number, clinic)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      setConsultation(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!consultation) {
    return <div className="text-center py-20 text-gray-500">Consultation not found</div>;
  }

  const isSOAP = consultation.type === 'soap_note';
  const soapNote = consultation.soap_notes?.[0] || consultation.soap_notes;
  const prescription = consultation.prescriptions?.[0] || consultation.prescriptions;
  const doctor = consultation.profiles || {};
  const patientData = consultation.patients || {};

  function handleDownloadDocument() {
    if (isSOAP && soapNote) {
      generateSOAPDocument({
        doctor,
        patient: patientData,
        soapNote,
        consultation,
      });
    } else if (!isSOAP && prescription) {
      generatePrescriptionDocument({
        doctor,
        patient: patientData,
        prescription,
        medications: prescription.prescription_medications || [],
        consultation,
      });
    }
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-surface-100 border border-surface-200 flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold">
            {isSOAP ? 'SOAP Note' : 'Prescription'}
          </h2>
          <p className="text-xs text-gray-500">
            {format(new Date(consultation.created_at), 'MMMM d, yyyy · h:mm a')}
          </p>
        </div>
        <div className={`tag ${isSOAP ? 'bg-brand-500/10 text-brand-400' : 'bg-mint/10 text-mint'}`}>
          {isSOAP ? <FileText size={12} /> : <Pill size={12} />}
          <span className="ml-1">{isSOAP ? 'SOAP' : 'Rx'}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="card flex items-center gap-4 flex-wrap">
        {consultation.duration_secs && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock size={12} />
            {Math.floor(consultation.duration_secs / 60)}m {consultation.duration_secs % 60}s
          </div>
        )}
        {consultation.audio_url && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Mic size={12} /> Recording available
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Activity size={12} />
          {consultation.ai_processed ? 'AI processed' : 'Manual entry'}
        </div>
        <button
          onClick={handleDownloadDocument}
          className="ml-auto flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          <FileDown size={14} /> Download PDF
        </button>
      </div>

      {/* SOAP Note Content */}
      {isSOAP && soapNote && (
        <div className="space-y-3">
          {[
            { key: 'subjective', label: 'S — Subjective', color: 'border-l-brand-400' },
            { key: 'objective', label: 'O — Objective', color: 'border-l-mint' },
            { key: 'assessment', label: 'A — Assessment', color: 'border-l-amber' },
            { key: 'plan', label: 'P — Plan', color: 'border-l-orchid' },
          ].map(({ key, label, color }) => (
            soapNote[key] && (
              <div key={key} className={`card border-l-4 ${color}`}>
                <h3 className="font-display font-semibold text-sm mb-2">{label}</h3>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {soapNote[key]}
                </p>
              </div>
            )
          ))}

          {soapNote.icd_codes?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {soapNote.icd_codes.map((code, i) => (
                <span key={i} className="tag bg-surface-200 text-gray-300 font-mono">{code}</span>
              ))}
            </div>
          )}

          {soapNote.follow_up_date && (
            <div className="card flex items-center gap-2">
              <Calendar size={14} className="text-brand-400" />
              <span className="text-sm">
                Follow-up: {format(new Date(soapNote.follow_up_date), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Prescription Content */}
      {!isSOAP && prescription && (
        <div className="space-y-3">
          {prescription.diagnosis && (
            <div className="card">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Diagnosis</h3>
              <p className="text-sm text-gray-300">{prescription.diagnosis}</p>
            </div>
          )}

          {prescription.prescription_medications?.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Medications</h3>
              <div className="space-y-2">
                {prescription.prescription_medications.map((med, i) => (
                  <div key={med.id || i} className="card bg-surface-100">
                    <h4 className="font-semibold text-sm text-mint">{med.medication_name}</h4>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div><span className="text-gray-500">Dosage:</span> <span className="text-gray-300">{med.dosage}</span></div>
                      <div><span className="text-gray-500">Frequency:</span> <span className="text-gray-300">{med.frequency}</span></div>
                      <div><span className="text-gray-500">Duration:</span> <span className="text-gray-300">{med.duration || 'As directed'}</span></div>
                      <div><span className="text-gray-500">Route:</span> <span className="text-gray-300">{med.route}</span></div>
                    </div>
                    {med.instructions && (
                      <p className="text-xs text-gray-400 italic mt-2">📋 {med.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {prescription.notes && (
            <div className="card">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Notes</h3>
              <p className="text-sm text-gray-300">{prescription.notes}</p>
            </div>
          )}

          {prescription.follow_up_date && (
            <div className="card flex items-center gap-2">
              <Calendar size={14} className="text-mint" />
              <span className="text-sm">
                Follow-up: {format(new Date(prescription.follow_up_date), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Transcript */}
      {consultation.transcript && (
        <div className="card">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Mic size={14} className="text-gray-500" />
              <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Transcript</span>
            </div>
            {showTranscript ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
          </button>
          {showTranscript && (
            <div className="mt-3 pt-3 border-t border-surface-200">
              <p className="text-sm text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">
                {consultation.transcript}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}