'use client';

import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Clock, Wallet } from 'lucide-react';
import { Visit } from '@/lib/types';

interface FinancialAnalyticsProps {
  visits: Visit[];
}

export default function FinancialAnalytics({ visits }: FinancialAnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    visits.forEach(v => {
      if (!v.visit_date) return;
      const d = new Date(v.visit_date);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    // Ensure current month is always an option
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    
    return Array.from(months).sort().reverse();
  }, [visits]);

  const stats = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed month

    const startOfMonth = new Date(year, month, 1).getTime();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

    let previousBalance = 0;
    let currentMonthBalance = 0;
    let totalMonthlyRevenue = 0;
    let totalCollected = 0;

    visits.forEach(v => {
      if (!v.visit_date) return;
      const visitTime = new Date(v.visit_date).getTime();
      const totalCost = v.total_cost || 0;
      const amountPaid = v.amount_paid || 0;
      const debtFromVisit = totalCost - amountPaid;

      if (visitTime < startOfMonth) {
        previousBalance += debtFromVisit;
      } else if (visitTime >= startOfMonth && visitTime <= endOfMonth) {
        currentMonthBalance += debtFromVisit;
        totalMonthlyRevenue += totalCost;
        totalCollected += amountPaid;
      }
    });

    // Ensure debts don't go negative if overpaid (though unlikely in this system)
    previousBalance = Math.max(0, previousBalance);
    currentMonthBalance = Math.max(0, currentMonthBalance);

    const totalOutstandingBalance = previousBalance + currentMonthBalance;

    return {
      previousBalance,
      currentMonthBalance,
      totalOutstandingBalance,
      totalMonthlyRevenue,
      totalCollected
    };
  }, [visits, selectedMonth]);

  const formatCurrency = (val: number) => `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: '#E8E8F0' }}>Financial Analytics</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-[#0B1220] border rounded-lg px-4 py-2 text-sm font-semibold outline-none focus:ring-2 cursor-pointer transition-all hover:bg-white/5"
          style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}
        >
          {availableMonths.map(m => {
            const [y, mo] = m.split('-');
            const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
            return (
              <option key={m} value={m}>
                {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </option>
            );
          })}
        </select>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        {/* Revenue & Collected */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="glass-card-light p-5 flex flex-col justify-center rounded-2xl relative overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8A8A9A' }}>Monthly Revenue</p>
            </div>
            <p className="text-2xl font-black text-white">{formatCurrency(stats.totalMonthlyRevenue)}</p>
          </div>
          
          <div className="glass-card-light p-5 flex flex-col justify-center rounded-2xl relative overflow-hidden" style={{ border: '1px solid rgba(79,156,249,0.2)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8A8A9A' }}>Total Collected</p>
            </div>
            <p className="text-2xl font-black text-white">{formatCurrency(stats.totalCollected)}</p>
          </div>
        </div>

        {/* Debt Metrics */}
        <div className="flex-[1.5] grid grid-cols-3 gap-4">
          <div className="glass-card-light p-4 rounded-2xl flex flex-col justify-center relative overflow-hidden" style={{ border: '1px solid rgba(248,113,113,0.1)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: '#8A8A9A' }}>
              <Clock className="w-3 h-3 text-red-400/70" />
              Previous Balance
            </p>
            <p className="text-lg font-bold text-red-400">{formatCurrency(stats.previousBalance)}</p>
          </div>
          
          <div className="glass-card-light p-4 rounded-2xl flex flex-col justify-center relative overflow-hidden" style={{ border: '1px solid rgba(251,146,60,0.1)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: '#8A8A9A' }}>
              <AlertCircle className="w-3 h-3 text-orange-400/70" />
              Current M. Balance
            </p>
            <p className="text-lg font-bold text-orange-400">{formatCurrency(stats.currentMonthBalance)}</p>
          </div>

          <div className="glass-card-light p-4 rounded-2xl flex flex-col justify-center relative overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
              <DollarSign className="w-3 h-3" />
              Total Outstanding
            </p>
            <p className="text-xl font-black text-red-500">{formatCurrency(stats.totalOutstandingBalance)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
