'use client';

import { useState, useTransition } from 'react';
import { loginAction } from '@/app/actions';
import { Eye, EyeOff, Stethoscope, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError('');
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#070E1A]">
      {/* Ambient background orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #C9A84C, transparent)' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #10B981, transparent)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.02]"
        style={{ background: 'radial-gradient(circle, #C9A84C, transparent)' }} />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        <div className="glass-card p-10 shadow-2xl">
          
          {/* Logo & Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 pulse-gold"
              style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))', border: '1px solid rgba(201,168,76,0.3)' }}>
              <Stethoscope className="w-9 h-9" style={{ color: '#C9A84C' }} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gold-gradient mb-2">
              Elite Dental Studio
            </h1>
            <p className="text-sm" style={{ color: '#8A8A9A' }}>
              Secure Clinical Management System
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl flex items-center gap-3 text-sm"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#FCA5A5' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8A8A9A' }} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="doctor@elitedental.com"
                  className="input-premium pl-11"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8A8A9A' }} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="input-premium pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#8A8A9A' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="btn-gold w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#070E1A]/30 border-t-[#070E1A] rounded-full animate-spin" />
                  Authenticating…
                </>
              ) : (
                'Sign In to EMR'
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs mt-8" style={{ color: '#5A5A6A' }}>
            Access is restricted to authorized clinical staff only
          </p>
        </div>

        {/* Version */}
        <p className="text-center text-xs mt-4" style={{ color: '#3A3A4A' }}>
          Elite Dental Studio EMR v2.0 · HIPAA Compliant
        </p>
      </div>
    </div>
  );
}
