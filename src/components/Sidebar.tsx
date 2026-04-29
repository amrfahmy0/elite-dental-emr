'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions';
import { useTransition } from 'react';
import {
  Stethoscope, LayoutDashboard, Users, CalendarDays,
  FileText, LogOut, ChevronRight, Menu, X, ListChecks
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  role: 'DOCTOR' | 'RECEPTIONIST';
  userName: string;
}

const doctorNav: NavItem[] = [
  { label: 'Dashboard', href: '/doctor/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'My Patients', href: '/doctor/patients', icon: <Users className="w-5 h-5" /> },
];

const receptionistNav: NavItem[] = [
  { label: 'Calendar',    href: '/receptionist/dashboard',    icon: <CalendarDays className="w-5 h-5" /> },
  { label: 'Queue',       href: '/receptionist/queue',        icon: <ListChecks className="w-5 h-5" /> },
  { label: 'Patients',    href: '/receptionist/patients',     icon: <Users className="w-5 h-5" /> },
  { label: 'New Patient', href: '/receptionist/patients/new', icon: <FileText className="w-5 h-5" /> },
];

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const navItems = role === 'DOCTOR' ? doctorNav : receptionistNav;

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#C9A84C] text-[#070E1A] shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`w-64 h-screen flex flex-col fixed left-0 top-0 z-40 transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
        style={{ background: 'linear-gradient(180deg, #070E1A 0%, #0B1220 100%)', borderRight: '1px solid rgba(201,168,76,0.1)' }}>

      
      {/* Logo */}
      <div className="px-6 py-7 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.1))', border: '1px solid rgba(201,168,76,0.3)' }}>
            <Stethoscope className="w-5 h-5" style={{ color: '#C9A84C' }} />
          </div>
          <div>
            <p className="text-sm font-bold text-gold-gradient leading-tight">Elite Dental</p>
            <p className="text-xs" style={{ color: '#5A5A6A' }}>Studio EMR</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(201,168,76,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}>
            {userName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: '#E8E8F0' }}>{userName}</p>
            <p className="text-xs mt-0.5" style={{ color: '#5A5A6A' }}>
              {role === 'DOCTOR' ? '🩺 Physician' : '💼 Receptionist'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        <p className="text-xs uppercase tracking-widest font-semibold px-2 mb-3" style={{ color: '#3A3A4A' }}>
          {role === 'DOCTOR' ? 'Clinical' : 'Front Desk'}
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
              <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'text-[#070E1A]'
                  : 'hover:bg-white/5'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, #C9A84C, #A87E30)', color: '#070E1A' } : { color: '#8A8A9A' }}>
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-5 border-t" style={{ borderColor: 'rgba(201,168,76,0.06)' }}>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium hover:bg-red-500/10 disabled:opacity-50"
          style={{ color: '#8A8A9A' }}
        >
          <LogOut className="w-5 h-5" />
          {isPending ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </aside>
    </>
  );
}
