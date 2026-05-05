'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getVisitDetailsAction, getSessionTokenAction } from '@/app/actions';
import { BillingInvoice } from './BillingNotifier';
import InvoicePrint from './InvoicePrint';
import { Clock, CheckCircle, AlertCircle, Printer } from 'lucide-react';

export default function RecentCheckoutsPanel({ initialVisits = [] }: { initialVisits: any[] }) {
  const [visits, setVisits] = useState(initialVisits || []);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('services').select('*').then(({ data }) => {
      if (data) setServices(data);
    });

    let channel: any;
    let authClient: any;

    async function setupRealtime() {
      const token = await getSessionTokenAction();
      console.log("[RecentCheckouts] Realtime Token Status:", token ? "PRESENT" : "MISSING");

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';
      
      authClient = createClient(supabaseUrl, supabaseAnonKey);
      if (token) {
        authClient.realtime.setAuth(token);
      }

      channel = authClient
        .channel('recent-checkouts')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'visits' },
          async (payload: any) => {
            if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return;
            const newVisitId = payload.eventType === 'DELETE' ? payload.old.id : payload.new.id;
            const { data: newVisit } = await getVisitDetailsAction(newVisitId);
            if (newVisit) {
              setVisits((prev) => {
                const filtered = prev.filter(v => v.id !== newVisit.id);
                return [newVisit, ...filtered].slice(0, 5);
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'visits' },
          async (payload: any) => {
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
    }

    setupRealtime();

    return () => {
      if (channel && authClient) {
        authClient.removeChannel(channel);
      }
    };
  }, [selectedVisit]);

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Clock className="w-4 h-4 text-[#C9A84C]" />
        <h3 className="font-bold text-sm text-[#E8E8F0]">Recent Checkouts</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {(visits || []).map((visit) => {
          const pt = visit?.patient || {};
          const remaining = (visit?.total_cost || 0) + (visit?.previous_balance || 0) - (visit?.amount_paid || 0);
          // If they've paid anything (even partial), or if there's no remaining balance, it's considered 'processed'
          const needsAttention = remaining > 0 && (visit?.amount_paid || 0) === 0;

          return (
            <div
              key={visit?.id}
              onClick={() => setSelectedVisit(visit)}
              className={`w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer ${
                selectedVisit?.id === visit?.id
                  ? 'bg-white/10 border-white/20'
                  : 'bg-black/20 border-white/5 hover:bg-black/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-[#E8E8F0]">
                    {pt?.first_name || 'Unknown'} {pt?.last_name || 'Patient'}
                  </p>
                  <p suppressHydrationWarning className="text-[10px] text-[#8A8A9A] mt-0.5">
                    {visit?.visit_date ? new Date(visit.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
                {needsAttention ? (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
                <div onClick={(e) => e.stopPropagation()}>
                  <InvoicePrint
                    visit={visit}
                    services={services}
                    trigger={
                      <button
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 transition-all text-[#C9A84C]"
                        title="Print Invoice"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
        {(!visits || visits.length === 0) && (
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
