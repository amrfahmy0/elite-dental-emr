'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getVisitDetailsAction, updateVisitPaymentAction, getSessionTokenAction } from '@/app/actions';
import { Receipt, AlertTriangle, CheckCircle, Wallet, Calendar, ArrowRight, Info, Printer } from 'lucide-react';
import InvoicePrint from './InvoicePrint';

export function BillingInvoice({ visit, toastId, onDismiss, services = [] }: { visit: any; toastId?: string | number; onDismiss?: () => void; services?: any[] }) {
  console.log("Selected Visit Data:", visit);
  
  const pt = visit?.patient || {};
  const visitCost = Number(visit?.total_cost) || 0;
  const previousBalance = Number(visit?.previous_balance) || 0;
  const grandTotal = visitCost + previousBalance;
  const paid = Number(visit?.amount_paid) || 0;
  const remaining = grandTotal - paid;
  
  const [payment, setPayment] = useState(remaining > 0 ? remaining : 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);

  const handlePay = async () => {
    if (payment <= 0) return;
    setIsSubmitting(true);
    const { error } = await updateVisitPaymentAction(visit?.id, payment);
    setIsSubmitting(false);
    if (!error) {
      toast.success(`Collected ${payment} EGP from ${pt?.first_name || 'Patient'}`);
      setIsSuccess(true);
    } else {
      toast.error(error);
    }
  };



  if (isSuccess) {
    return (
      <>
        <div className="glass-card-light p-5 rounded-xl shadow-2xl border w-full max-w-sm pointer-events-auto text-center" style={{ borderColor: 'rgba(16,185,129,0.4)', background: '#0B1220' }}>
          <CheckCircle className="w-16 h-16 text-[#10B981] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#E8E8F0] mb-2">Payment Recorded Successfully</h3>
          <p className="text-sm text-[#8A8A9A] mb-6">The invoice for {pt?.first_name} {pt?.last_name} has been updated.</p>
          
          <div className="flex gap-3">
            <button onClick={() => {
                if (toastId) toast.dismiss(toastId);
                if (onDismiss) onDismiss();
              }} 
              className="flex-1 py-3 rounded-xl text-sm font-bold text-[#8A8A9A] transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              No, Close
            </button>
            <InvoicePrint 
              visit={{...visit, amount_paid: (visit?.amount_paid || 0) + payment}} 
              services={services}
              trigger={
                <button
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-[#070E1A] transition-colors flex items-center justify-center gap-2"
                  style={{ background: '#10B981' }}>
                  <Printer className="w-4 h-4" /> Print Invoice
                </button>
              }
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="glass-card-light p-4 rounded-xl shadow-2xl border w-full max-w-sm pointer-events-auto" style={{ borderColor: 'rgba(201,168,76,0.4)', background: '#0B1220' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#C9A84C]" />
          <span className="font-bold text-[#E8E8F0]">New Billing Issued</span>
        </div>
        <span className="text-xs text-[#5A5A6A]">Just now</span>
      </div>
      
      <p className="font-bold text-base mb-0.5" style={{ color: '#E8E8F0' }}>{pt?.first_name} {pt?.last_name}</p>
      
      {visit?.procedure_performed && (
        <p className="text-xs mt-3 mb-4 p-2 rounded-lg" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
          <span className="block text-[9px] uppercase tracking-wider opacity-70 mb-0.5">Procedure(s)</span>
          {visit?.procedure_performed}
        </p>
      )}

      <div className="bg-black/20 rounded-xl p-3 border border-white/5 space-y-2 text-sm mb-4">
        {previousBalance > 0 && (
          <div className="flex justify-between text-[#EF4444] font-medium">
            <span>Previous Balance</span>
            <span>{previousBalance.toFixed(2)} EGP</span>
          </div>
        )}
        <div className="flex justify-between text-[#8A8A9A]">
          <span>Today's Visit</span>
          <span>{visitCost.toFixed(2)} EGP</span>
        </div>
        <div className="border-t border-white/10 my-1 pt-2 flex justify-between font-black text-[#E8E8F0]">
          <span>Grand Total</span>
          <span>{grandTotal.toFixed(2)} EGP</span>
        </div>
        {paid > 0 && (
          <div className="flex justify-between text-[#10B981] font-bold">
            <span>Already Paid</span>
            <span>-{paid.toFixed(2)} EGP</span>
          </div>
        )}
      </div>
      
      <div className={`p-3 rounded-xl border flex items-center justify-between mb-4 ${
        remaining > 0 
          ? 'bg-red-500/10 border-red-500/30 text-red-400' 
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      }`}>
        <span className="text-[11px] uppercase font-bold flex items-center gap-1.5">
          {remaining > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
          To Be Collected
        </span>
        <span className="font-black text-lg">{remaining > 0 ? remaining.toFixed(2) : '0.00'} EGP</span>
      </div>

      {remaining > 0 ? (
        <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
          <label className="text-[10px] uppercase tracking-widest font-bold text-[#8A8A9A]">Collect Payment Now</label>
          <div className="flex gap-2">
            <input 
              type="number" 
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[#C9A84C]"
              value={payment || ''}
              onChange={e => setPayment(parseFloat(e.target.value) || 0)}
              min="0"
              max={remaining}
            />
            <button 
              onClick={handlePay} 
              disabled={isSubmitting || payment <= 0}
              className="px-4 py-2 rounded-lg font-bold text-sm text-[#070E1A] transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #A87E30)' }}
            >
              {isSubmitting ? '...' : 'Pay'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-center font-bold text-[#10B981] mt-4 pt-4 border-t border-white/5 mb-4">
          Fully Paid!
        </p>
      )}

      {/* Section B: Follow-up Action */}
      {visit?.next_visit_plan && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Doctor&apos;s Note for Next Visit</span>
            </div>
            <p className="text-sm text-blue-100 font-semibold leading-snug mb-3">
              {visit?.next_visit_plan}
            </p>
            <a 
              href={`/receptionist/dashboard?patientId=${pt?.id || ''}&service=${encodeURIComponent(visit?.next_visit_plan || '')}`}
              onClick={() => {
                if (toastId) toast.dismiss(toastId);
                if (onDismiss) onDismiss();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              <Calendar className="w-4 h-4" /> Schedule Next Appointment <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      <button onClick={() => {
        if (toastId) toast.dismiss(toastId);
        if (onDismiss) onDismiss();
      }} className="w-full mt-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
        style={{ background: 'rgba(255,255,255,0.05)', color: '#8A8A9A' }}>
        Dismiss
      </button>
    </div>
    </>
  );
}

export default function BillingNotifier() {
  const [services, setServices] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    supabase.from('services').select('*').then(({ data }) => {
      if (data) setServices(data);
    });

    let channel: any;
    let authClient: any;

    async function setupRealtime() {
      const token = await getSessionTokenAction();
      console.log("[BillingNotifier] Realtime Token Status:", token ? "PRESENT" : "MISSING (You may need to logout and login again)");

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';
      
      authClient = createClient(supabaseUrl, supabaseAnonKey);
      if (token) {
        authClient.realtime.setAuth(token);
      } else {
        console.warn("[BillingNotifier] Connecting to realtime without auth token. RLS might block events.");
      }

      channel = authClient
        .channel('public:visits')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'visits' },
          async (payload: any) => {
            console.log('Supabase realtime payload:', payload);
            if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return;
            
            const newVisitId = payload.eventType === 'DELETE' ? payload.old.id : payload.new.id;
            if (!newVisitId) return;

            try {
              const { data: visit } = await getVisitDetailsAction(newVisitId);
              
              if (visit && visit.patient) {
                // Play cash register / notification sound
                try {
                  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
                  audio.play().catch(() => {});
                } catch (e) {}

                toast.custom((t) => <BillingInvoice visit={visit} toastId={t} services={services} />, { duration: 120000, position: 'top-center' });
              } else {
                console.warn("[BillingNotifier] Visit or patient missing in DB, skipping toast.");
              }
            } catch (error) {
              console.error('Error fetching visit details:', error);
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
  }, []);

  return null;
}
