'use client';

/**
 * Minimal Tabs primitive — shadcn/ui-compatible API surface.
 * Styled to the Elite Dental Studio midnight-blue / gold design system.
 * No external dependencies beyond React.
 */

import React, { createContext, useContext, useState, useId } from 'react';

// ─── Context ──────────────────────────────────────────────────────────────────
interface TabsCtx {
  activeTab: string;
  setActiveTab: (v: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsCtx | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs sub-component used outside <Tabs>');
  return ctx;
}

// ─── Tabs (root) ──────────────────────────────────────────────────────────────
interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className = '' }: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue);
  const activeTab = value ?? internal;

  const setActiveTab = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// ─── TabsList ─────────────────────────────────────────────────────────────────
interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center rounded-xl p-1 ${className}`}
      style={{
        background: 'rgba(9,14,23,0.7)',
        border: '1px solid rgba(212,175,55,0.15)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {children}
    </div>
  );
}

// ─── TabsTrigger ──────────────────────────────────────────────────────────────
interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const { activeTab, setActiveTab, baseId } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      id={`${baseId}-trigger-${value}`}
      aria-controls={`${baseId}-content-${value}`}
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={`
        relative px-5 py-2 rounded-lg text-sm font-semibold
        transition-all duration-200 whitespace-nowrap outline-none
        focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50
        ${className}
      `}
      style={
        isActive
          ? {
              background: 'linear-gradient(135deg, rgba(212,175,55,0.22), rgba(212,175,55,0.10))',
              color: '#D4AF37',
              boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.35), 0 2px 12px rgba(212,175,55,0.12)',
            }
          : {
              background: 'transparent',
              color: '#6A7A8E',
            }
      }
    >
      {/* Active indicator dot */}
      {isActive && (
        <span
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
          style={{ background: '#D4AF37', opacity: 0.8 }}
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

// ─── TabsContent ─────────────────────────────────────────────────────────────
interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { activeTab, baseId } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-content-${value}`}
      aria-labelledby={`${baseId}-trigger-${value}`}
      className={`outline-none animate-fade-in-up ${className}`}
    >
      {children}
    </div>
  );
}
