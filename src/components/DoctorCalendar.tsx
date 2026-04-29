'use client';

import React, { useState, useCallback } from 'react';
import type { Appointment } from '@/lib/types';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, AlertTriangle } from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 80;
const DAY_START   = 10; // 10 AM (earliest shift)
const DAY_END     = 24; // midnight
const TOTAL_HOURS = DAY_END - DAY_START;

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:  '#C9A84C',
  WAITING:    '#F59E0B',
  IN_SESSION: '#10B981',
  COMPLETED:  '#6A6A7A',
  CANCELLED:  '#EF4444',
};

function minutesToY(min: number) { return (min / 60) * HOUR_HEIGHT; }
function dateToMinutes(d: Date)  { return (d.getHours() - DAY_START) * 60 + d.getMinutes(); }

function getWeekDays(ref: Date): Date[] {
  const d    = new Date(ref);
  const dow  = d.getDay();
  const diff = d.getDate() - dow + (dow === 0 ? -6 : 1);
  const mon  = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return dd;
  });
}

interface DoctorCalendarProps {
  appointments: Appointment[];
}

function AppointmentBlock({ appt }: { appt: Appointment }) {
  const start      = new Date(appt.start_time);
  const end        = new Date(appt.end_time);
  const startMin   = dateToMinutes(start);
  const durationMin = (end.getTime() - start.getTime()) / 60000;
  const top        = minutesToY(startMin);
  const height     = Math.max(minutesToY(durationMin), 28);
  const color      = STATUS_COLORS[appt.status] || STATUS_COLORS.SCHEDULED;

  return (
    <div
      className="absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden select-none z-10 hover:z-20 transition-all"
      style={{
        top, height,
        background: `linear-gradient(135deg, ${color}28, ${color}14)`,
        border: `1.5px solid ${color}55`,
        borderLeft: `3px solid ${color}`,
        cursor: 'default',
      }}
      title={`${appt.patient?.first_name} ${appt.patient?.last_name} — ${appt.service?.name} (${appt.status})`}
    >
      <p className="text-xs font-semibold truncate" style={{ color }}>
        {appt.patient?.first_name} {appt.patient?.last_name}
      </p>
      {height > 36 && (
        <p className="text-[11px] truncate opacity-70" style={{ color }}>
          {appt.service?.name} · {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      {appt.patient?.has_bleeding_disorder && (
        <AlertTriangle className="w-2.5 h-2.5 absolute top-1 right-1 text-red-400 opacity-70" />
      )}
    </div>
  );
}

export default function DoctorCalendar({ appointments }: DoctorCalendarProps) {
  const [weekBase, setWeekBase] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  const today    = new Date();
  const weekDays = getWeekDays(weekBase);
  const displayDays = viewMode === 'week' ? weekDays : [weekBase];

  const getApptsForDay = useCallback((day: Date) =>
    appointments.filter(a => new Date(a.start_time).toDateString() === day.toDateString()),
  [appointments]);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1)); setWeekBase(d); }}
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekBase(new Date())}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
            Today
          </button>
          <button
            onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1)); setWeekBase(d); }}
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold ml-1" style={{ color: '#E8E8F0' }}>
            {viewMode === 'week'
              ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : weekBase.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.2)' }}>
          {(['week', 'day'] as const).map(m => (
            <button key={m} onClick={() => { setViewMode(m); if (m === 'day') setWeekBase(new Date(weekBase)); }}
              className="px-4 py-1.5 text-sm font-semibold capitalize transition-all"
              style={viewMode === m
                ? { background: 'linear-gradient(135deg, #C9A84C, #A87E30)', color: '#070E1A' }
                : { background: 'transparent', color: '#8A8A9A' }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap mb-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {status.replace('_', ' ')}
          </span>
        ))}
        <span className="ml-auto text-xs" style={{ color: '#3A3A4A' }}>
          <CalendarDays className="w-3.5 h-3.5 inline mr-1 opacity-50" />
          Read-only view · {appointments.length} total appointments
        </span>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto rounded-2xl" style={{ border: '1px solid rgba(201,168,76,0.1)', background: '#0B1220' }}>

        {/* Header row */}
        <div className="flex sticky top-0 z-30" style={{ background: '#070E1A', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
          <div className="w-16 shrink-0" />
          {displayDays.map((day, idx) => {
            const isToday = day.toDateString() === today.toDateString();
            const dayCount = getApptsForDay(day).length;
            return (
              <div key={idx} className="flex-1 text-center py-2 text-sm font-semibold"
                style={{ borderLeft: '1px solid rgba(201,168,76,0.06)', color: isToday ? '#C9A84C' : '#8A8A9A' }}>
                <span className="block text-xs uppercase tracking-widest opacity-60">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-base mt-0.5 ${isToday ? 'btn-gold' : ''}`}>
                  {day.getDate()}
                </span>
                {dayCount > 0 && (
                  <span className="block text-[10px] mt-0.5" style={{ color: '#C9A84C99' }}>
                    {dayCount} appt{dayCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex">
          {/* Time labels */}
          <div className="w-16 shrink-0 relative" style={{ height: HOUR_HEIGHT * TOTAL_HOURS }}>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => {
              const h = DAY_START + i;
              return (
                <div key={i} className="absolute w-full flex items-start justify-end pr-3"
                  style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                  <span className="text-[11px] -mt-2.5" style={{ color: '#3A3A4A' }}>
                    {String(h % 12 || 12).padStart(2, '0')}
                    <span className="ml-0.5">{h >= 12 && h < 24 ? 'PM' : 'AM'}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {displayDays.map((day, colIdx) => {
            const dayAppts   = getApptsForDay(day);
            const dow        = day.getDay();
            const isClosed   = dow === 4 || dow === 5; // Thu/Fri off

            return (
              <div key={colIdx} className="flex-1 relative"
                style={{
                  height: HOUR_HEIGHT * TOTAL_HOURS,
                  borderLeft: '1px solid rgba(201,168,76,0.06)',
                  background: isClosed
                    ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.25) 10px, rgba(0,0,0,0.25) 20px)'
                    : undefined,
                }}>

                {/* Hour lines + working-hour shading */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => {
                  const h24 = DAY_START + i;
                  const isWorking = isClosed ? false : (dow === 1 ? (h24 >= 10 && h24 < 16) : (h24 >= 18 && h24 < 24));
                  return (
                    <div key={i} className="absolute w-full"
                      style={{
                        top: i * HOUR_HEIGHT, height: HOUR_HEIGHT,
                        borderTop: '1px solid rgba(201,168,76,0.06)',
                        background: isWorking ? 'transparent' : 'rgba(0,0,0,0.38)',
                      }}>
                      <div className="absolute w-full" style={{ top: '50%', borderTop: '1px solid rgba(201,168,76,0.03)' }} />
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {day.toDateString() === today.toDateString() && (() => {
                  const nowMin = dateToMinutes(today);
                  if (nowMin >= 0 && nowMin <= TOTAL_HOURS * 60) {
                    return (
                      <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: minutesToY(nowMin) }}>
                        <div className="w-2.5 h-2.5 rounded-full absolute -left-1 -top-1.5" style={{ background: '#10B981' }} />
                        <div className="h-px w-full" style={{ background: 'rgba(16,185,129,0.5)' }} />
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Appointment blocks */}
                {dayAppts.map(appt => (
                  <AppointmentBlock key={appt.id} appt={appt} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Closed-day notice ───────────────────────────────────────────── */}
      <p className="text-center text-xs mt-2" style={{ color: '#3A3A4A' }}>
        <Clock className="w-3.5 h-3.5 inline mr-1 opacity-40" />
        Working hours: Sat–Wed 6 PM–12 AM · Monday 10 AM–4 PM · Thu–Fri closed
      </p>
    </div>
  );
}
