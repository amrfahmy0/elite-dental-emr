'use client';

import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Clock, Wallet, Phone, Calendar as CalendarIcon, User, TrendingDown, CheckCircle2, FileText, Activity, Plus } from 'lucide-react';
import { Visit, Service, Expense } from '@/lib/types';
import { addExpenseAction } from '@/app/doctor/analytics/actions';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface FinancialAnalyticsProps {
  visits: Visit[];
  services: Service[];
  expenses: Expense[];
  doctorId: string;
}

export default function FinancialAnalytics({ visits, services, expenses: initialExpenses, doctorId }: FinancialAnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [localExpenses, setLocalExpenses] = useState<Expense[]>(initialExpenses);

  const [expenseForm, setExpenseForm] = useState({ amount: '', category: 'Supplies', payee: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveExpense = async () => {
    if (!expenseForm.amount || !expenseForm.category || !expenseForm.payee || isSaving) return;
    setIsSaving(true);

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // If the user selected the current month, log it as today. Otherwise, log it as the 1st of the historical month.
    const expenseDate = selectedMonth === currentMonthStr 
      ? now.toISOString().split('T')[0]
      : `${selectedMonth}-01`;

    const newExpense = {
      expense_date: expenseDate,
      category: expenseForm.category,
      payee: expenseForm.payee,
      amount: parseFloat(expenseForm.amount)
    };

    const { data, error } = await addExpenseAction(newExpense);
    
    setIsSaving(false);
    
    if (!error && data) {
      setLocalExpenses([...localExpenses, data as Expense]);
      setExpenseForm({ amount: '', category: 'Supplies', payee: '' });
      // Toast notification would go here in a full implementation
    } else {
      console.error("Failed to save expense:", error);
      alert(`Failed to save expense: ${error}`);
    }
  };

  const { realDailyData, realProcedureData, realDebtors, stats, expenseData, monthExpenses } = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed month

    const startOfMonth = new Date(year, month, 1).getTime();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

    let totalMonthlyRevenue = 0;
    let totalCollected = 0;

    // 1. Daily Revenue Trend (for selected month)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyMap = new Map<number, number>();
    for (let i = 1; i <= daysInMonth; i++) dailyMap.set(i, 0);

    // 2. Revenue by Procedure (for selected month)
    const procedureMap = new Map<string, number>();

    // 3. Debt mapping per patient
    const patientDebts = new Map<string, {
      id: string, name: string, phone: string,
      hasAllTimeVisit: boolean,
      hasBeforeMonthVisit: boolean,
      owedAllTime: number,
      owedBeforeMonth: number
    }>();

    visits.forEach(v => {
      if (!v.visit_date) return;
      const visitTime = new Date(v.visit_date).getTime();
      const patientId = v.patient_id;
      const totalCost = v.total_cost || 0;
      const amountPaid = v.amount_paid || 0;
      
      const owedAfterThisVisit = Math.max(0, (totalCost) + (v.previous_balance || 0) - (amountPaid));

      if (!patientDebts.has(patientId)) {
        patientDebts.set(patientId, {
          id: patientId,
          name: v.patient ? `${v.patient.first_name} ${v.patient.last_name}` : 'Unknown Patient',
          phone: v.patient?.contact_number || 'N/A',
          hasAllTimeVisit: false,
          hasBeforeMonthVisit: false,
          owedAllTime: 0,
          owedBeforeMonth: 0
        });
      }

      const pState = patientDebts.get(patientId)!;

      // Because visits are sorted NEWEST first, the FIRST visit we encounter is their absolute CURRENT debt
      if (!pState.hasAllTimeVisit) {
        pState.owedAllTime = owedAfterThisVisit;
        pState.hasAllTimeVisit = true;
      }

      // The FIRST visit we encounter that is older than startOfMonth is their TRUE previous debt
      if (visitTime < startOfMonth && !pState.hasBeforeMonthVisit) {
        pState.owedBeforeMonth = owedAfterThisVisit;
        pState.hasBeforeMonthVisit = true;
      }

      // Process strictly within the selected month for revenue metrics
      if (visitTime >= startOfMonth && visitTime <= endOfMonth) {
        totalMonthlyRevenue += totalCost;
        totalCollected += amountPaid;

        // Daily
        const day = new Date(v.visit_date).getDate();
        dailyMap.set(day, dailyMap.get(day)! + totalCost);

        // Procedures
        if (v.procedure_performed) {
          const procNames = v.procedure_performed.split(',').map(s => s.trim()).filter(Boolean);
          if (procNames.length > 0) {
            const distributedCost = totalCost / procNames.length;
            procNames.forEach(proc => {
              // Only include recognized services
              const matchedService = services?.find(s => s.name.toLowerCase() === proc.toLowerCase());
              if (matchedService) {
                procedureMap.set(matchedService.name, (procedureMap.get(matchedService.name) || 0) + distributedCost);
              }
            });
          }
        }
      }
    });

    const dailyData = Array.from(dailyMap.entries()).map(([day, rev]) => ({
      date: day.toString(),
      revenue: rev
    }));

    // Vibrant distinct color palette to guarantee differentiation
    const COLORS = ['#4F9CF9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#EAB308', '#F43F5E', '#14B8A6', '#C9A84C', '#6366F1'];
    let colorIndex = 0;
    
    const procedureData = Array.from(procedureMap.entries())
      .map(([name, val]) => {
        // Enforce a distinct color for every procedure slice to ensure they are visually separate
        const color = COLORS[colorIndex++ % COLORS.length];
        return {
          name: name.length > 25 ? name.slice(0,25) + '...' : name,
          value: val,
          color: color
        };
      })
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value);

    const debtors = Array.from(patientDebts.values())
      .filter(d => d.owedAllTime > 0)
      .sort((a, b) => b.owedAllTime - a.owedAllTime)
      .map(d => {
        return {
          id: d.id,
          name: d.name,
          phone: d.phone,
          // Since we no longer track the exact timestamp of the newest visit inside the array mapping, we just display 'Current' or fetch it from the original visits array
          lastVisit: new Date(visits.find(v => v.patient_id === d.id)?.visit_date || 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          owed: d.owedAllTime
        };
      });

    let previousBalance = 0;
    Array.from(patientDebts.values()).forEach(d => {
      previousBalance += d.owedBeforeMonth;
    });

    // Mathematically lock the equations so they perfectly balance according to clinic accounting rules
    const currentMonthBalance = totalMonthlyRevenue - totalCollected;
    const totalOutstandingBalance = Math.max(0, previousBalance + currentMonthBalance);

    // Expenses Calculation
    let totalExpenses = 0;
    const expenseCategoryMap = new Map<string, number>();
    
    const currentMonthExpenses = localExpenses.filter(e => e.expense_date && e.expense_date.startsWith(selectedMonth)).sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

    currentMonthExpenses.forEach(e => {
      totalExpenses += e.amount;
      expenseCategoryMap.set(e.category, (expenseCategoryMap.get(e.category) || 0) + e.amount);
    });

    const EXPENSE_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#8B5CF6', '#64748B', '#A8A29E'];
    let expColorIndex = 0;
    const expenseChartData = Array.from(expenseCategoryMap.entries())
      .map(([name, val]) => ({
        name,
        value: val,
        color: EXPENSE_COLORS[expColorIndex++ % EXPENSE_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

    const netProfit = totalCollected - totalExpenses;

    return {
      realDailyData: dailyData,
      realProcedureData: procedureData,
      realDebtors: debtors,
      expenseData: expenseChartData,
      monthExpenses: currentMonthExpenses,
      stats: {
        previousBalance,
        currentMonthBalance,
        totalOutstandingBalance,
        totalMonthlyRevenue,
        totalCollected,
        totalExpenses,
        netProfit
      }
    };
  }, [visits, selectedMonth, services, localExpenses]);

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

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    return `${isNegative ? '-' : ''}${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
  };

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
        {/* Core P&L */}
        <div className="flex-[1.2] grid grid-cols-2 gap-4">
          <div className="glass-card-light p-4 flex flex-col justify-center rounded-2xl relative overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8A8A9A' }}>Monthly Revenue</p>
            </div>
            <p className="text-xl font-black text-white">{formatCurrency(stats.totalMonthlyRevenue)}</p>
          </div>
          
          <div className="glass-card-light p-4 flex flex-col justify-center rounded-2xl relative overflow-hidden" style={{ border: '1px solid rgba(79,156,249,0.2)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8A8A9A' }}>Total Collected</p>
            </div>
            <p className="text-xl font-black text-white">{formatCurrency(stats.totalCollected)}</p>
          </div>

          <div className="glass-card-light p-4 flex flex-col justify-center rounded-2xl relative overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-lg bg-red-500/20 text-red-400">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8A8A9A' }}>Total Expenses</p>
            </div>
            <p className="text-xl font-black text-white">{formatCurrency(stats.totalExpenses)}</p>
          </div>

          <div className="glass-card-light p-4 flex flex-col justify-center rounded-2xl relative overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.05)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A84C]/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-lg bg-[#C9A84C]/20 text-[#C9A84C]">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C9A84C' }}>Net Profit</p>
            </div>
            <p className="text-xl font-black text-[#C9A84C]">{formatCurrency(stats.netProfit)}</p>
          </div>
        </div>

        {/* Debt Metrics */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-4">
          <div className="glass-card-light p-3 rounded-2xl flex flex-col justify-center relative overflow-hidden" style={{ border: '1px solid rgba(248,113,113,0.1)' }}>
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5" style={{ color: '#8A8A9A' }}>
              <Clock className="w-3 h-3 text-red-400/70" /> Previous Balance
            </p>
            <p className="text-base font-bold text-red-400">{formatCurrency(stats.previousBalance)}</p>
          </div>
          
          <div className="glass-card-light p-3 rounded-2xl flex flex-col justify-center relative overflow-hidden" style={{ border: '1px solid rgba(251,146,60,0.1)' }}>
            <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5" style={{ color: '#8A8A9A' }}>
              <AlertCircle className="w-3 h-3 text-orange-400/70" /> Net Debt Change
            </p>
            <p className="text-base font-bold text-orange-400">{formatCurrency(stats.currentMonthBalance)}</p>
          </div>

          <div className="glass-card-light p-3 rounded-2xl flex flex-col justify-center relative overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
              <DollarSign className="w-3 h-3" /> Total Outstanding
            </p>
            <p className="text-lg font-black text-red-500">{formatCurrency(stats.totalOutstandingBalance)}</p>
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
        <div className="flex-1 glass-card-light p-6 rounded-2xl border flex flex-col justify-center" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: '#E8E8F0' }}>Revenue by Procedure</h3>
          <div className="flex-1 w-full min-h-[300px] flex flex-col justify-center">
            <ResponsiveContainer width="100%" height="100%">
              {realProcedureData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={realProcedureData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
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
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span style={{ color: '#E8E8F0', fontSize: '11px', fontWeight: '500' }}>{value}</span>}
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

      {/* P&L Tracking Section (Expenses) */}
      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        
        {/* Expense Log Form & Table (2/3 width) */}
        <div className="flex-[2] flex flex-col gap-6">
          <div className="glass-card-light p-6 rounded-2xl border" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#E8E8F0' }}>
              <Plus className="w-4 h-4 text-red-400" /> Log New Expense
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="text-xs font-semibold mb-1.5 block text-[#8A8A9A]">Amount (EGP)</label>
                <input type="number" className="w-full bg-[#0B1220] border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500/50" style={{ borderColor: 'rgba(239,68,68,0.3)' }} placeholder="e.g. 500" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
              </div>
              <div className="flex-1 w-full">
                <label className="text-xs font-semibold mb-1.5 block text-[#8A8A9A]">Category</label>
                <select className="w-full bg-[#0B1220] border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500/50" style={{ borderColor: 'rgba(239,68,68,0.3)' }} value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                  <option>Supplies</option>
                  <option>Salaries</option>
                  <option>Lab Fees</option>
                  <option>Maintenance</option>
                  <option>Marketing</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="text-xs font-semibold mb-1.5 block text-[#8A8A9A]">Payee / Paid To</label>
                <input type="text" className="w-full bg-[#0B1220] border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500/50" style={{ borderColor: 'rgba(239,68,68,0.3)' }} placeholder="e.g. Dental Med" value={expenseForm.payee} onChange={e => setExpenseForm({...expenseForm, payee: e.target.value})} />
              </div>
              <button onClick={handleSaveExpense} disabled={isSaving} className="w-full md:w-auto px-6 py-2 rounded-lg text-sm font-bold tracking-wider transition-all hover:scale-105 whitespace-nowrap disabled:opacity-50" style={{ background: '#EF4444', color: '#fff' }}>
                {isSaving ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </div>

          {/* Monthly Expense Table */}
          <div className="glass-card-light rounded-2xl border overflow-hidden flex-1 flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#E8E8F0' }}>
                <FileText className="w-4 h-4 text-gray-400" /> Expense Log
              </h3>
            </div>
            <div className="overflow-y-auto max-h-[250px]">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase tracking-wider sticky top-0" style={{ background: '#0B1220', color: '#8A8A9A' }}>
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Payee</th>
                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                  {monthExpenses.length > 0 ? monthExpenses.map(exp => (
                    <tr key={exp.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-xs" style={{ color: '#A8A8B8' }}>{new Date(exp.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#E8E8F0' }}>{exp.category}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#A8A8B8' }}>{exp.payee}</td>
                      <td className="px-4 py-3 text-xs font-bold text-right text-red-400">{formatCurrency(exp.amount)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-xs" style={{ color: '#6A6A7A' }}>No expenses recorded this month</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Expenses by Category Chart (1/3 width) */}
        <div className="flex-1 glass-card-light p-6 rounded-2xl border flex flex-col" style={{ borderColor: 'rgba(239,68,68,0.1)' }}>
          <h3 className="text-sm font-bold mb-6 flex items-center gap-2" style={{ color: '#E8E8F0' }}>
            <TrendingDown className="w-4 h-4 text-red-400" /> Expenses by Category
          </h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {expenseData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0B1220', borderColor: 'rgba(239,68,68,0.2)', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number) => `${formatCurrency(value)}`}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span style={{ color: '#E8E8F0', fontSize: '11px', fontWeight: '500' }}>{value}</span>}
                  />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-xs" style={{ color: '#6A6A7A' }}>
                  No expenses for this month
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
