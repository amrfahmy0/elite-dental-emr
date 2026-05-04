'use client';

import React from 'react';
import type { Visit, Patient, AppUser } from '@/lib/types';

interface Medication {
  name: string;
  amount: string;
  frequency: string;
  duration: string;
}

interface PrescriptionPrintProps {
  visit: Visit & { doctor: AppUser };
  patient: Patient;
}

// ─── QR Code Placeholder SVG ─────────────────────────────────────────────────
function QRCodeSVG() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top-left finder */}
      <rect x="2" y="2" width="22" height="22" rx="2" fill="none" stroke="#1a1a2e" strokeWidth="2"/>
      <rect x="6" y="6" width="14" height="14" rx="1" fill="#1a1a2e"/>
      {/* Top-right finder */}
      <rect x="56" y="2" width="22" height="22" rx="2" fill="none" stroke="#1a1a2e" strokeWidth="2"/>
      <rect x="60" y="6" width="14" height="14" rx="1" fill="#1a1a2e"/>
      {/* Bottom-left finder */}
      <rect x="2" y="56" width="22" height="22" rx="2" fill="none" stroke="#1a1a2e" strokeWidth="2"/>
      <rect x="6" y="60" width="14" height="14" rx="1" fill="#1a1a2e"/>
      {/* Data modules (mock pattern) */}
      <rect x="28" y="2" width="4" height="4" fill="#1a1a2e"/>
      <rect x="34" y="2" width="4" height="4" fill="#1a1a2e"/>
      <rect x="28" y="8" width="4" height="4" fill="#1a1a2e"/>
      <rect x="34" y="14" width="4" height="4" fill="#1a1a2e"/>
      <rect x="40" y="8" width="4" height="4" fill="#1a1a2e"/>
      <rect x="46" y="2" width="4" height="4" fill="#1a1a2e"/>
      <rect x="46" y="14" width="4" height="4" fill="#1a1a2e"/>
      <rect x="28" y="28" width="4" height="4" fill="#1a1a2e"/>
      <rect x="34" y="28" width="4" height="4" fill="#1a1a2e"/>
      <rect x="40" y="34" width="4" height="4" fill="#1a1a2e"/>
      <rect x="46" y="28" width="4" height="4" fill="#1a1a2e"/>
      <rect x="52" y="34" width="4" height="4" fill="#1a1a2e"/>
      <rect x="58" y="28" width="4" height="4" fill="#1a1a2e"/>
      <rect x="64" y="34" width="4" height="4" fill="#1a1a2e"/>
      <rect x="70" y="28" width="4" height="4" fill="#1a1a2e"/>
      <rect x="2" y="28" width="4" height="4" fill="#1a1a2e"/>
      <rect x="8" y="34" width="4" height="4" fill="#1a1a2e"/>
      <rect x="14" y="28" width="4" height="4" fill="#1a1a2e"/>
      <rect x="20" y="34" width="4" height="4" fill="#1a1a2e"/>
      <rect x="28" y="46" width="4" height="4" fill="#1a1a2e"/>
      <rect x="34" y="52" width="4" height="4" fill="#1a1a2e"/>
      <rect x="40" y="46" width="4" height="4" fill="#1a1a2e"/>
      <rect x="46" y="52" width="4" height="4" fill="#1a1a2e"/>
      <rect x="52" y="46" width="4" height="4" fill="#1a1a2e"/>
      <rect x="58" y="52" width="4" height="4" fill="#1a1a2e"/>
      <rect x="64" y="46" width="4" height="4" fill="#1a1a2e"/>
      <rect x="70" y="52" width="4" height="4" fill="#1a1a2e"/>
      <rect x="28" y="58" width="4" height="4" fill="#1a1a2e"/>
      <rect x="34" y="64" width="4" height="4" fill="#1a1a2e"/>
      <rect x="40" y="58" width="4" height="4" fill="#1a1a2e"/>
      <rect x="46" y="70" width="4" height="4" fill="#1a1a2e"/>
      <rect x="52" y="58" width="4" height="4" fill="#1a1a2e"/>
      <rect x="58" y="64" width="4" height="4" fill="#1a1a2e"/>
      <rect x="64" y="70" width="4" height="4" fill="#1a1a2e"/>
      <rect x="70" y="64" width="4" height="4" fill="#1a1a2e"/>
    </svg>
  );
}

// ─── Tooth Logo SVG ───────────────────────────────────────────────────────────
function ToothLogo({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 3C14 3 8 7 8 14c0 4 1.5 7 3 9.5C12.5 26 13 29 13 32c0 2 .5 4 1.5 5.5C15.5 39 17 40 18.5 40c1.5 0 2-1 2-3 0 0 .5-4 2.5-4s2.5 4 2.5 4c0 2 .5 3 2 3 1.5 0 3-1 4-2.5C32.5 36 33 34 33 32c0-3 .5-6 2-8.5C36.5 21 38 18 38 14 38 7 32 3 26 3c-1.5 0-3 .3-4 1-.8.5-1.2.5-2 0C19 3.3 17.5 3 16 3"
        fill="#C9A84C"
        stroke="#A87E30"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PrescriptionPrint({ visit, patient }: PrescriptionPrintProps) {
  const doctorName = visit.doctor?.full_name?.startsWith('Dr.')
    ? visit.doctor.full_name
    : `Dr. ${visit.doctor?.full_name ?? 'Unknown'}`;

  const visitDate = new Date(visit.visit_date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : null;

  // Parse medications
  let medications: Medication[] = [];
  if (visit.prescription) {
    try {
      const parsed = JSON.parse(visit.prescription);
      if (Array.isArray(parsed)) medications = parsed;
    } catch {
      // raw string — treat as single note
      medications = [{ name: visit.prescription, amount: '', frequency: '', duration: '' }];
    }
  }

  return (
    /**
     * IMPORTANT: This element is invisible on screen (hidden).
     * When window.print() fires, it becomes fixed + full-page (print:block etc.)
     * and every other layout element is hidden via print:hidden in the layouts.
     */
    <div
      className="hidden print:block print:fixed print:inset-0 print:w-full print:h-full print:bg-white print:text-black print:z-[99999] print:overflow-hidden"
      aria-hidden="true"
    >
      {/* ── Full-page wrapper ── */}
      <div className="relative w-full h-full flex flex-col font-sans" style={{ fontFamily: "'Segoe UI', 'Arial', sans-serif" }}>

        {/* ── Watermark ── */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 0 }}>
          <ToothLogo className="w-72 h-72 opacity-[0.04]" />
        </div>

        {/* ── Content wrapper (above watermark) ── */}
        <div className="relative flex flex-col h-full p-10" style={{ zIndex: 1 }}>

          {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
          <div
            className="flex items-center justify-between pb-5 mb-6"
            style={{ borderBottom: '2px solid #C9A84C' }}
          >
            {/* Left: Logo + Clinic Name */}
            <div className="flex items-center gap-3">
              <ToothLogo className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none" style={{ color: '#0B1220' }}>
                  Elite Dental Studio
                </h1>
                <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: '#C9A84C' }}>
                  Premium Dental Care · Est. 2019
                </p>
              </div>
            </div>

            {/* Right: Doctor info */}
            <div className="text-right">
              <p className="text-lg font-bold leading-tight" style={{ color: '#0B1220' }}>{doctorName}</p>
              <p className="text-xs mt-0.5" style={{ color: '#555' }}>B.D.S · M.Sc. Oral Surgery</p>
              <p className="text-xs" style={{ color: '#555' }}>License #: EDS-DOC-0042</p>
            </div>
          </div>

          {/* ══ PATIENT INFO STRIP ══════════════════════════════════════════════ */}
          <div
            className="flex items-center justify-between px-5 py-3 rounded-lg mb-6 text-sm"
            style={{ background: '#f7f7f7', border: '1px solid #e5e5e5' }}
          >
            <div>
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#999' }}>Patient</span>
              <p className="font-bold text-base leading-tight mt-0.5" style={{ color: '#0B1220' }}>
                {patient.first_name} {patient.last_name}
              </p>
              <p className="text-xs" style={{ color: '#555' }}>ID: {patient.patient_id}</p>
            </div>
            {age !== null && (
              <div className="text-center">
                <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#999' }}>Age</span>
                <p className="font-bold text-base leading-tight mt-0.5" style={{ color: '#0B1220' }}>{age} yrs</p>
                <p className="text-xs" style={{ color: '#555' }}>{patient.gender}</p>
              </div>
            )}
            {visit.diagnosis && (
              <div className="text-center max-w-[220px]">
                <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#999' }}>Diagnosis</span>
                <p className="text-sm font-semibold leading-tight mt-0.5" style={{ color: '#0B1220' }}>{visit.diagnosis}</p>
              </div>
            )}
            <div className="text-right">
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#999' }}>Date</span>
              <p className="font-semibold text-sm leading-tight mt-0.5" style={{ color: '#0B1220' }}>{visitDate}</p>
              {visit.tooth_numbers && (
                <p className="text-xs mt-0.5" style={{ color: '#555' }}>Tooth #{visit.tooth_numbers}</p>
              )}
            </div>
          </div>

          {/* ══ Rx BODY ════════════════════════════════════════════════════════ */}
          <div className="flex-1">
            {/* Rx symbol */}
            <div className="flex items-baseline gap-3 mb-5">
              <span
                className="font-black leading-none select-none"
                style={{ fontSize: '2.5rem', color: '#0B1220', fontFamily: 'Georgia, serif' }}
              >
                ℞
              </span>
              <div style={{ height: '2px', flex: 1, background: '#e5e5e5' }} />
            </div>

            {/* Medication list */}
            {medications.length === 0 ? (
              <p className="text-sm italic" style={{ color: '#aaa' }}>No medications prescribed for this visit.</p>
            ) : (
              <div className="space-y-5">
                {medications.map((med, i) => (
                  <div key={i} className="flex gap-4">
                    {/* Number bubble */}
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mt-0.5"
                      style={{ background: '#C9A84C', color: '#fff' }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-base leading-tight" style={{ color: '#0B1220' }}>
                        {med.name}
                      </p>
                      {(med.amount || med.frequency || med.duration) && (
                        <p className="text-sm italic mt-0.5" style={{ color: '#555' }}>
                          {[
                            med.amount ? `${med.amount} tablet${med.amount !== '1' ? 's' : ''}` : null,
                            med.frequency ? `every ${med.frequency} hours` : null,
                            med.duration ? `for ${med.duration} days` : null,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Clinical notes */}
            {visit.medical_notes && (
              <div className="mt-8 pt-4" style={{ borderTop: '1px dashed #ddd' }}>
                <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: '#999' }}>
                  Clinical Notes
                </p>
                <p className="text-sm italic" style={{ color: '#444' }}>{visit.medical_notes}</p>
              </div>
            )}

            {/* Validity notice */}
            <div className="mt-8 flex items-center gap-2">
              <div style={{ flex: 1, height: '1px', background: '#eee' }} />
              <p className="text-xs" style={{ color: '#bbb' }}>
                Valid for 30 days from {visitDate}
              </p>
              <div style={{ flex: 1, height: '1px', background: '#eee' }} />
            </div>

            {/* Doctor's signature area */}
            <div className="flex justify-end mt-8">
              <div className="text-center">
                <div style={{ width: '160px', height: '1px', background: '#0B1220', marginBottom: '4px' }} />
                <p className="text-xs font-semibold" style={{ color: '#0B1220' }}>{doctorName}</p>
                <p className="text-xs" style={{ color: '#999' }}>Signature &amp; Stamp</p>
              </div>
            </div>
          </div>

          {/* ══ FOOTER ═════════════════════════════════════════════════════════ */}
          <div
            className="mt-auto pt-4 flex items-end justify-between"
            style={{ borderTop: '1.5px solid #C9A84C' }}
          >
            {/* Address + Phone */}
            <div>
              <p className="text-xs font-semibold" style={{ color: '#0B1220' }}>📍 123 Health Ave, Medical District, Cairo</p>
              <p className="text-xs mt-0.5" style={{ color: '#555' }}>📞 +20 100 000 0000 &nbsp;·&nbsp; +20 111 000 0000</p>
              <p className="text-xs mt-0.5" style={{ color: '#C9A84C' }}>
                @EliteDentalStudio &nbsp;·&nbsp; @EliteDentalCairo
              </p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-1">
              <QRCodeSVG />
              <p className="text-[9px] text-center leading-tight" style={{ color: '#888', maxWidth: '80px' }}>
                Scan to book your follow-up
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
