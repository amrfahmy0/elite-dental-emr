'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import type { Visit, Patient, AppUser } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type PrintLang = 'en' | 'ar';

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

// ─── Translation helper ────────────────────────────────────────────────────────
// Keeps all bilingual strings in one place for easy editing.
const t = (lang: PrintLang, key: string): string => {
  const translations: Record<string, Record<PrintLang, string>> = {
    patient:          { en: 'Patient',          ar: 'المريض'                        },
    age:              { en: 'Age',              ar: 'السن'                           },
    yrs:              { en: 'yrs',              ar: 'سنة'                            },
    diagnosis:        { en: 'Diagnosis',        ar: 'التشخيص'                       },
    date:             { en: 'Date',             ar: 'التاريخ'                        },
    tooth:            { en: 'Tooth #',          ar: 'سن رقم'                        },
    clinicalNotes:    { en: 'Clinical Notes',   ar: 'ملاحظات سريرية'                },
    noMeds:           { en: 'No medications prescribed for this visit.',
                        ar: 'لا توجد أدوية موصوفة لهذه الزيارة.'                   },
    validFor:         { en: 'Valid for 30 days from',
                        ar: 'صالح لمدة 30 يومًا من'                                },
    signatureStamp:   { en: 'Signature & Stamp', ar: 'التوقيع والختم'              },
    tabletSingular:   { en: 'tablet',           ar: 'قرص'                           },
    tabletPlural:     { en: 'tablets',          ar: 'أقراص'                         },
    every:            { en: 'every',            ar: 'كل'                            },
    hours:            { en: 'hours',            ar: 'ساعات'                         },
    forDuration:      { en: 'for',              ar: 'لمدة'                          },
    days:             { en: 'days',             ar: 'أيام'                          },
    qrCaption:        { en: 'Scan to book your follow-up appointment',
                        ar: 'امسح الكود لحجز موعدك القادم'                         },
    subtitleEn:       { en: 'Premium Dental Care · Est. 2019',
                        ar: 'رعاية أسنان متميزة · تأسست 2019'                     },
    bds:              { en: 'B.D.S · M.Sc. Oral Surgery',
                        ar: 'بكالوريوس طب الأسنان · ماجستير جراحة الفم'           },
    license:          { en: 'License #: EDS-DOC-0042', ar: 'رقم الترخيص: EDS-DOC-0042' },
    address:          { en: '📍 123 Health Ave, Medical District, Cairo',
                        ar: '📍 123 شارع الصحة، الحي الطبي، القاهرة'              },
    phone:            { en: '📞 +20 100 000 0000 · +20 111 000 0000',
                        ar: '📞 ٢٠١٠٠٠٠٠٠٠٠+ · ٢٠١١١٠٠٠٠٠٠٠+'                    },
  };
  return translations[key]?.[lang] ?? key;
};

// ─── QR Code Placeholder SVG ──────────────────────────────────────────────────
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

// ─── The actual printable sheet (pure layout, no screen styles) ───────────────
const PrescriptionSheet = React.forwardRef<
  HTMLDivElement,
  { visit: Visit & { doctor: AppUser }; patient: Patient; lang: PrintLang }
>(function PrescriptionSheet({ visit, patient, lang }, ref) {
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  const doctorName = visit.doctor?.full_name?.startsWith('Dr.')
    ? visit.doctor.full_name
    : `Dr. ${visit.doctor?.full_name ?? 'Unknown'}`;

  // Arabic date formatting keeps the same Gregorian calendar but in Arabic locale
  const visitDate = new Date(visit.visit_date).toLocaleDateString(
    isAr ? 'ar-EG' : 'en-GB',
    { day: '2-digit', month: 'long', year: 'numeric' },
  );

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

  // Arabic font stack — Noto Sans Arabic is widely available on most OSes/printers
  const fontFamily = isAr
    ? "'Noto Sans Arabic', 'Segoe UI', Arial, sans-serif"
    : "'Segoe UI', Arial, sans-serif";

  return (
    <div
      ref={ref}
      dir={dir}
      style={{
        backgroundColor: '#ffffff',
        color: '#000000',
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm 18mm',
        fontFamily,
        position: 'relative',
        boxSizing: 'border-box',
        // Ensure text direction is inherited by all children
        direction: dir,
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

        {/* ══ HEADER ══
            Uses flexbox — dir="rtl" on the root already mirrors the row order,
            so logo ends up on the right in Arabic and left in English. */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: '16px', marginBottom: '20px',
          borderBottom: '2.5px solid #C9A84C',
        }}>
          {/* Clinic brand (start side) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ToothLogo size={48} />
            <div>
              <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: isAr ? '0' : '-0.5px', color: '#0B1220', lineHeight: 1 }}>
                Elite Dental Studio
              </div>
              <div style={{ fontSize: '10px', letterSpacing: isAr ? '0' : '2px', textTransform: 'uppercase', color: '#C9A84C', marginTop: '3px' }}>
                {t(lang, 'subtitleEn')}
              </div>
            </div>
          </div>

          {/* Doctor info (end side) — text-align follows dir automatically */}
          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0B1220' }}>{doctorName}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{t(lang, 'bds')}</div>
            <div style={{ fontSize: '11px', color: '#555' }}>{t(lang, 'license')}</div>
          </div>
        </div>

        {/* ══ PATIENT STRIP ══ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderRadius: '8px', marginBottom: '24px',
          backgroundColor: '#f7f7f7', border: '1px solid #e5e5e5',
        }}>
          {/* Patient name / ID */}
          <div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600 }}>
              {t(lang, 'patient')}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0B1220', marginTop: '2px' }}>
              {patient.first_name} {patient.last_name}
            </div>
            <div style={{ fontSize: '11px', color: '#555' }}>ID: {patient.patient_id}</div>
          </div>

          {/* Age */}
          {age !== null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600 }}>
                {t(lang, 'age')}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0B1220', marginTop: '2px' }}>
                {age} {t(lang, 'yrs')}
              </div>
              <div style={{ fontSize: '11px', color: '#555' }}>{patient.gender}</div>
            </div>
          )}

          {/* Diagnosis */}
          {visit.diagnosis && (
            <div style={{ textAlign: 'center', maxWidth: '200px' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600 }}>
                {t(lang, 'diagnosis')}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0B1220', marginTop: '2px' }}>
                {visit.diagnosis}
              </div>
            </div>
          )}

          {/* Date */}
          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600 }}>
              {t(lang, 'date')}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0B1220', marginTop: '2px' }}>{visitDate}</div>
            {visit.tooth_numbers && (
              <div style={{ fontSize: '11px', color: '#555' }}>
                {t(lang, 'tooth')}{visit.tooth_numbers}
              </div>
            )}
          </div>
        </div>

        {/* ══ Rx BODY ══ */}
        <div style={{ flex: 1 }}>
          {/* Rx symbol + rule — ℞ always stays LTR regardless of page direction */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span
              dir="ltr"
              style={{ fontFamily: 'Georgia, serif', fontSize: '40px', fontWeight: 900, color: '#0B1220', lineHeight: 1 }}
            >
              ℞
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
          </div>

          {/* Medications */}
          {medications.length === 0 ? (
            <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#aaa' }}>
              {t(lang, 'noMeds')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {medications.map((med, i) => {
                // Build dosage string respecting language
                const tabletWord = med.amount !== '1' ? t(lang, 'tabletPlural') : t(lang, 'tabletSingular');
                const dosageParts = [
                  med.amount    ? `${med.amount} ${tabletWord}` : null,
                  med.frequency ? `${t(lang, 'every')} ${med.frequency} ${t(lang, 'hours')}` : null,
                  med.duration  ? `${t(lang, 'forDuration')} ${med.duration} ${t(lang, 'days')}` : null,
                ].filter(Boolean).join(' · ');

                return (
                  <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    {/* Numbered bullet */}
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
                      {dosageParts && (
                        <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#555', marginTop: '3px' }}>
                          {dosageParts}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Clinical notes */}
          {visit.medical_notes && (
            <div style={{ marginTop: '28px', paddingTop: '14px', borderTop: '1px dashed #ddd' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600, marginBottom: '4px' }}>
                {t(lang, 'clinicalNotes')}
              </div>
              <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#444' }}>{visit.medical_notes}</div>
            </div>
          )}

          {/* Validity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '32px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }} />
            <span style={{ fontSize: '10px', color: '#bbb', whiteSpace: 'nowrap' }}>
              {t(lang, 'validFor')} {visitDate}
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }} />
          </div>

          {/* Signature — always pinned to the end of the line (right in LTR, left in RTL) */}
          <div style={{ display: 'flex', justifyContent: isAr ? 'flex-start' : 'flex-end', marginTop: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '160px', height: '1px', backgroundColor: '#0B1220', marginBottom: '4px' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0B1220' }}>{doctorName}</div>
              <div style={{ fontSize: '10px', color: '#999' }}>{t(lang, 'signatureStamp')}</div>
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
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#0B1220' }}>{t(lang, 'address')}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{t(lang, 'phone')}</div>
            <div style={{ fontSize: '11px', color: '#C9A84C', marginTop: '2px' }}>@EliteDentalStudio · @EliteDentalCairo</div>
          </div>
          {/* QR block — column direction so stacking is direction-agnostic */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <QRCodeSVG />
            <div style={{ fontSize: '8px', color: '#888', textAlign: 'center', maxWidth: '90px', lineHeight: 1.3 }}>
              {t(lang, 'qrCaption')}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

// ─── Public component: owns the ref, language state, toggle UI + print trigger ─
export default function PrescriptionPrint({ visit, patient, triggerLabel = 'Print Prescription' }: PrescriptionPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printLang, setPrintLang] = useState<PrintLang>('en');

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Prescription_${patient.first_name}_${patient.last_name}_${visit.id.slice(0, 8)}`,
    ignoreGlobalStyles: true,
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
      {/* ── Language toggle + print button row ── */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">

        {/* Segmented control */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.18)',
          }}
          role="group"
          aria-label="Print language"
        >
          {/* English option */}
          <button
            onClick={() => setPrintLang('en')}
            className="px-3 py-1 text-xs font-semibold transition-all duration-200"
            style={
              printLang === 'en'
                ? { background: '#C9A84C', color: '#070E1A' }
                : { background: 'transparent', color: '#C9A84C' }
            }
            aria-pressed={printLang === 'en'}
          >
            EN
          </button>

          {/* Divider */}
          <div style={{ width: '1px', height: '20px', background: 'rgba(201,168,76,0.25)' }} />

          {/* Arabic option */}
          <button
            onClick={() => setPrintLang('ar')}
            className="px-3 py-1 text-xs font-bold transition-all duration-200"
            style={
              printLang === 'ar'
                ? { background: '#C9A84C', color: '#070E1A' }
                : { background: 'transparent', color: '#C9A84C' }
            }
            aria-pressed={printLang === 'ar'}
            // The Arabic label itself is always RTL regardless of page direction
            dir="rtl"
          >
            عربي
          </button>
        </div>

        {/* Print trigger */}
        <button
          onClick={onPrintClick}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all hover:scale-105"
          style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}
        >
          <Printer className="w-3.5 h-3.5" />
          {triggerLabel}
          {printLang === 'ar' && <span className="opacity-60 text-[10px]">(عربي)</span>}
        </button>
      </div>

      {/* Hidden sheet — rendered off-screen, picked up by react-to-print */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
        <PrescriptionSheet ref={printRef} visit={visit} patient={patient} lang={printLang} />
      </div>
    </>
  );
}
