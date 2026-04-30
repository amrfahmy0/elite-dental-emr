'use client';

import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getArrivalNotificationDataAction } from '@/app/actions';
import { BellRing, Users } from 'lucide-react';

const notifiedArrivals = new Set<string>();

export default function ArrivalNotifier({ doctorId }: { doctorId: string }) {
  useEffect(() => {
    if (!doctorId) return;

    const channel = supabase
      .channel('arrival-rt-doctor')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments', filter: `doctor_id=eq.${doctorId}` },
        async (payload) => {
          // Check if status changed to WAITING and we haven't already notified
          if (payload.new.status === 'WAITING' && !notifiedArrivals.has(payload.new.id)) {
            notifiedArrivals.add(payload.new.id);
            
            const { patientName, waitingCount, error } = await getArrivalNotificationDataAction(payload.new.id);
            if (error) return;

            // Play arrival sound (doorbell / soft chime)
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(() => {});
            } catch (e) {}

            toast.custom((t) => (
              <div className="glass-card-light p-4 rounded-xl shadow-2xl border w-full max-w-sm pointer-events-auto" style={{ borderColor: 'rgba(79,156,249,0.4)', background: '#0B1220' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(79,156,249,0.2)', color: '#4F9CF9' }}>
                    <BellRing className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight" style={{ color: '#E8E8F0' }}>Patient Arrived</h3>
                    <p className="text-xs mt-0.5" style={{ color: '#8A8A9A' }}><strong className="text-white">{patientName}</strong> is ready.</p>
                  </div>
                </div>
                
                <div className="mt-3 p-3 rounded-lg flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#F59E0B]" />
                    <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>Total Waiting</span>
                  </div>
                  <span className="text-base font-black" style={{ color: '#F59E0B' }}>{waitingCount}</span>
                </div>

                <button onClick={() => toast.dismiss(t)} className="w-full mt-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#8A8A9A' }}>
                  Acknowledge
                </button>
              </div>
            ), { duration: 15000, position: 'top-right' }); // Show for 15s top right
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId]);

  return null;
}
