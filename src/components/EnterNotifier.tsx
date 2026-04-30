'use client';

import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getEnterNotificationDataAction } from '@/app/actions';
import { DoorOpen } from 'lucide-react';

const notifiedEnters = new Set<string>();

export default function EnterNotifier() {
  useEffect(() => {
    const channel = supabase
      .channel('enter-rt-receptionist')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments' },
        async (payload) => {
          // Check if status changed to IN_SESSION and we haven't already notified
          if (payload.new.status === 'IN_SESSION' && !notifiedEnters.has(payload.new.id)) {
            notifiedEnters.add(payload.new.id);
            
            const { patientName, doctorName, error } = await getEnterNotificationDataAction(payload.new.id);
            if (error) return;

            // Play notification sound (pleasant chime)
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3');
              audio.play().catch(() => {});
            } catch (e) {}

            toast.custom((t) => (
              <div className="glass-card-light p-4 rounded-xl shadow-2xl border w-full max-w-sm pointer-events-auto" style={{ borderColor: 'rgba(16,185,129,0.4)', background: '#0B1220' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
                    <DoorOpen className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight" style={{ color: '#E8E8F0' }}>Send Patient In</h3>
                    <p className="text-xs mt-0.5" style={{ color: '#8A8A9A' }}>Doctor is ready.</p>
                  </div>
                </div>
                
                <div className="mt-3 p-3 rounded-lg space-y-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6A6A7A' }}>Patient</span>
                    <span className="text-sm font-black text-white ml-auto">{patientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6A6A7A' }}>Doctor</span>
                    <span className="text-sm font-semibold ml-auto" style={{ color: '#C9A84C' }}>Dr. {doctorName}</span>
                  </div>
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
  }, []);

  return null;
}
