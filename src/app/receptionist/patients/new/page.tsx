'use client';

import { useState, useTransition } from 'react';
import { createPatientAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import {
  User, Phone, Mail, MapPin, Heart, AlertTriangle,
  ChevronRight, ChevronLeft, CheckCircle, Activity
} from 'lucide-react';

export default function NewPatientPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [bleedingDisorder, setBleedingDisorder] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('has_bleeding_disorder', bleedingDisorder.toString());
    setError('');
    startTransition(async () => {
      const result = await createPatientAction(formData);
      if (result.error) { setError(result.error); return; }
      setSuccess(true);
      setTimeout(() => router.push('/receptionist/patients'), 1500);
    });
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)' }}>
            <CheckCircle className="w-10 h-10" style={{ color: '#10B981' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#10B981' }}>Patient Registered!</h2>
          <p className="text-sm" style={{ color: '#6A6A7A' }}>Redirecting to patient list…</p>
        </div>
      </div>
    );
  }

  const stepLabel = ['Personal Info', 'Contact Details', 'Medical History'];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gold-gradient">New Patient Registration</h1>
        <p className="text-sm mt-1" style={{ color: '#6A6A7A' }}>Complete all sections for the patient record</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {stepLabel.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const active = step === num;
          return (
            <div key={num} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    background: done ? 'rgba(16,185,129,0.2)' : active ? 'linear-gradient(135deg, #C9A84C, #A87E30)' : 'rgba(255,255,255,0.05)',
                    border: done ? '1px solid rgba(16,185,129,0.4)' : active ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    color: done ? '#10B981' : active ? '#070E1A' : '#6A6A7A',
                  }}>
                  {done ? '✓' : num}
                </div>
                <span className="text-xs font-medium hidden sm:block" style={{ color: active ? '#C9A84C' : '#6A6A7A' }}>
                  {label}
                </span>
              </div>
              {i < stepLabel.length - 1 && (
                <div className="flex-1 h-px ml-2" style={{ background: step > num ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)' }} />
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass-card p-7">
          {/* Step 1: Personal */}
          <div className={step === 1 ? "space-y-5 animate-fade-in-up" : "hidden"}>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5" style={{ color: '#C9A84C' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#E8E8F0' }}>Personal Information</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input name="first_name" required placeholder="Ahmed" className="input-premium" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input name="last_name" required placeholder="Hassan" className="input-premium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                    Date of Birth <span className="text-red-400">*</span>
                  </label>
                  <input name="date_of_birth" type="date" required className="input-premium" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                    Gender <span className="text-red-400">*</span>
                  </label>
                  <select name="gender" required className="input-premium">
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button type="button" onClick={() => setStep(2)}
                  className="btn-gold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* Step 2: Contact */}
          <div className={step === 2 ? "space-y-5 animate-fade-in-up" : "hidden"}>
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5" style={{ color: '#C9A84C' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#E8E8F0' }}>Contact Details</h2>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6A6A7A' }} />
                  <input name="contact_number" required placeholder="+20 10 xxxx xxxx" className="input-premium pl-10" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6A6A7A' }} />
                  <input name="email" type="email" placeholder="patient@email.com" className="input-premium pl-10" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4" style={{ color: '#6A6A7A' }} />
                  <textarea name="address" rows={2} placeholder="Home address…" className="input-premium pl-10 resize-none" />
                </div>
              </div>
              <div className="pt-4 flex justify-between">
                <button type="button" onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8A8A9A' }}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={() => setStep(3)}
                  className="btn-gold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* Step 3: Medical */}
          <div className={step === 3 ? "space-y-5 animate-fade-in-up" : "hidden"}>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5" style={{ color: '#C9A84C' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#E8E8F0' }}>Medical History</h2>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                  Medical History
                </label>
                <textarea name="medical_history" rows={3} placeholder="Diabetes, Hypertension, Heart conditions…"
                  className="input-premium resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>
                  Known Allergies
                </label>
                <textarea name="allergies" rows={2} placeholder="Penicillin, Latex, NSAIDs…"
                  className="input-premium resize-none" />
              </div>

              {/* Bleeding Disorder Toggle */}
              <div className="p-4 rounded-xl" style={{ background: bleedingDisorder ? 'rgba(220,38,38,0.1)' : 'rgba(255,255,255,0.03)', border: bleedingDisorder ? '1px solid rgba(220,38,38,0.4)' : '1px solid rgba(255,255,255,0.06)', transition: 'all 0.3s' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5" style={{ color: bleedingDisorder ? '#EF4444' : '#6A6A7A' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: bleedingDisorder ? '#FCA5A5' : '#E8E8F0' }}>
                        Bleeding Disorder
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#6A6A7A' }}>
                        Hemophilia, Von Willebrand disease, etc.
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setBleedingDisorder(!bleedingDisorder)}
                    className="w-12 h-6 rounded-full relative transition-all duration-300 focus:outline-none"
                    style={{ background: bleedingDisorder ? '#EF4444' : 'rgba(255,255,255,0.1)' }}>
                    <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                      style={{ left: bleedingDisorder ? '26px' : '4px' }} />
                  </button>
                </div>
                {bleedingDisorder && (
                  <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: '#FCA5A5' }}>
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>⚠ This patient will be flagged with a <strong>RED WARNING BADGE</strong> in all views.</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="px-4 py-2.5 rounded-xl text-sm"
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', color: '#FCA5A5' }}>
                  {error}
                </div>
              )}

              <div className="pt-2 flex justify-between">
                <button type="button" onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8A8A9A' }}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" disabled={isPending}
                  className="btn-gold px-7 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
                  {isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#070E1A]/30 border-t-[#070E1A] rounded-full animate-spin" />
                      Registering…
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" /> Register Patient
                    </>
                  )}
                </button>
              </div>
            </div>
        </div>
      </form>
    </div>
  );
}
