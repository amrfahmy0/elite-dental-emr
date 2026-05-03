'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getVisitDetailsAction } from '@/app/actions';
import { BillingInvoice } from './BillingNotifier';
import { Clock, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function RecentCheckoutsPanel({ initialVisits }: { initialVisits: any[] }) {
  const [visits, setVisits] = useState(initialVisits);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('recent-checkouts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visits' },
        async (payload) => {
          const { data: newVisit } = await getVisitDetailsAction(payload.new.id);
          if (newVisit) {
            setVisits((prev) => [newVisit, ...prev].slice(0, 5));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'visits' },
        async (payload) => {
          const { data: updatedVisit } = await getVisitDetailsAction(payload.new.id);
          if (updatedVisit) {
            setVisits((prev) => prev.map((v) => (v.id === updatedVisit.id ? updatedVisit : v)));
            if (selectedVisit?.id === updatedVisit.id) {
              setSelectedVisit(updatedVisit);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedVisit]);

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Clock className="w-4 h-4 text-[#C9A84C]" />
        <h3 className="font-bold text-sm text-[#E8E8F0]">Recent Checkouts</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {visits.map((visit) => {
          const pt = visit.patient;
          const remaining = (visit.total_cost || 0) + (visit.previous_balance || 0) - (visit.amount_paid || 0);
          // If they've paid anything (even partial), or if there's no remaining balance, it's considered 'processed'
          const needsAttention = remaining > 0 && (visit.amount_paid || 0) === 0;

          return (
            <button
              key={visit.id}
              onClick={() => setSelectedVisit(visit)}
              className={`w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.02] ${
                selectedVisit?.id === visit.id
                  ? 'bg-white/10 border-white/20'
                  : 'bg-black/20 border-white/5 hover:bg-black/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-[#E8E8F0]">
                    {pt?.first_name} {pt?.last_name}
                  </p>
                  <p className="text-[10px] text-[#8A8A9A] mt-0.5">
                    {new Date(visit.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {needsAttention ? (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
              </div>
            </button>
          );
        })}
        {visits.length === 0 && (
          <p className="text-xs text-[#8A8A9A] text-center mt-4">No recent checkouts</p>
        )}
      </div>

      {/* Modal for viewing the selected visit's invoice */}
      {selectedVisit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm">
            <BillingInvoice visit={selectedVisit} onDismiss={() => setSelectedVisit(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
