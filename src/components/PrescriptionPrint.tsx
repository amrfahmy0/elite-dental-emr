'use client';

import React, { useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
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
  /** Render as a standalone trigger button (default). Pass triggerLabel to customise text. */
  triggerLabel?: string;
}

// ─── QR Code Placeholder SVG ─────────────────────────────────────────────────
function QRCodeSVG() {
  return (
    <svg viewBox="0 0 80 80" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="22" height="22" rx="2" fill="none" stroke="#1a1a2e" strokeWidth="2"/>
      <rect x="6" y="6" width="14" height="14" rx="1" fill="#1a1a2e"/>
      <rect x="56" y="2" width="22" height="22" rx="2" fill="none" stroke="#1a1a2e" strokeWidth="2"/>
      <rect x="60" y="6" width="14" height="14" rx="1" fill="#1a1a2e"/>
      <rect x="2" y="56" width="22" height="22" rx="2" fill="none" stroke="#1a1a2e" strokeWidth="2"/>
      <rect x="6" y="60" width="14" height="14" rx="1" fill="#1a1a2e"/>
      {/* Data modules */}
      {[28,34,40,46].map(x => <rect key={`r1-${x}`} x={x} y="2" width="4" height="4" fill="#1a1a2e"/>)}
      {[28,40,46].map(x => <rect key={`r2-${x}`} x={x} y="8" width="4" height="4" fill="#1a1a2e"/>)}
      {[34,46].map(x => <rect key={`r3-${x}`} x={x} y="14" width="4" height="4" fill="#1a1a2e"/>)}
      {[28,34,46,58,70].map(x => <rect key={`r4-${x}`} x={x} y="28" width="4" height="4" fill="#1a1a2e"/>)}
      {[40,52,64].map(x => <rect key={`r5-${x}`} x={x} y="34" width="4" height="4" fill="#1a1a2e"/>)}
      {[8,20].map(x => <rect key={`r6-${x}`} x={x} y="34" width="4" height="4" fill="#1a1a2e"/>)}
      {[28,40,52,64].map(x => <rect key={`r7-${x}`} x={x} y="46" width="4" height="4" fill="#1a1a2e"/>)}
      {[34,46,58,70].map(x => <rect key={`r8-${x}`} x={x} y="52" width="4" height="4" fill="#1a1a2e"/>)}
      {[28,40,52].map(x => <rect key={`r9-${x}`} x={x} y="58" width="4" height="4" fill="#1a1a2e"/>)}
      {[34,64].map(x => <rect key={`r10-${x}`} x={x} y="64" width="4" height="4" fill="#1a1a2e"/>)}
      {[46,70].map(x => <rect key={`r11-${x}`} x={x} y="70" width="4" height="4" fill="#1a1a2e"/>)}
    </svg>
  );
}

// ─── Tooth SVG Logo ───────────────────────────────────────────────────────────
function ToothLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
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

// ─── The actual printable sheet (pure layout, no print: prefixes) ─────────────
const PrescriptionSheet = React.forwardRef<
  HTMLDivElement,
  { visit: Visit & { doctor: AppUser }; patient: Patient }
>(function PrescriptionSheet({ visit, patient }, ref) {
  const doctorName = visit.doctor?.full_name?.startsWith('Dr.')
    ? visit.doctor.full_name
    : `Dr. ${visit.doctor?.full_name ?? 'Unknown'}`;

  const visitDate = new Date(visit.visit_date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : null;

  let medications: Medication[] = [];
  if (visit.prescription) {
    try {
      const parsed = JSON.parse(visit.prescription);
      if (Array.isArray(parsed)) medications = parsed;
    } catch {
      medications = [{ name: visit.prescription, amount: '', frequency: '', duration: '' }];
    }
  }

  return (
    <div
      ref={ref}
      style={{
        backgroundColor: '#ffffff',
        color: '#000000',
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm 18mm',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Watermark ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 0,
      }}>
        <div style={{ opacity: 0.04 }}>
          <ToothLogo size={280} />
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '257mm' }}>

        {/* ══ HEADER ══ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: '16px', marginBottom: '20px',
          borderBottom: '2.5px solid #C9A84C',
        }}>
          {/* Left: logo + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ToothLogo size={48} />
            <div>
              <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', color: '#0B1220', lineHeight: 1 }}>
                Elite Dental Studio
              </div>
              <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C9A84C', marginTop: '3px' }}>
                Premium Dental Care · Est. 2019
              </div>
            </div>
          </div>
          {/* Right: Doctor */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0B1220' }}>{doctorName}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>B.D.S · M.Sc. Oral Surgery</div>
            <div style={{ fontSize: '11px', color: '#555' }}>License #: EDS-DOC-0042</div>
          </div>
        </div>

        {/* ══ PATIENT STRIP ══ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderRadius: '8px', marginBottom: '24px',
          backgroundColor: '#f7f7f7', border: '1px solid #e5e5e5',
        }}>
          <div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600 }}>Patient</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0B1220', marginTop: '2px' }}>
              {patient.first_name} {patient.last_name}
            </div>
            <div style={{ fontSize: '11px', color: '#555' }}>ID: {patient.patient_id}</div>
          </div>
          {age !== null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600 }}>Age</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0B1220', marginTop: '2px' }}>{age} yrs</div>
              <div style={{ fontSize: '11px', color: '#555' }}>{patient.gender}</div>
            </div>
          )}
          {visit.diagnosis && (
            <div style={{ textAlign: 'center', maxWidth: '200px' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600 }}>Diagnosis</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0B1220', marginTop: '2px' }}>{visit.diagnosis}</div>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600 }}>Date</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0B1220', marginTop: '2px' }}>{visitDate}</div>
            {visit.tooth_numbers && (
              <div style={{ fontSize: '11px', color: '#555' }}>Tooth #{visit.tooth_numbers}</div>
            )}
          </div>
        </div>

        {/* ══ Rx BODY ══ */}
        <div style={{ flex: 1 }}>
          {/* Rx symbol + rule */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '40px', fontWeight: 900, color: '#0B1220', lineHeight: 1 }}>℞</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
          </div>

          {/* Medications */}
          {medications.length === 0 ? (
            <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#aaa' }}>No medications prescribed for this visit.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {medications.map((med, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: '26px', height: '26px', borderRadius: '50%',
                    backgroundColor: '#C9A84C', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 900, marginTop: '2px',
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0B1220', lineHeight: 1.2 }}>{med.name}</div>
                    {(med.amount || med.frequency || med.duration) && (
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#555', marginTop: '3px' }}>
                        {[
                          med.amount ? `${med.amount} tablet${med.amount !== '1' ? 's' : ''}` : null,
                          med.frequency ? `every ${med.frequency} hours` : null,
                          med.duration ? `for ${med.duration} days` : null,
                        ].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Clinical notes */}
          {visit.medical_notes && (
            <div style={{ marginTop: '28px', paddingTop: '14px', borderTop: '1px dashed #ddd' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600, marginBottom: '4px' }}>
                Clinical Notes
              </div>
              <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#444' }}>{visit.medical_notes}</div>
            </div>
          )}

          {/* Validity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '32px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }} />
            <span style={{ fontSize: '10px', color: '#bbb', whiteSpace: 'nowrap' }}>Valid for 30 days from {visitDate}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }} />
          </div>

          {/* Signature */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '160px', height: '1px', backgroundColor: '#0B1220', marginBottom: '4px' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0B1220' }}>{doctorName}</div>
              <div style={{ fontSize: '10px', color: '#999' }}>Signature &amp; Stamp</div>
            </div>
          </div>
        </div>

        {/* ══ FOOTER ══ */}
        <div style={{
          marginTop: 'auto', paddingTop: '16px',
          borderTop: '1.5px solid #C9A84C',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#0B1220' }}>📍 123 Health Ave, Medical District, Cairo</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>📞 +20 100 000 0000 · +20 111 000 0000</div>
            <div style={{ fontSize: '11px', color: '#C9A84C', marginTop: '2px' }}>@EliteDentalStudio · @EliteDentalCairo</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <QRCodeSVG />
            <div style={{ fontSize: '8px', color: '#888', textAlign: 'center', maxWidth: '80px', lineHeight: 1.3 }}>
              Scan to book your follow-up
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

// ─── Public component: owns the ref + print trigger ──────────────────────────
export default function PrescriptionPrint({ visit, patient, triggerLabel = 'Print Prescription' }: PrescriptionPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Prescription_${patient.first_name}_${patient.last_name}_${visit.id.slice(0, 8)}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `,
  });

  const onPrintClick = useCallback(() => {
    handlePrint();
  }, [handlePrint]);

  return (
    <>
      {/* Trigger button — visible on screen */}
      <button
        onClick={onPrintClick}
        className="mt-2 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all hover:scale-105"
        style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}
      >
        <Printer className="w-3.5 h-3.5" />
        {triggerLabel}
      </button>

      {/* Hidden sheet — rendered off-screen, picked up by react-to-print */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
        <PrescriptionSheet ref={printRef} visit={visit} patient={patient} />
      </div>
    </>
  );
}
