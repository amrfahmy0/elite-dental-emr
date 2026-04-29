'use client';

import React, { useState, useTransition } from 'react';
import { createVisitAction, updateVisitAction, deleteVisitAction } from '@/app/actions';
import type { Patient, Visit, AppUser, Service, Attachment } from '@/lib/types';
import {
  AlertTriangle, Heart, Phone, Mail, Calendar, FileText,
  Plus, X, Printer, ChevronDown, ChevronUp, Upload, Pill,
  DollarSign, Stethoscope, Clock, Camera, FlaskConical, FileImage,
  Trash2, Edit2, ZoomIn, ZoomOut, RotateCw, ExternalLink, Download
} from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
function getPublicFileUrl(storagePath: string) {
  // storagePath is like patients/<patientId>/<visitId>/<filename>
  return `${SUPABASE_URL}/storage/v1/object/public/patient-files/${storagePath}`;
}

const CATEGORY_CONFIG = {
  X_RAY:        { label: 'X-Ray',         class: 'badge-xray',         icon: <FileImage className="w-3 h-3" /> },
  LAB_RESULT:   { label: 'Lab Result',    class: 'badge-lab',          icon: <FlaskConical className="w-3 h-3" /> },
  CLINICAL_PHOTO:{ label: 'Clinical Photo',class: 'badge-photo',       icon: <Camera className="w-3 h-3" /> },
  PRESCRIPTION: { label: 'Prescription',  class: 'badge-prescription', icon: <Pill className="w-3 h-3" /> },
  OTHER:        { label: 'Other',         class: 'badge-other',        icon: <FileText className="w-3 h-3" /> },
};

interface Props {
  patient: Patient;
  visits: (Visit & { doctor: AppUser; attachments: Attachment[] })[];
  doctors: AppUser[];
  services: Service[];
  currentDoctorId: string;
}

interface FileEntry { file: File; category: keyof typeof CATEGORY_CONFIG }

// ─── File Viewer Modal ────────────────────────────────────────────────────────
function FileViewerModal({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const url = getPublicFileUrl(attachment.storage_path);
  const isImage = attachment.file_type.startsWith('image/');
  const isPdf = attachment.file_type === 'application/pdf';

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Keyboard close
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(4,8,16,0.96)', backdropFilter: 'blur(8px)' }}
      onClick={handleBackdrop}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(CATEGORY_CONFIG[attachment.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.OTHER).icon}
            <span className="text-sm font-medium truncate max-w-[240px]" style={{ color: '#E8E8F0' }}>{attachment.file_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isImage && (
            <>
              <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                className="p-2 rounded-lg transition-all hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.07)', color: '#C9A84C' }} title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono w-12 text-center" style={{ color: '#8A8A9A' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(5, z + 0.25))}
                className="p-2 rounded-lg transition-all hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.07)', color: '#C9A84C' }} title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(1)}
                className="p-2 rounded-lg transition-all hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.07)', color: '#8A8A9A' }} title="Reset Zoom">
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}
          <a href={url} target="_blank" rel="noreferrer"
            className="p-2 rounded-lg transition-all hover:scale-105"
            style={{ background: 'rgba(79,156,249,0.1)', color: '#4F9CF9', border: '1px solid rgba(79,156,249,0.2)' }} title="Open in new tab">
            <ExternalLink className="w-4 h-4" />
          </a>
          <a href={url} download={attachment.file_name}
            className="p-2 rounded-lg transition-all hover:scale-105"
            style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }} title="Download">
            <Download className="w-4 h-4" />
          </a>
          <button onClick={onClose}
            className="p-2 rounded-lg transition-all hover:scale-105"
            style={{ background: 'rgba(220,38,38,0.1)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.2)' }} title="Close (Esc)">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6" onClick={handleBackdrop}>
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={attachment.file_name}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s ease', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
          />
        ) : isPdf ? (
          <iframe src={url} className="w-full h-full rounded-xl" style={{ minHeight: '75vh', border: 'none' }} />
        ) : (
          <div className="text-center space-y-4">
            <FileText className="w-16 h-16 mx-auto opacity-20" style={{ color: '#C9A84C' }} />
            <p className="text-sm" style={{ color: '#8A8A9A' }}>{attachment.file_name}</p>
            <a href={url} download={attachment.file_name}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-gold">
              <Download className="w-4 h-4" /> Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function PrescriptionPrint({ visit, patient }: { visit: Visit & { doctor: AppUser }; patient: Patient }) {
  return (
    <div className="print-only fixed inset-0 bg-white text-black p-8 z-[100] hidden print:block">
      <div className="max-w-lg mx-auto border-2 border-navy-900 p-6 rounded-lg">
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">Elite Dental Studio</h1>
          <p className="text-sm text-gray-600">Premium Dental Care · HIPAA Compliant</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div><strong>Patient:</strong> {patient.first_name} {patient.last_name}</div>
          <div><strong>ID:</strong> {patient.patient_id}</div>
          <div><strong>Doctor:</strong> Dr. {visit.doctor?.full_name}</div>
          <div><strong>Date:</strong> {new Date(visit.visit_date).toLocaleDateString()}</div>
          {visit.tooth_numbers && <div className="col-span-2"><strong>Tooth #:</strong> {visit.tooth_numbers}</div>}
          {visit.procedure_performed && <div className="col-span-2"><strong>Procedure:</strong> {visit.procedure_performed}</div>}
        </div>
        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">℞ Prescription</h3>
          <p className="text-sm whitespace-pre-wrap">{visit.prescription || 'No prescription issued.'}</p>
        </div>
        <div className="border-t mt-4 pt-4 text-xs text-gray-500 text-center">
          This prescription is valid for 30 days from the issue date.
        </div>
      </div>
    </div>
  );
}

// ─── Visit Timeline Item ──────────────────────────────────────────────────────
function VisitTimelineItem({ visit, patient, onEdit, onDelete }: { visit: Visit & { doctor: AppUser; attachments: Attachment[] }; patient: Patient; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [viewingFile, setViewingFile] = useState<Attachment | null>(null);
  const thisVisitBalance = (visit.total_cost || 0) - (visit.amount_paid || 0);
  const prevBalance = visit.previous_balance || 0;
  const netBalance = prevBalance + thisVisitBalance;

  return (
    <div className="relative pl-8 pb-6">
      {/* Timeline dot */}
      <div className="absolute left-0 top-0 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #C9A84C, #A87E30)', border: '2px solid #070E1A' }}>
        <Stethoscope className="w-2.5 h-2.5 text-[#070E1A]" />
      </div>
      {/* Timeline line */}
      <div className="absolute left-2 top-5 bottom-0 w-px" style={{ background: 'rgba(201,168,76,0.15)' }} />

      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(15,27,46,0.6)', border: '1px solid rgba(201,168,76,0.1)' }}>
        {/* Header */}
        <button className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
          onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold" style={{ color: '#E8E8F0' }}>
              {new Date(visit.visit_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {visit.procedure_performed && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                {visit.procedure_performed}
              </span>
            )}
            {visit.tooth_numbers && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(79,156,249,0.1)', color: '#4F9CF9', border: '1px solid rgba(79,156,249,0.2)' }}>
                Tooth #{visit.tooth_numbers}
              </span>
            )}
            {netBalance > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(220,38,38,0.1)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.25)' }}>
                Balance: {netBalance.toFixed(2)} EGP
              </span>
            )}
            {/* File category badges */}
            {visit.attachments?.map(a => {
              const cat = CATEGORY_CONFIG[a.category] || CATEGORY_CONFIG.OTHER;
              return (
                <span key={a.id} className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${cat.class}`}>
                  {cat.icon} {cat.label}
                </span>
              );
            })}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: '#6A6A7A' }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#6A6A7A' }} />}
        </button>

        {expanded && (
          <div className="border-t px-4 pb-4 space-y-3" style={{ borderColor: 'rgba(201,168,76,0.08)' }}>
            {visit.chief_complaint && <Detail label="Chief Complaint" value={visit.chief_complaint} />}
            {visit.medical_notes && <Detail label="Clinical Notes" value={visit.medical_notes} />}
            {visit.diagnosis && <Detail label="Diagnosis" value={visit.diagnosis} />}
            {visit.prescription && (
              <div>
                <Detail label="Prescription" value={visit.prescription} />
                <button onClick={() => window.print()}
                  className="mt-2 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                  style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <Printer className="w-3.5 h-3.5" /> Print Prescription
                </button>
                <PrescriptionPrint visit={visit} patient={patient} />
              </div>
            )}

            {/* Billing */}
            {(visit.total_cost || visit.amount_paid || visit.previous_balance) && (
              <div className="mt-2 space-y-2">
                {/* Carried-forward balance row */}
                {prevBalance > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>Previous Balance Carried Forward</p>
                    <p className="text-sm font-bold" style={{ color: '#EF4444' }}>{prevBalance.toFixed(2)} EGP</p>
                  </div>
                )}
                {/* This visit grid */}
                <div className={`grid gap-2 ${prevBalance > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {prevBalance > 0 && (
                    <div className="rounded-xl p-2.5 text-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-xs mb-0.5" style={{ color: '#5A5A6A' }}>This Visit</p>
                      <p className="text-sm font-bold" style={{ color: '#E8E8F0' }}>{(visit.total_cost || 0).toFixed(2)} EGP</p>
                    </div>
                  )}
                  {[
                    { label: prevBalance > 0 ? 'Grand Total' : 'Total', value: `${(prevBalance + (visit.total_cost || 0)).toFixed(2)} EGP`, color: '#E8E8F0' },
                    { label: 'Paid', value: `${(visit.amount_paid || 0).toFixed(2)} EGP`, color: '#10B981' },
                    { label: 'Balance', value: `${netBalance.toFixed(2)} EGP`, color: netBalance > 0 ? '#EF4444' : '#10B981' },
                  ].map(b => (
                    <div key={b.label} className="rounded-xl p-2.5 text-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-xs mb-0.5" style={{ color: '#5A5A6A' }}>{b.label}</p>
                      <p className="text-sm font-bold" style={{ color: b.color }}>{b.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {visit.attachments && visit.attachments.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6A6A7A' }}>Files ({visit.attachments.length})</p>
                <div className="space-y-1.5">
                  {visit.attachments.map(a => {
                    const cat = CATEGORY_CONFIG[a.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.OTHER;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setViewingFile(a)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all hover:scale-[1.01] group"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        title={`View ${a.file_name}`}
                      >
                        {/* Category badge */}
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${cat.class}`}>
                          {cat.icon} {cat.label}
                        </span>
                        {/* File name */}
                        <span className="text-xs flex-1 truncate" style={{ color: '#C8C4BC' }}>{a.file_name}</span>
                        {/* Size */}
                        {a.file_size_bytes && (
                          <span className="text-[10px] shrink-0" style={{ color: '#5A5A6A' }}>
                            {(a.file_size_bytes / 1024).toFixed(0)} KB
                          </span>
                        )}
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: '#4F9CF9' }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* File Viewer */}
            {viewingFile && <FileViewerModal attachment={viewingFile} onClose={() => setViewingFile(null)} />}
            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <button onClick={onEdit} className="text-xs flex items-center gap-1.5 transition-colors hover:text-blue-400" style={{ color: '#6A6A7A' }}>
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={onDelete} className="text-xs flex items-center gap-1.5 transition-colors hover:text-red-400" style={{ color: '#6A6A7A' }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6A6A7A' }}>{label}</p>
      <p className="text-sm whitespace-pre-wrap" style={{ color: '#C8C4BC' }}>{value}</p>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────
export default function PatientProfileClient({ patient, visits, doctors, services, currentDoctorId }: Props) {
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [formError, setFormError] = useState('');
  const [visitCost, setVisitCost] = useState(0);
  const [amountPaidNow, setAmountPaidNow] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();

  // Calculate total outstanding balance across ALL visits
  const totalOutstandingBalance = visits.reduce((sum, v) => {
    const visitBalance = (v.total_cost || 0) + (v.previous_balance || 0) - (v.amount_paid || 0);
    return sum + visitBalance;
  }, 0);
  // Only carry forward if positive (patient owes money)
  const carryForwardBalance = Math.max(0, totalOutstandingBalance);

  const handleVisitSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('fileCount', fileEntries.length.toString());
    fileEntries.forEach((entry, i) => {
      formData.set(`file_${i}`, entry.file);
      formData.set(`category_${i}`, entry.category);
    });
    setFormError('');
    startTransition(async () => {
      let result;
      if (editingVisit) {
        result = await updateVisitAction(editingVisit.id, patient.id, formData);
      } else {
        result = await createVisitAction(formData, patient.id, currentDoctorId);
      }
      if (result.error) { setFormError(result.error); return; }
      setShowVisitForm(false);
      setEditingVisit(null);
      setFileEntries([]);
    });
  };

  const handleDeleteVisit = (visitId: string) => {
    if (!confirm('Are you sure you want to delete this visit?')) return;
    startTransition(async () => {
      const res = await deleteVisitAction(visitId, patient.id);
      if (res.error) alert('Failed to delete visit: ' + res.error);
    });
  };

  const openEditForm = (visit: Visit) => {
    setEditingVisit(visit);
    setShowVisitForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileEntries(prev => [...prev, ...files.map(f => ({ file: f, category: 'OTHER' as const }))]);
    e.target.value = '';
  };

  const updateCategory = (idx: number, category: keyof typeof CATEGORY_CONFIG) => {
    setFileEntries(prev => prev.map((f, i) => i === idx ? { ...f, category } : f));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Patient Header */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}>
            {patient.first_name[0]}{patient.last_name[0]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
                {patient.first_name} {patient.last_name}
              </h1>
              {patient.has_bleeding_disorder && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold animate-pulse"
                  style={{ background: 'rgba(220,38,38,0.2)', color: '#EF4444', border: '2px solid rgba(220,38,38,0.5)' }}>
                  <AlertTriangle className="w-4 h-4" /> ⚠ BLEEDING DISORDER
                </span>
              )}
              {patient.allergies && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.35)' }}>
                  ⚠ Allergies
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="text-sm" style={{ color: '#6A6A7A' }}>{patient.patient_id}</span>
              <span className="text-sm" style={{ color: '#6A6A7A' }}>{patient.gender} · {age} yrs</span>
              {patient.contact_number && (
                <span className="flex items-center gap-1 text-sm" style={{ color: '#6A6A7A' }}>
                  <Phone className="w-3.5 h-3.5" /> {patient.contact_number}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1 text-sm" style={{ color: '#6A6A7A' }}>
                  <Mail className="w-3.5 h-3.5" /> {patient.email}
                </span>
              )}
            </div>
          </div>

          <button onClick={() => { setEditingVisit(null); setShowVisitForm(true); }}
            className="btn-gold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shrink-0">
            <Plus className="w-4 h-4" /> New Visit
          </button>
        </div>

        {/* Medical Alerts */}
        {(patient.medical_history || patient.allergies || patient.has_bleeding_disorder) && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {patient.medical_history && (
              <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(79,156,249,0.08)', border: '1px solid rgba(79,156,249,0.2)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#4F9CF9' }}>Medical History</p>
                <p className="text-xs" style={{ color: '#A0AEC0' }}>{patient.medical_history}</p>
              </div>
            )}
            {patient.allergies && (
              <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#F59E0B' }}>⚠ Allergies</p>
                <p className="text-xs" style={{ color: '#A0AEC0' }}>{patient.allergies}</p>
              </div>
            )}
            {patient.has_bleeding_disorder && (
              <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(220,38,38,0.1)', border: '2px solid rgba(220,38,38,0.4)' }}>
                <p className="text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: '#EF4444' }}>
                  <AlertTriangle className="w-3.5 h-3.5" /> CRITICAL — Bleeding Disorder
                </p>
                <p className="text-xs" style={{ color: '#FCA5A5' }}>
                  Use minimal invasive procedures. Consult hematologist if needed.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Visit Form */}
      {showVisitForm && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gold-gradient">{editingVisit ? 'Edit Dental Visit' : 'New Dental Visit'}</h2>
            <button onClick={() => { setShowVisitForm(false); setEditingVisit(null); }}
              className="p-2 rounded-xl"
              style={{ background: 'rgba(220,38,38,0.1)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.2)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <form key={editingVisit ? editingVisit.id : 'new'} onSubmit={handleVisitSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tooth Number(s)">
                <input name="tooth_numbers" defaultValue={editingVisit?.tooth_numbers || ''} placeholder="e.g. 11, 12, 21" className="input-premium" />
              </Field>
              <Field label="Chief Complaint">
                <input name="chief_complaint" defaultValue={editingVisit?.chief_complaint || ''} placeholder="e.g. Toothache" className="input-premium" />
              </Field>
            </div>

            <Field label="Procedure Performed">
              <input name="procedure_performed" defaultValue={editingVisit?.procedure_performed || ''} placeholder="e.g. Amalgam Filling, RCT" className="input-premium" />
            </Field>

            <Field label="Clinical Notes">
              <textarea name="medical_notes" defaultValue={editingVisit?.medical_notes || ''} rows={3} placeholder="Examination findings, treatment details…" className="input-premium resize-none" />
            </Field>

            <Field label="Diagnosis">
              <textarea name="diagnosis" defaultValue={editingVisit?.diagnosis || ''} rows={2} placeholder="ICD code or description…" className="input-premium resize-none" />
            </Field>

            <Field label="Prescription (℞)">
              <textarea name="prescription" defaultValue={editingVisit?.prescription || ''} rows={3} placeholder="Amoxicillin 500mg 1×3 for 5 days&#10;Ibuprofen 400mg PRN&#10;Chlorhexidine rinse" className="input-premium resize-none font-mono text-xs" />
            </Field>

            {/* Billing */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.12)' }}>
              <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#C9A84C' }}>
                <DollarSign className="w-4 h-4" /> Billing
              </p>

              {/* Previous Balance Banner — only shown when creating a new visit */}
              {!editingVisit && carryForwardBalance > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#EF4444' }}>⚠ Previous Outstanding Balance</p>
                    <p className="text-xs mt-0.5" style={{ color: '#FCA5A5' }}>This amount will be carried forward to this visit</p>
                  </div>
                  <p className="text-lg font-black" style={{ color: '#EF4444' }}>{carryForwardBalance.toFixed(2)} EGP</p>
                </div>
              )}

              {/* Hidden field to pass previous_balance to the server action */}
              <input type="hidden" name="previous_balance" value={editingVisit ? (editingVisit.previous_balance || 0) : carryForwardBalance} />

              <div className="grid grid-cols-2 gap-4">
                <Field label="This Visit Cost (EGP)">
                  <input
                    name="total_cost"
                    defaultValue={editingVisit?.total_cost || ''}
                    type="number" step="0.01" min="0" placeholder="0.00"
                    className="input-premium"
                    onChange={e => setVisitCost(parseFloat(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Amount Paid Today (EGP)">
                  <input
                    name="amount_paid"
                    defaultValue={editingVisit?.amount_paid || ''}
                    type="number" step="0.01" min="0" placeholder="0.00"
                    className="input-premium"
                    onChange={e => setAmountPaidNow(parseFloat(e.target.value) || 0)}
                  />
                </Field>
              </div>

              {/* Live Billing Summary */}
              {!editingVisit && (() => {
                const grandTotal = carryForwardBalance + visitCost;
                const remaining = grandTotal - amountPaidNow;
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>Grand Total</p>
                      <p className="text-xl font-black" style={{ color: '#C9A84C' }}>{grandTotal.toFixed(2)} EGP</p>
                    </div>
                    <div className="rounded-xl px-4 py-3 text-center" style={{ background: remaining > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${remaining > 0 ? 'rgba(220,38,38,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: remaining > 0 ? '#EF4444' : '#10B981' }}>Remaining Balance</p>
                      <p className="text-xl font-black" style={{ color: remaining > 0 ? '#EF4444' : '#10B981' }}>{remaining.toFixed(2)} EGP</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* File Uploads */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: isDragging ? 'rgba(79,156,249,0.1)' : 'rgba(79,156,249,0.04)', border: `1px ${isDragging ? 'solid' : 'solid'} ${isDragging ? 'rgba(79,156,249,0.5)' : 'rgba(79,156,249,0.12)'}`, transition: 'all 0.2s' }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = Array.from(e.dataTransfer.files);
                setFileEntries(prev => [...prev, ...dropped.map(f => ({ file: f, category: 'OTHER' as const }))]);
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#4F9CF9' }}>
                  <Upload className="w-4 h-4" /> Attachments
                  {fileEntries.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(79,156,249,0.15)', color: '#4F9CF9' }}>
                      {fileEntries.length} file{fileEntries.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-105 text-xs font-semibold"
                  style={{ background: 'rgba(79,156,249,0.12)', border: '1px solid rgba(79,156,249,0.25)', color: '#4F9CF9' }}>
                  <Plus className="w-3.5 h-3.5" /> Add Files
                  <input type="file" multiple className="hidden" onChange={addFile} />
                </label>
              </div>

              {/* Drop zone hint */}
              {fileEntries.length === 0 && (
                <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl cursor-pointer transition-all"
                  style={{ border: '2px dashed rgba(79,156,249,0.25)', color: '#4A6A9A' }}>
                  <Upload className="w-7 h-7 opacity-40" />
                  <span className="text-sm font-medium" style={{ color: '#4F9CF9' }}>Drop files here or click to browse</span>
                  <span className="text-xs" style={{ color: '#5A5A6A' }}>X-Rays · Lab Results · Clinical Photos · PDFs · Any file type</span>
                  <input type="file" multiple className="hidden" onChange={addFile} />
                </label>
              )}

              {/* File list */}
              {fileEntries.length > 0 && (
                <div className="space-y-2">
                  {fileEntries.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {(CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.OTHER).icon}
                        <span className="text-xs truncate" style={{ color: '#A0AEC0' }}>{entry.file.name}</span>
                        <span className="text-[10px] shrink-0" style={{ color: '#5A5A6A' }}>
                          {(entry.file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <select
                        value={entry.category}
                        onChange={e => updateCategory(idx, e.target.value as keyof typeof CATEGORY_CONFIG)}
                        className="input-premium text-xs py-1 pr-6 shrink-0"
                        style={{ width: 130 }}
                      >
                        {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setFileEntries(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 rounded-lg shrink-0" style={{ color: '#EF4444' }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <p className="text-sm px-4 py-2 rounded-xl" style={{ background: 'rgba(220,38,38,0.1)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.25)' }}>
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowVisitForm(false); setEditingVisit(null); }}
                className="px-5 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8A8A9A' }}>
                Cancel
              </button>
              <button type="submit" disabled={isPending}
                className="btn-gold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center gap-2">
                {isPending ? (
                  <><span className="w-4 h-4 border-2 border-[#070E1A]/30 border-t-[#070E1A] rounded-full animate-spin" /> Saving…</>
                ) : (
                  <><FileText className="w-4 h-4" /> Save Visit Record</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Visit Timeline */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#E8E8F0' }}>
          <Clock className="w-5 h-5" style={{ color: '#C9A84C' }} />
          Visit Timeline
          <span className="text-sm font-normal ml-1" style={{ color: '#5A5A6A' }}>({visits.length} visits)</span>
        </h2>
        {visits.length === 0 ? (
          <div className="text-center py-10 rounded-2xl"
            style={{ background: 'rgba(15,27,46,0.5)', border: '1px solid rgba(201,168,76,0.06)' }}>
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm" style={{ color: '#5A5A6A' }}>No visits recorded yet.</p>
          </div>
        ) : (
          <div>
            {visits.map(v => <VisitTimelineItem key={v.id} visit={v} patient={patient} onEdit={() => openEditForm(v)} onDelete={() => handleDeleteVisit(v.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
        {label}
      </label>
      {children}
    </div>
  );
}
