'use client';

import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getVisitDetailsAction } from '@/app/actions';
import { Receipt, AlertTriangle, CheckCircle } from 'lucide-react';

export default function BillingNotifier() {
  useEffect(() => {
    const channel = supabase
      .channel('billing-rt-frontdesk')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visits' },
        async (payload) => {
          const newVisitId = payload.new.id;
          const { data: visit } = await getVisitDetailsAction(newVisitId);
          
          if (visit && visit.patient) {
            // Play cash register / notification sound
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
              audio.play().catch(() => {});
            } catch (e) {}

            const pt = visit.patient;
            const total = visit.total_cost || 0;
            const paid = visit.amount_paid || 0;
            const remaining = total - paid;
            
            // Custom invoice-like toast
            toast.custom((t) => (
              <div className="glass-card-light p-4 rounded-xl shadow-2xl border w-full max-w-sm pointer-events-auto" style={{ borderColor: 'rgba(201,168,76,0.4)', background: '#0B1220' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#C9A84C]" />
                    <span className="font-bold text-[#E8E8F0]">New Billing Issued</span>
                  </div>
                  <span className="text-xs text-[#5A5A6A]">Just now</span>
                </div>
                
                <p className="font-bold text-base mb-0.5" style={{ color: '#E8E8F0' }}>{pt.first_name} {pt.last_name}</p>
                <p className="text-xs text-[#8A8A9A] mb-3">ID: {pt.patient_id}</p>
                
                {visit.procedure_performed && (
                  <p className="text-xs mb-4 p-2 rounded-lg" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
                    <span className="block text-[9px] uppercase tracking-wider opacity-70 mb-0.5">Procedure(s)</span>
                    {visit.procedure_performed}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[10px] uppercase tracking-widest text-[#8A8A9A] mb-1">Total Cost</p>
                    <p className="font-black text-[#E8E8F0]">{total} EGP</p>
                  </div>
                  <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-[10px] uppercase tracking-widest text-[#10B981] mb-1">Already Paid</p>
                    <p className="font-black text-[#10B981]">{paid} EGP</p>
                  </div>
                </div>
                
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  remaining > 0 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <span className="text-[11px] uppercase font-bold flex items-center gap-1.5">
                    {remaining > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    To Be Collected
                  </span>
                  <span className="font-black text-lg">{remaining > 0 ? remaining : 0} EGP</span>
                </div>

                <button onClick={() => toast.dismiss(t)} className="w-full mt-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#8A8A9A' }}>
                  Acknowledge
                </button>
              </div>
            ), { duration: 120000, position: 'top-center' }); // Show for 2 minutes, at top-center for high visibility
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
