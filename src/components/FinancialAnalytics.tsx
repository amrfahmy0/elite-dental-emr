'use client';

import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Clock, Wallet, Phone, Calendar as CalendarIcon, User } from 'lucide-react';
import { Visit } from '@/lib/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface FinancialAnalyticsProps {
  visits: Visit[];
}

export default function FinancialAnalytics({ visits }: FinancialAnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { realDailyData, realProcedureData, realDebtors } = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed month

    const startOfMonth = new Date(year, month, 1).getTime();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

    // 1. Daily Revenue Trend (for selected month)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyMap = new Map<number, number>();
    for (let i = 1; i <= daysInMonth; i++) dailyMap.set(i, 0);

    // 2. Revenue by Procedure (for selected month)
    const procedureMap = new Map<string, number>();

    // 3. Actionable Debtors Table (All Time)
    const debtorMap = new Map<string, { id: string, name: string, phone: string, lastVisit: number, owed: number }>();

    visits.forEach(v => {
      if (!v.visit_date) return;
      const visitTime = new Date(v.visit_date).getTime();
      const totalCost = v.total_cost || 0;
      const amountPaid = v.amount_paid || 0;
      const debtFromVisit = totalCost - amountPaid;

      // Accumulate all-time debt for debtors table
      const patientId = v.patient_id;
      if (!debtorMap.has(patientId)) {
        debtorMap.set(patientId, {
          id: patientId,
          name: v.patient ? `${v.patient.first_name} ${v.patient.last_name}` : 'Unknown Patient',
          phone: v.patient?.contact_number || 'N/A',
          lastVisit: visitTime,
          owed: 0
        });
      }
      const debtor = debtorMap.get(patientId)!;
      debtor.owed += debtFromVisit;
      if (visitTime > debtor.lastVisit) debtor.lastVisit = visitTime;

      // Process strictly within the selected month
      if (visitTime >= startOfMonth && visitTime <= endOfMonth) {
        // Daily
        const day = new Date(v.visit_date).getDate();
        dailyMap.set(day, dailyMap.get(day)! + totalCost);

        // Procedures
        if (v.procedure_performed) {
          const procString = v.procedure_performed.trim();
          procedureMap.set(procString, (procedureMap.get(procString) || 0) + totalCost);
        } else {
          procedureMap.set('General / Checkup', (procedureMap.get('General / Checkup') || 0) + totalCost);
        }
      }
    });

    const dailyData = Array.from(dailyMap.entries()).map(([day, rev]) => ({
      date: day.toString(),
      revenue: rev
    }));

    const COLORS = ['#C9A84C', '#4F9CF9', '#10B981', '#F59E0B', '#A87E30', '#8A8A9A'];
    let colorIndex = 0;
    const procedureData = Array.from(procedureMap.entries())
      .map(([name, val]) => ({
        name: name.length > 25 ? name.slice(0,25) + '...' : name,
        value: val,
        color: COLORS[colorIndex++ % COLORS.length]
      }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value);

    const debtors = Array.from(debtorMap.values())
      .filter(d => d.owed > 0)
      .sort((a, b) => b.owed - a.owed)
      .map(d => ({
        ...d,
        lastVisit: new Date(d.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }));

    return {
      realDailyData: dailyData,
      realProcedureData: procedureData,
      realDebtors: debtors
    };
  }, [visits, selectedMonth]);

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

      {/* Charts Row */}
      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        
        {/* Daily Revenue Trend (2/3 width) */}
        <div className="flex-[2] glass-card-light p-6 rounded-2xl border" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
          <h3 className="text-sm font-bold mb-6" style={{ color: '#E8E8F0' }}>Daily Revenue Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realDailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="#6A6A7A" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6A6A7A" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0B1220', borderColor: 'rgba(201,168,76,0.2)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#C9A84C', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Procedure (1/3 width) */}
        <div className="flex-1 glass-card-light p-6 rounded-2xl border flex flex-col" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: '#E8E8F0' }}>Revenue by Procedure</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {realProcedureData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={realProcedureData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {realProcedureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0B1220', borderColor: 'rgba(201,168,76,0.2)', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number) => `${formatCurrency(value)}`}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value, entry: any) => <span style={{ color: '#E8E8F0', fontSize: '11px', fontWeight: '500' }}>{value}</span>}
                  />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-xs" style={{ color: '#6A6A7A' }}>
                  No revenue data for this month
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Actionable Debtors Table (Full Width) */}
      <div className="mt-6 glass-card-light rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'rgba(239,68,68,0.1)', background: 'rgba(239,68,68,0.03)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#EF4444' }}>
            <AlertCircle className="w-4 h-4" /> Actionable Debtors
          </h3>
          <p className="text-xs mt-1" style={{ color: '#8A8A9A' }}>Patients actively contributing to the Total Outstanding Balance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.02)', color: '#8A8A9A' }}>
              <tr>
                <th className="px-6 py-4 font-semibold">Patient Name</th>
                <th className="px-6 py-4 font-semibold">Contact Info</th>
                <th className="px-6 py-4 font-semibold">Last Visit</th>
                <th className="px-6 py-4 font-semibold text-right">Owed Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {realDebtors.length > 0 ? realDebtors.map((debtor) => (
                <tr key={debtor.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-400">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-semibold" style={{ color: '#E8E8F0' }}>{debtor.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" style={{ color: '#A8A8B8' }}>
                      <Phone className="w-3.5 h-3.5" />
                      {debtor.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" style={{ color: '#A8A8B8' }}>
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {debtor.lastVisit}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black" style={{ color: '#EF4444' }}>
                    {formatCurrency(debtor.owed)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-all hover:scale-105"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                      Send Reminder
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs" style={{ color: '#6A6A7A' }}>
                    No patients with outstanding balances.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
