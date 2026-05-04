'use client';

import React, { useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

interface InvoicePrintProps {
  visit: any;
  services?: any[];
  trigger?: React.ReactNode;
}

// ─── The actual printable sheet (pure layout, no print: prefixes) ─────────────
const InvoiceSheet = React.forwardRef<HTMLDivElement, { visit: any; services: any[] }>(
  function InvoiceSheet({ visit, services }, ref) {
    if (!visit) return null;
    const pt = visit.patient;
    const procedures = visit.procedure_performed ? visit.procedure_performed.split(', ') : ['General Visit'];
    const totalCost = visit.total_cost || 0;
    
    let calculatedTotal = 0;
    const itemized = procedures.map((proc: string) => {
      const svc = services.find(s => s.name === proc);
      const price = svc ? svc.price : 0;
      calculatedTotal += price;
      return { name: proc, price };
    });

    const adjustment = totalCost - calculatedTotal;

    // If no services matched or everything was 0, we put the full cost on the first item
    if (calculatedTotal === 0 && totalCost > 0 && itemized.length > 0) {
      itemized[0].price = totalCost;
      calculatedTotal = totalCost;
    }

    return (
      <div
        ref={ref}
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm 18mm',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          boxSizing: 'border-box',
        }}
      >
        <div style={{ border: '2px solid #1f2937', padding: '32px', borderRadius: '8px', minHeight: '257mm', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #d1d5db', paddingBottom: '24px', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '30px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px', color: '#111827', margin: 0 }}>Elite Dental Studio</h1>
              <p style={{ color: '#4b5563', fontSize: '14px', marginTop: '4px', marginBottom: '0' }}>123 Health Ave, Medical District</p>
              <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}>Tax ID: 987-654-321</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px', marginTop: 0 }}>Invoice</h2>
              <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}><strong>Date:</strong> {new Date(visit.visit_date).toLocaleDateString()}</p>
              <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}><strong>Invoice #:</strong> INV-{visit.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontWeight: 700, color: '#1f2937', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px', margin: 0 }}>Billed To</h3>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 2px 0' }}>{pt.first_name} {pt.last_name}</p>
            <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}>Patient ID: {pt.patient_id}</p>
          </div>

          <table style={{ width: '100%', marginBottom: '32px', fontSize: '14px', color: '#111827', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderTop: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Description / Service</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {itemized.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px' }}>{item.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {item.price > 0 ? `${item.price.toFixed(2)} EGP` : 'Included'}
                  </td>
                </tr>
              ))}
              {adjustment !== 0 && totalCost !== 0 && calculatedTotal !== totalCost && (
                <tr style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: 'rgba(249,250,251,0.5)' }}>
                  <td style={{ padding: '12px', fontStyle: 'italic' }}>{adjustment < 0 ? 'Discount / Adjustment' : 'Additional Charge / Adjustment'}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontStyle: 'italic' }}>{adjustment > 0 ? '+' : ''}{adjustment.toFixed(2)} EGP</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '48px' }}>
            <div style={{ width: '256px', fontSize: '14px', color: '#111827' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', borderTop: '1px solid #d1d5db', paddingTop: '8px', marginBottom: '8px' }}>
                <span>Total Cost</span>
                <span>{totalCost.toFixed(2)} EGP</span>
              </div>
              {(visit.previous_balance || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563', marginBottom: '8px' }}>
                  <span>Previous Balance</span>
                  <span>{visit.previous_balance.toFixed(2)} EGP</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginBottom: '8px' }}>
                <span>Amount Paid</span>
                <span>-{visit.amount_paid?.toFixed(2) || '0.00'} EGP</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '18px', borderTop: '2px solid #1f2937', paddingTop: '8px', marginTop: '8px' }}>
                <span>Remaining Balance</span>
                <span>{Math.max(0, totalCost + (visit.previous_balance || 0) - (visit.amount_paid || 0)).toFixed(2)} EGP</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '32px', borderTop: '2px solid #d1d5db', color: '#6b7280', fontSize: '14px' }}>
            <p style={{ margin: 0 }}>Thank you for trusting Elite Dental Studio.</p>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '192px', borderBottom: '1px solid #9ca3af', marginBottom: '8px', marginLeft: 'auto', marginRight: 'auto' }}></div>
              <p style={{ margin: 0 }}>Doctor&apos;s Signature / Clinic Stamp</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

// ─── Public component: owns the ref + print trigger ──────────────────────────
export default function InvoicePrint({ visit, services = [], trigger }: InvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice_${visit?.patient?.first_name}_${visit?.patient?.last_name}_${visit?.id?.slice(0, 8)}`,
    ignoreGlobalStyles: true,
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `,
  });

  const onPrintClick = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    handlePrint();
  }, [handlePrint]);

  return (
    <>
      {/* Trigger button — visible on screen */}
      {trigger ? (
        <span onClick={onPrintClick} className="contents cursor-pointer">
          {trigger}
        </span>
      ) : (
        <button
          onClick={onPrintClick}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-[#070E1A] transition-colors flex items-center justify-center gap-2"
          style={{ background: '#10B981' }}
        >
          <Printer className="w-4 h-4" /> Print Invoice
        </button>
      )}

      {/* Hidden sheet — rendered off-screen, picked up by react-to-print */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
        <InvoiceSheet ref={printRef} visit={visit} services={services} />
      </div>
    </>
  );
}
