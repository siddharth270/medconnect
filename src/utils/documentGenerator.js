// =============================================================
// Document Generator — Prescription & SOAP Note PDF Generation
// Creates professional medical documents from consultation data
// Uses browser print-to-PDF (no external dependencies)
// =============================================================

/**
 * Generate and open a printable Prescription document
 */
export function generatePrescriptionDocument({
  doctor,
  patient,
  prescription,
  medications,
  consultation,
}) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const followUpDate = prescription.follow_up_date
    ? new Date(prescription.follow_up_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const medsHTML = (medications || []).map((med, i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#1e293b;">
        ${i + 1}. ${med.medication_name || 'N/A'}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#334155;">
        ${med.dosage || '—'}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#334155;">
        ${med.frequency || '—'}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#334155;">
        ${med.duration || 'As directed'}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#334155;">
        ${med.route || 'Oral'}
      </td>
    </tr>
    ${med.instructions ? `
    <tr>
      <td colspan="5" style="padding:4px 12px 10px 28px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#64748b;font-style:italic;">
        ⚕ ${med.instructions}
      </td>
    </tr>` : ''}
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Prescription — ${patient.full_name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1e293b;
      background: #fff;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: A4;
      margin: 15mm;
    }

    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 40px;
    }

    @media print {
      .page { padding: 0; }
      .no-print { display: none !important; }
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
      margin-bottom: 24px;
    }

    .logo-section h1 {
      font-size: 28px;
      font-weight: 700;
      color: #2563eb;
      letter-spacing: -0.5px;
    }

    .logo-section .subtitle {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 2px;
    }

    .rx-badge {
      background: #2563eb;
      color: #fff;
      font-size: 32px;
      font-weight: 700;
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: serif;
    }

    .doctor-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
    }

    .doctor-info .label {
      font-size: 10px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }

    .doctor-info .value {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }

    .doctor-info .value.small {
      font-size: 12px;
      font-weight: 400;
      color: #475569;
    }

    .patient-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
    }

    .info-card .label {
      font-size: 10px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .info-card .value {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #dbeafe;
    }

    .diagnosis-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-left: 4px solid #2563eb;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }

    .diagnosis-box .label {
      font-size: 10px;
      color: #3b82f6;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .diagnosis-box .value {
      font-size: 15px;
      font-weight: 500;
      color: #1e40af;
    }

    .meds-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }

    .meds-table thead th {
      background: #f1f5f9;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      border-bottom: 2px solid #e2e8f0;
    }

    .notes-box {
      background: #fefce8;
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }

    .notes-box .label {
      font-size: 10px;
      color: #d97706;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
      font-weight: 600;
    }

    .notes-box .value {
      font-size: 13px;
      color: #92400e;
      line-height: 1.6;
    }

    .followup-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #22c55e;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 30px;
    }

    .followup-box .label {
      font-size: 10px;
      color: #16a34a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .followup-box .value {
      font-size: 15px;
      font-weight: 600;
      color: #15803d;
      margin-top: 2px;
    }

    .signature-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }

    .signature-line {
      text-align: center;
    }

    .signature-line .line {
      width: 200px;
      border-bottom: 2px solid #1e293b;
      margin-bottom: 6px;
      height: 40px;
    }

    .signature-line .name {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    .signature-line .detail {
      font-size: 11px;
      color: #64748b;
    }

    .date-stamp {
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }

    .footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }

    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(37,99,235,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 100;
    }

    .print-btn:hover { background: #1d4ed8; }

    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 24px;
    }

    .vital-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }

    .vital-item .label {
      font-size: 9px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .vital-item .value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Print Button -->
    <button class="print-btn no-print" onclick="window.print()">
      🖨 Save as PDF / Print
    </button>

    <!-- Header -->
    <div class="header">
      <div class="logo-section">
        <h1>MedConnect</h1>
        <div class="subtitle">Clinical Prescription Document</div>
      </div>
      <div class="rx-badge">Rx</div>
    </div>

    <!-- Doctor Info -->
    <div class="doctor-info">
      <div>
        <div class="label">Prescribing Physician</div>
        <div class="value">Dr. ${doctor.full_name || 'N/A'}</div>
        <div class="value small">${doctor.specialization || 'General Practice'}</div>
      </div>
      <div style="text-align:center;">
        <div class="label">License No.</div>
        <div class="value">${doctor.license_number || 'N/A'}</div>
      </div>
      <div style="text-align:right;">
        <div class="label">Clinic / Hospital</div>
        <div class="value">${doctor.clinic || 'N/A'}</div>
        <div class="value small">${today}</div>
      </div>
    </div>

    <!-- Patient Info -->
    <div class="patient-section">
      <div class="info-card">
        <div class="label">Patient Name</div>
        <div class="value">${patient.full_name || 'N/A'}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="info-card">
          <div class="label">Age</div>
          <div class="value">${patient.age || 'N/A'}${patient.gender ? ` / ${patient.gender}` : ''}</div>
        </div>
        <div class="info-card">
          <div class="label">Blood Group</div>
          <div class="value">${patient.blood_group || 'N/A'}</div>
        </div>
      </div>
    </div>

    <!-- Vitals -->
    ${(patient.blood_pressure || patient.heart_rate || patient.temperature || patient.oxygen_sat) ? `
    <div class="vitals-grid">
      ${patient.blood_pressure ? `<div class="vital-item"><div class="label">Blood Pressure</div><div class="value">${patient.blood_pressure}</div></div>` : ''}
      ${patient.heart_rate ? `<div class="vital-item"><div class="label">Heart Rate</div><div class="value">${patient.heart_rate} bpm</div></div>` : ''}
      ${patient.temperature ? `<div class="vital-item"><div class="label">Temperature</div><div class="value">${patient.temperature}°F</div></div>` : ''}
      ${patient.oxygen_sat ? `<div class="vital-item"><div class="label">SpO₂</div><div class="value">${patient.oxygen_sat}%</div></div>` : ''}
    </div>` : ''}

    <!-- Allergies -->
    ${patient.allergies?.length ? `
    <div class="notes-box" style="background:#fef2f2;border-color:#fecaca;border-left-color:#ef4444;margin-bottom:20px;">
      <div class="label" style="color:#dc2626;">⚠ Known Allergies</div>
      <div class="value" style="color:#991b1b;font-weight:600;">${patient.allergies.join(', ')}</div>
    </div>` : ''}

    <!-- Diagnosis -->
    <div class="diagnosis-box">
      <div class="label">Diagnosis</div>
      <div class="value">${prescription.diagnosis || 'Pending physician review'}</div>
    </div>

    <!-- Medications -->
    <div class="section-title">Prescribed Medications</div>
    ${medications?.length ? `
    <table class="meds-table">
      <thead>
        <tr>
          <th>Medication</th>
          <th>Dosage</th>
          <th>Frequency</th>
          <th>Duration</th>
          <th>Route</th>
        </tr>
      </thead>
      <tbody>
        ${medsHTML}
      </tbody>
    </table>` : '<p style="color:#94a3b8;font-style:italic;margin-bottom:24px;">No medications prescribed.</p>'}

    <!-- Notes -->
    ${prescription.notes ? `
    <div class="notes-box">
      <div class="label">📋 Additional Notes & Instructions</div>
      <div class="value">${prescription.notes}</div>
    </div>` : ''}

    <!-- Follow-up -->
    ${followUpDate ? `
    <div class="followup-box">
      <div class="label">📅 Follow-up Appointment</div>
      <div class="value">${followUpDate}</div>
    </div>` : ''}

    <!-- Signature -->
    <div class="signature-area">
      <div class="signature-line">
        <div class="line"></div>
        <div class="name">Dr. ${doctor.full_name || ''}</div>
        <div class="detail">${doctor.specialization || 'General Practice'} · Lic: ${doctor.license_number || 'N/A'}</div>
      </div>
      <div class="date-stamp">
        <div>Date: ${today}</div>
        <div style="margin-top:4px;font-size:10px;">Generated via MedConnect</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>This prescription is digitally generated and valid as per applicable regulations.</div>
      <div>MedConnect · Clinical Platform</div>
    </div>
  </div>
</body>
</html>`;

  openPrintWindow(html, `Prescription_${patient.full_name}_${new Date().toISOString().split('T')[0]}`);
}


/**
 * Generate and open a printable SOAP Note document
 */
export function generateSOAPDocument({
  doctor,
  patient,
  soapNote,
  consultation,
}) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const followUpDate = soapNote.follow_up_date
    ? new Date(soapNote.follow_up_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const soapSections = [
    { key: 'subjective', label: 'S — Subjective', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', desc: 'Patient-reported symptoms, concerns, and history' },
    { key: 'objective', label: 'O — Objective', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', desc: 'Clinical findings, vitals, and examination results' },
    { key: 'assessment', label: 'A — Assessment', color: '#d97706', bg: '#fefce8', border: '#fde68a', desc: 'Diagnosis and clinical impression' },
    { key: 'plan', label: 'P — Plan', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', desc: 'Treatment plan, medications, and follow-up' },
  ];

  const soapHTML = soapSections.map(({ key, label, color, bg, border, desc }) => {
    const content = soapNote[key];
    if (!content) return '';
    return `
      <div style="background:${bg};border:1px solid ${border};border-left:4px solid ${color};border-radius:8px;padding:16px 20px;margin-bottom:14px;">
        <div style="font-size:14px;font-weight:700;color:${color};margin-bottom:2px;">${label}</div>
        <div style="font-size:10px;color:#94a3b8;margin-bottom:8px;">${desc}</div>
        <div style="font-size:13px;color:#1e293b;line-height:1.7;white-space:pre-wrap;">${content}</div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SOAP Note — ${patient.full_name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1e293b;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page { size: A4; margin: 15mm; }

    .page { max-width: 210mm; margin: 0 auto; padding: 40px; }

    @media print {
      .page { padding: 0; }
      .no-print { display: none !important; }
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
      margin-bottom: 24px;
    }

    .logo-section h1 { font-size: 28px; font-weight: 700; color: #2563eb; }
    .logo-section .subtitle { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }

    .soap-badge {
      background: #2563eb;
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      padding: 12px 20px;
      border-radius: 14px;
      letter-spacing: 2px;
    }

    .info-row {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .info-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
    }

    .info-card .label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
    .info-card .value { font-size: 14px; font-weight: 500; color: #1e293b; }
    .info-card .value.small { font-size: 12px; font-weight: 400; color: #475569; }

    .icd-codes { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .icd-tag {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      font-family: monospace;
    }

    .followup-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #22c55e;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }

    .followup-box .label { font-size: 10px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
    .followup-box .value { font-size: 15px; font-weight: 600; color: #15803d; margin-top: 2px; }

    .signature-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }

    .signature-line { text-align: center; }
    .signature-line .line { width: 200px; border-bottom: 2px solid #1e293b; margin-bottom: 6px; height: 40px; }
    .signature-line .name { font-size: 13px; font-weight: 600; color: #1e293b; }
    .signature-line .detail { font-size: 11px; color: #64748b; }

    .footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }

    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(37,99,235,0.3);
      z-index: 100;
    }

    .print-btn:hover { background: #1d4ed8; }

    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }

    .vital-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }

    .vital-item .label { font-size: 9px; color: #94a3b8; text-transform: uppercase; }
    .vital-item .value { font-size: 16px; font-weight: 600; color: #1e293b; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="page">
    <button class="print-btn no-print" onclick="window.print()">🖨 Save as PDF / Print</button>

    <!-- Header -->
    <div class="header">
      <div class="logo-section">
        <h1>MedConnect</h1>
        <div class="subtitle">Clinical SOAP Note</div>
      </div>
      <div class="soap-badge">SOAP</div>
    </div>

    <!-- Doctor & Patient Info -->
    <div class="info-row">
      <div class="info-card">
        <div class="label">Physician</div>
        <div class="value">Dr. ${doctor.full_name || 'N/A'}</div>
        <div class="value small">${doctor.specialization || 'General Practice'}</div>
      </div>
      <div class="info-card">
        <div class="label">Patient</div>
        <div class="value">${patient.full_name || 'N/A'}</div>
        <div class="value small">${patient.age ? `Age ${patient.age}` : ''}${patient.gender ? ` · ${patient.gender}` : ''}</div>
      </div>
      <div class="info-card">
        <div class="label">Date</div>
        <div class="value">${today}</div>
        ${consultation?.duration_secs ? `<div class="value small">Duration: ${Math.floor(consultation.duration_secs / 60)}m ${consultation.duration_secs % 60}s</div>` : ''}
      </div>
    </div>

    <!-- Vitals -->
    ${(patient.blood_pressure || patient.heart_rate || patient.temperature || patient.oxygen_sat) ? `
    <div class="vitals-grid">
      ${patient.blood_pressure ? `<div class="vital-item"><div class="label">BP</div><div class="value">${patient.blood_pressure}</div></div>` : ''}
      ${patient.heart_rate ? `<div class="vital-item"><div class="label">Heart Rate</div><div class="value">${patient.heart_rate} bpm</div></div>` : ''}
      ${patient.temperature ? `<div class="vital-item"><div class="label">Temp</div><div class="value">${patient.temperature}°F</div></div>` : ''}
      ${patient.oxygen_sat ? `<div class="vital-item"><div class="label">SpO₂</div><div class="value">${patient.oxygen_sat}%</div></div>` : ''}
    </div>` : ''}

    <!-- SOAP Sections -->
    ${soapHTML}

    <!-- ICD Codes -->
    ${soapNote.icd_codes?.length ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">ICD-10 Codes</div>
      <div class="icd-codes">
        ${soapNote.icd_codes.map(c => `<span class="icd-tag">${c}</span>`).join('')}
      </div>
    </div>` : ''}

    <!-- Follow-up -->
    ${followUpDate ? `
    <div class="followup-box">
      <div class="label">📅 Follow-up Appointment</div>
      <div class="value">${followUpDate}</div>
    </div>` : ''}

    <!-- Signature -->
    <div class="signature-area">
      <div class="signature-line">
        <div class="line"></div>
        <div class="name">Dr. ${doctor.full_name || ''}</div>
        <div class="detail">${doctor.specialization || 'General Practice'} · Lic: ${doctor.license_number || 'N/A'}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#64748b;">
        <div>Date: ${today}</div>
        <div style="margin-top:4px;font-size:10px;">Generated via MedConnect</div>
      </div>
    </div>

    <div class="footer">
      <div>Confidential medical document — For authorized use only.</div>
      <div>MedConnect · Clinical Platform</div>
    </div>
  </div>
</body>
</html>`;

  openPrintWindow(html, `SOAP_Note_${patient.full_name}_${new Date().toISOString().split('T')[0]}`);
}


/**
 * Open a new window with the document HTML for printing / saving as PDF
 */
function openPrintWindow(html, title) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Popup blocked — fallback to blob URL
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = title;
}
