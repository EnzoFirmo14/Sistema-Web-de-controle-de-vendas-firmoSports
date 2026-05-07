import React, { CSSProperties } from 'react';
import {
  BarChart3,
  Package,
  Layers,
  LogOut,
  PlusCircle,
  Shirt
} from 'lucide-react';
import logoFallback from '../Design_sem_nome__2_-removebg-preview.png';
import { logOut } from '../firebase';
import { useStore } from '../hooks/useStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Design tokens — Dark Theme — Firmo Sports
const COLORS = {
  bgGlobal:    '#0f1729',
  bgCard:      '#1a2540',
  bgHover:     '#222d45',
  bgActive:    '#3d4f7c',
  accent:      '#818cf8',
  accentPink:  '#f472b6',
  accentRed:   '#f87171',
  accentAmber: '#fbbf24',
  accentGreen: '#34d399',
  textPrimary: '#e2e8f0',
  textMuted:   '#94a3b8',
  border:      '#1e2d4a',
};

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
}

export default function Sidebar({ activeTab, setActiveTab, user }: SidebarProps) {
  const { storeInfo } = useStore();

  // Inline SVG icon components for new menu items
  const CubeIcon = ({ className, style }: { className?: string; style?: CSSProperties }) => (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );

  const TagIcon = ({ className, style }: { className?: string; style?: CSSProperties }) => (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );

  const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'orders', icon: Package, label: 'Camisas' },
    { id: 'batches', icon: Layers, label: 'Envios' },
    { id: 'precos', icon: TagIcon, label: 'Preços' },
    { id: 'new-order', icon: PlusCircle, label: 'Novo' },
  ];

  const displayName = storeInfo?.name || 'Minha Loja';
  const displayLogo = storeInfo?.logoUrl || logoFallback;

  return (
    <>
      {/* Desktop Sidebar — 220px */}
      <div
        className="hidden lg:flex w-[220px] flex-col h-screen sticky top-0"
        style={{
          background: COLORS.bgCard,
          borderRight: `1px solid ${COLORS.border}`,
        }}
      >
        {/* Store Brand */}
        <div
          className="px-5 py-5 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${COLORS.border}` }}
        >
          <img
            src={displayLogo}
            alt="Logo"
            className="w-8 h-8 object-contain rounded-md"
          />
          <span
            className="font-semibold text-sm truncate"
            style={{ color: COLORS.textPrimary }}
          >
            {displayName}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium nav-item btn-press"
              style={{
                background: activeTab === item.id ? '#3d4f7c' : 'transparent',
                color: activeTab === item.id ? COLORS.textPrimary : COLORS.textMuted,
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item.id) e.currentTarget.style.background = COLORS.bgHover;
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              <item.icon
                className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                style={{ transform: activeTab === item.id ? 'scale(1.1)' : 'scale(1)' }}
              />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User + Logout */}
        <div
          className="px-3 py-4 space-y-2"
          style={{ borderTop: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: COLORS.bgHover, color: COLORS.textMuted }}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <Shirt className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-medium truncate"
                style={{ color: COLORS.textPrimary }}
              >
                {user?.displayName || 'Admin'}
              </p>
              <p
                className="text-[11px] truncate"
                style={{ color: COLORS.textMuted }}
              >
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={logOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium nav-item btn-press"
            style={{
              color: COLORS.textMuted,
              transition: 'color 200ms cubic-bezier(0.23, 1, 0.32, 1), background-color 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 160ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#450a0a';
              e.currentTarget.style.color = COLORS.accentRed;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = COLORS.textMuted;
            }}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: COLORS.bgCard,
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="flex items-center justify-around py-2 px-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg nav-item btn-press min-w-[56px]"
              style={{
                color: activeTab === item.id ? COLORS.textPrimary : COLORS.textMuted,
                background: activeTab === item.id ? '#3d4f7c' : 'transparent',
              }}
            >
              <item.icon
                className="w-4.5 h-4.5 transition-transform duration-200"
                style={{ transform: activeTab === item.id ? 'scale(1.1) translateY(-1px)' : 'scale(1)' }}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
