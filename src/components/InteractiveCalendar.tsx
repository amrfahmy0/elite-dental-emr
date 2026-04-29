'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Appointment, Service, Patient, AppUser } from '@/lib/types';
import { createAppointmentAction } from '@/app/actions';
import { X, ChevronLeft, ChevronRight, Clock, User, Stethoscope, AlertCircle } from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 80; // px per hour
const DAY_START = 10;   // 10 AM (earliest Monday shift)
const DAY_END = 24;     // 12 AM (midnight)
const TOTAL_HOURS = DAY_END - DAY_START;

const SERVICE_COLORS: Record<string, string> = {
  'Consultation':  '#4F9CF9',
  'Extraction':    '#E57373',
  'Filling':       '#81C995',
  'Scaling':       '#C9A84C',
  'Root Canal':    '#BA68C8',
  'Whitening':     '#4DD0E1',
  'Crown':         '#FFB74D',
  'default':       '#10B981',
};

function getServiceColor(name: string) {
  return SERVICE_COLORS[name] || SERVICE_COLORS['default'];
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function minutesToY(minutesSinceDayStart: number) {
  return (minutesSinceDayStart / 60) * HOUR_HEIGHT;
}

function dateToMinutes(date: Date): number {
  return (date.getHours() - DAY_START) * 60 + date.getMinutes();
}

function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface BookingModal {
  isOpen: boolean;
  startTime: Date | null;
  endTime: Date | null;
  service: Service | null;
}

interface InteractiveCalendarProps {
  appointments: Appointment[];
  services: Service[];
  patients: Patient[];
  doctors: AppUser[];
}

// ─── Appointment Block ───────────────────────────────────────────────────────
function AppointmentBlock({ appt, dayStart }: { appt: Appointment; dayStart: number }) {
  const start = new Date(appt.start_time);
  const end = new Date(appt.end_time);
  const startMin = dateToMinutes(start);
  const durationMin = (end.getTime() - start.getTime()) / 60000;
  const top = minutesToY(startMin);
  const height = Math.max(minutesToY(durationMin), 24);
  const color = getServiceColor(appt.service?.name || '');

  return (
    <div
      className="absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden cursor-default select-none z-10 transition-all hover:opacity-90"
      style={{
        top,
        height,
        background: `linear-gradient(135deg, ${color}30, ${color}18)`,
        border: `1.5px solid ${color}60`,
        borderLeft: `3px solid ${color}`,
      }}
      title={`${appt.patient?.first_name} ${appt.patient?.last_name} — ${appt.service?.name}`}
    >
      <p className="text-xs font-semibold truncate" style={{ color }}>
        {appt.patient?.first_name} {appt.patient?.last_name}
      </p>
      {height > 36 && (
        <p className="text-xs truncate opacity-70" style={{ color }}>
          {appt.service?.name} · {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      <span className={`text-[10px] font-bold uppercase absolute top-1 right-1.5 ${
        appt.status === 'IN_SESSION' ? 'text-emerald-400' :
        appt.status === 'WAITING' ? 'text-amber-400' :
        appt.status === 'COMPLETED' ? 'text-slate-400' : 'opacity-0'
      }`}>
        {appt.status === 'IN_SESSION' ? '●' : appt.status === 'WAITING' ? '◐' : ''}
      </span>
    </div>
  );
}

// ─── Ghost Block ─────────────────────────────────────────────────────────────
function GhostBlock({ top, durationMin, color }: { top: number; durationMin: number; color: string }) {
  const height = Math.max(minutesToY(durationMin), 24);
  return (
    <div
      className="absolute left-1 right-1 rounded-lg px-2 py-1 pointer-events-none z-20"
      style={{
        top,
        height,
        background: `${color}18`,
        border: `2px dashed ${color}80`,
      }}
    >
      <p className="text-xs font-semibold opacity-80" style={{ color }}>
        {Math.round(durationMin)} min
      </p>
    </div>
  );
}

// ─── Main Calendar ───────────────────────────────────────────────────────────
export default function InteractiveCalendar({
  appointments,
  services,
  patients,
  doctors,
}: InteractiveCalendarProps) {
  const [weekBase, setWeekBase] = useState(new Date());
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || '');
  const [ghostInfo, setGhostInfo] = useState<{ colIdx: number; top: number } | null>(null);
  const [modal, setModal] = useState<BookingModal>({ isOpen: false, startTime: null, endTime: null, service: null });
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingDoctorId, setBookingDoctorId] = useState(doctors[0]?.id || '');
  const [bookingComplaint, setBookingComplaint] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingPending, setBookingPending] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  const calBodyRef = useRef<HTMLDivElement>(null);
  const weekDays = getWeekDays(weekBase);
  const selectedService = services.find(s => s.id === selectedServiceId);

  // ─── Filter appointments per day ─────────────────────────────────────────
  const getApptsForDay = useCallback((day: Date) => {
    return appointments.filter(a => {
      const d = new Date(a.start_time);
      return d.toDateString() === day.toDateString();
    });
  }, [appointments]);

  // ─── Mouse handlers ───────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, colIdx: number) => {
    if (!selectedService) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMinutes = Math.floor((y / HOUR_HEIGHT) * 60);
    const snapped = Math.round(totalMinutes / 15) * 15; // snap to 15 min
    const top = minutesToY(snapped);
    setGhostInfo({ colIdx, top });
  }, [selectedService]);

  const handleMouseLeave = useCallback(() => setGhostInfo(null), []);

  const handleSlotClick = useCallback((e: React.MouseEvent<HTMLDivElement>, day: Date, colIdx: number) => {
    if (!selectedService) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMinutes = Math.floor((y / HOUR_HEIGHT) * 60);
    const snapped = Math.round(totalMinutes / 15) * 15;

    const startTime = new Date(day);
    startTime.setHours(DAY_START + Math.floor(snapped / 60), snapped % 60, 0, 0);
    const endTime = new Date(startTime.getTime() + selectedService.duration_minutes * 60000);

    setModal({ isOpen: true, startTime, endTime, service: selectedService });
    setGhostInfo(null);
    setBookingError('');
    setBookingPatientId('');
    setPatientSearch('');
  }, [selectedService]);

  // ─── Conflict detection ───────────────────────────────────────────────────
  const isSlotOccupied = useCallback((day: Date, clickY: number): boolean => {
    if (!selectedService) return false;
    const totalMinutes = Math.round(Math.floor((clickY / HOUR_HEIGHT) * 60) / 15) * 15;
    const startTime = new Date(day);
    startTime.setHours(DAY_START + Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
    const endTime = new Date(startTime.getTime() + selectedService.duration_minutes * 60000);

    const dayOfWeek = day.getDay();
    // Thursday (4) and Friday (5) are closed
    if (dayOfWeek === 4 || dayOfWeek === 5) return true;

    // Check working hours bounds
    const startMinOfDay = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinOfDay = (endTime.getDate() !== startTime.getDate()) 
      ? 24 * 60 + endTime.getHours() * 60 + endTime.getMinutes() 
      : endTime.getHours() * 60 + endTime.getMinutes();

    if (dayOfWeek === 1) { // Monday 10am to 4pm
      if (startMinOfDay < 10 * 60 || endMinOfDay > 16 * 60) return true;
    } else { // Saturday to Wednesday (except Mon) 6pm to 12am
      if (startMinOfDay < 18 * 60 || endMinOfDay > 24 * 60) return true;
    }

    return getApptsForDay(day).some(a => {
      const aStart = new Date(a.start_time).getTime();
      const aEnd = new Date(a.end_time).getTime();
      return startTime.getTime() < aEnd && endTime.getTime() > aStart;
    });
  }, [selectedService, getApptsForDay]);

  // ─── Booking submit ───────────────────────────────────────────────────────
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.startTime || !modal.endTime || !modal.service) return;
    if (!bookingPatientId) { setBookingError('Please select a patient.'); return; }
    if (!bookingDoctorId) { setBookingError('Please select a doctor.'); return; }

    setBookingPending(true);
    const result = await createAppointmentAction({
      patient_id: bookingPatientId,
      doctor_id: bookingDoctorId,
      service_id: modal.service.id,
      start_time: modal.startTime.toISOString(),
      end_time: modal.endTime.toISOString(),
      chief_complaint: bookingComplaint,
    });
    setBookingPending(false);

    if (result.error) { setBookingError(result.error); return; }
    setModal({ isOpen: false, startTime: null, endTime: null, service: null });
  };

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.patient_id}`.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const displayDays = viewMode === 'day' ? [weekBase] : weekDays;
  const today = new Date();

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ─── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => {
            const d = new Date(weekBase);
            d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
            setWeekBase(d);
          }}
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setWeekBase(new Date())}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
            Today
          </button>
          <button onClick={() => {
            const d = new Date(weekBase);
            d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
            setWeekBase(d);
          }}
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold ml-2" style={{ color: '#E8E8F0' }}>
            {viewMode === 'week'
              ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : weekBase.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View mode toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.2)' }}>
            {(['week', 'day'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className="px-4 py-1.5 text-sm font-semibold capitalize transition-all"
                style={viewMode === m
                  ? { background: 'linear-gradient(135deg, #C9A84C, #A87E30)', color: '#070E1A' }
                  : { background: 'transparent', color: '#8A8A9A' }}>
                {m}
              </button>
            ))}
          </div>

          {/* Service selector */}
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" style={{ color: '#C9A84C' }} />
            <select
              value={selectedServiceId}
              onChange={e => setSelectedServiceId(e.target.value)}
              className="input-premium text-sm py-1.5 pr-8"
              style={{ width: 'auto', minWidth: 160 }}
            >
              <option value="">— Pick a Service —</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes}m)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Service hint ────────────────────────────────────────────────── */}
      {selectedService && (
        <div className="mb-3 px-4 py-2 rounded-xl text-sm flex items-center gap-2"
          style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)', color: '#C9A84C' }}>
          <Clock className="w-4 h-4" />
          <span><strong>{selectedService.name}</strong> selected · {selectedService.duration_minutes} min · Click any open slot to book</span>
        </div>
      )}

      {/* ─── Calendar Grid ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto rounded-2xl" style={{ border: '1px solid rgba(201,168,76,0.1)', background: '#0B1220' }}>
        {/* Header row */}
        <div className="flex sticky top-0 z-30" style={{ background: '#070E1A', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
          {/* Time gutter */}
          <div className="w-16 shrink-0" />
          {displayDays.map((day, idx) => {
            const isToday = day.toDateString() === today.toDateString();
            return (
              <div key={idx} className="flex-1 text-center py-3 text-sm font-semibold"
                style={{ borderLeft: '1px solid rgba(201,168,76,0.06)', color: isToday ? '#C9A84C' : '#8A8A9A' }}>
                <span className="block text-xs uppercase tracking-widest opacity-60">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-base mt-0.5 ${isToday ? 'btn-gold' : ''}`}>
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex" ref={calBodyRef}>
          {/* Time labels */}
          <div className="w-16 shrink-0 relative" style={{ height: HOUR_HEIGHT * TOTAL_HOURS }}>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div key={i} className="absolute w-full flex items-start justify-end pr-3"
                style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                <span className="text-[11px] -mt-2.5" style={{ color: '#3A3A4A' }}>
                  {String((DAY_START + i) % 12 || 12).padStart(2, '0')}
                  <span className="ml-0.5">{((DAY_START + i) >= 12 && (DAY_START + i) < 24) ? 'PM' : 'AM'}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {displayDays.map((day, colIdx) => {
            const dayAppts = getApptsForDay(day);
            const dayOfWeek = day.getDay();
            const isClosedDay = dayOfWeek === 4 || dayOfWeek === 5;
            
            return (
              <div key={colIdx} className="flex-1 relative cal-slot-col"
                style={{
                  height: HOUR_HEIGHT * TOTAL_HOURS,
                  borderLeft: '1px solid rgba(201,168,76,0.06)',
                  cursor: isClosedDay ? 'not-allowed' : (selectedService ? 'crosshair' : 'default'),
                  background: isClosedDay ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 20px)' : undefined,
                }}
                onMouseMove={(e) => {
                  if (!selectedService || isClosedDay) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  handleMouseMove(e, colIdx);
                }}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                  if (!selectedService || isClosedDay) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  if (!isSlotOccupied(day, y)) {
                    handleSlotClick(e, day, colIdx);
                  }
                }}
              >
                {/* Hour lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => {
                  const hour24 = DAY_START + i;
                  const isWorking = isClosedDay ? false : (dayOfWeek === 1 ? (hour24 >= 10 && hour24 < 16) : (hour24 >= 18 && hour24 < 24));

                  return (
                    <div key={i} className="absolute w-full"
                      style={{ 
                        top: i * HOUR_HEIGHT, 
                        height: HOUR_HEIGHT, 
                        borderTop: '1px solid rgba(201,168,76,0.06)',
                        background: isWorking ? 'transparent' : 'rgba(0,0,0,0.4)',
                      }}>
                      {/* 30-min line */}
                      <div className="absolute w-full" style={{ top: '50%', borderTop: '1px solid rgba(201,168,76,0.03)' }} />
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {day.toDateString() === today.toDateString() && (() => {
                  const nowMin = dateToMinutes(today);
                  if (nowMin >= 0 && nowMin <= TOTAL_HOURS * 60) {
                    return (
                      <div className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: minutesToY(nowMin) }}>
                        <div className="relative">
                          <div className="w-2.5 h-2.5 rounded-full absolute -left-1 -top-1.5"
                            style={{ background: '#10B981' }} />
                          <div className="h-px w-full" style={{ background: 'rgba(16,185,129,0.5)' }} />
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Ghost block */}
                {ghostInfo?.colIdx === colIdx && selectedService && ghostInfo.top >= 0 && (
                  <GhostBlock
                    top={ghostInfo.top}
                    durationMin={selectedService.duration_minutes}
                    color={getServiceColor(selectedService.name)}
                  />
                )}

                {/* Appointment blocks */}
                {dayAppts.map(appt => (
                  <AppointmentBlock key={appt.id} appt={appt} dayStart={DAY_START} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Booking Modal ────────────────────────────────────────────────── */}
      {modal.isOpen && modal.startTime && modal.endTime && modal.service && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="glass-card w-full max-w-lg shadow-2xl animate-fade-in-up p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gold-gradient">Confirm Booking</h3>
                <p className="text-sm mt-1" style={{ color: '#8A8A9A' }}>
                  {modal.startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setModal({ isOpen: false, startTime: null, endTime: null, service: null })}
                className="p-2 rounded-xl transition-all hover:scale-110"
                style={{ background: 'rgba(220,38,38,0.1)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.2)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time & Service Summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Service', value: modal.service.name },
                { label: 'Start', value: modal.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
                { label: 'End', value: modal.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#6A6A7A' }}>{item.label}</p>
                  <p className="text-sm font-bold" style={{ color: '#C9A84C' }}>{item.value}</p>
                </div>
              ))}
            </div>

            {bookingError && (
              <div className="mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"
                style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', color: '#FCA5A5' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {bookingError}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              {/* Patient search */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                  Patient <span className="text-red-400">*</span>
                </label>
                <div className="relative mb-2">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6A6A7A' }} />
                  <input
                    type="text"
                    placeholder="Search by name or ID…"
                    value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); setBookingPatientId(''); }}
                    className="input-premium pl-10"
                  />
                </div>
                {patientSearch.length > 0 && bookingPatientId === '' && (
                  <div className="rounded-xl overflow-hidden max-h-40 overflow-y-auto"
                    style={{ border: '1px solid rgba(201,168,76,0.15)', background: '#0B1220' }}>
                    {filteredPatients.slice(0, 8).map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setBookingPatientId(p.id); setPatientSearch(`${p.first_name} ${p.last_name} (${p.patient_id})`); }}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                        style={{ color: '#C8C4BC', borderBottom: '1px solid rgba(201,168,76,0.06)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span className="font-medium">{p.first_name} {p.last_name}</span>
                        <span className="ml-2 text-xs opacity-60">{p.patient_id}</span>
                      </button>
                    ))}
                    {filteredPatients.length === 0 && (
                      <p className="px-4 py-3 text-sm" style={{ color: '#6A6A7A' }}>No patients found</p>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                  Attending Doctor <span className="text-red-400">*</span>
                </label>
                <select value={bookingDoctorId} onChange={e => setBookingDoctorId(e.target.value)}
                  className="input-premium" required>
                  <option value="">— Select Doctor —</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                  Chief Complaint
                </label>
                <input type="text" placeholder="Patient's primary concern…"
                  value={bookingComplaint} onChange={e => setBookingComplaint(e.target.value)}
                  className="input-premium" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button"
                  onClick={() => setModal({ isOpen: false, startTime: null, endTime: null, service: null })}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8A8A9A' }}>
                  Cancel
                </button>
                <button type="submit" disabled={bookingPending || !bookingPatientId}
                  className="flex-1 btn-gold py-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {bookingPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#070E1A]/30 border-t-[#070E1A] rounded-full animate-spin" />
                      Booking…
                    </span>
                  ) : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
