import React, { useState } from 'react';
import { 
  Menu, 
  Search, 
  Sun, 
  Moon, 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Cpu, 
  Banknote,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useAppStore } from '../../core/store/appStore';
import { hardwareService } from '../../core/hardware/hardwareService';
import { HardwareSettingsModal } from '../components/HardwareSettingsModal';

interface TopBarProps {
  onMenuClick: () => void;
  isMenuOpen: boolean;
}

export function TopBar({ onMenuClick, isMenuOpen }: TopBarProps) {
  const { profile, user, logout } = useAuth();
  const isOffline = useAppStore(state => state.isOfflineMode);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [drawerKicked, setDrawerKicked] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenu = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isAccountMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!accountMenu.current?.contains(event.target as Node)) setIsAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAccountMenuOpen]);

  const [isDark, setIsDark] = React.useState(
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  const handleQuickDrawerKick = async () => {
    setDrawerKicked(true);
    await hardwareService.kickCashDrawer();
    setTimeout(() => setDrawerKicked(false), 1500);
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-[#ebd5da] flex items-center justify-between px-3 md:px-6 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            aria-controls="app-sidebar"
            aria-expanded={isMenuOpen}
            className="lg:hidden p-2 -ml-1 text-[#800000] hover:bg-[#fdf5f6] rounded-xl transition-colors cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-base font-black tracking-tight text-[#800000]">
              Talk of the Town
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#fdf5f6] border border-[#ebd5da] text-[#800000]">
              ERP & POS
            </span>
          </div>
        </div>

        {/* Center: Search / Keyboard Hotkey hint */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-[#800000]/70 font-semibold bg-[#fdf5f6] border border-[#ebd5da] px-3 py-1.5 rounded-xl">
          <kbd className="px-1.5 py-0.5 bg-white border border-[#ebd5da] rounded text-[10px] font-mono font-bold text-[#800000]">F2</kbd>
          <span>New Sale</span>
          <span className="text-[#ebd5da]">•</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-[#ebd5da] rounded text-[10px] font-mono font-bold text-[#800000]">F9</kbd>
          <span>Pay</span>
          <span className="text-[#ebd5da]">•</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-[#ebd5da] rounded text-[10px] font-mono font-bold text-[#800000]">F10</kbd>
          <span>Drawer</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Cash Drawer Kick */}
          <button
            type="button"
            onClick={handleQuickDrawerKick}
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer text-xs font-black ${
              drawerKicked 
                ? 'bg-emerald-600 text-white border-emerald-600' 
                : 'bg-[#fdf5f6] border-[#ebd5da] text-[#800000] hover:bg-[#fee8eb]'
            }`}
            title="Open Cash Drawer (F10)"
          >
            <Banknote className="w-4 h-4" />
            <span className="hidden sm:inline">Drawer</span>
          </button>

          {/* Hardware & Peripherals Settings */}
          <button
            type="button"
            onClick={() => setIsHardwareModalOpen(true)}
            className="p-2 text-[#800000] hover:bg-[#fdf5f6] border border-[#ebd5da] rounded-xl transition-colors cursor-pointer"
            title="Printer & Hardware Settings"
          >
            <Cpu className="w-4 h-4" />
          </button>

          {isOffline && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#fee8eb] text-[#800000] border border-[#ebd5da]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#800000]"></span>
              Offline
            </span>
          )}

          <button 
            type="button"
            onClick={toggleTheme} 
            className="p-2 text-[#800000] hover:bg-[#fdf5f6] rounded-xl transition-colors cursor-pointer"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="h-6 w-px bg-[#ebd5da] mx-1 hidden sm:block"></div>

          {/* User Profile dropdown */}
          <div className="relative" ref={accountMenu}>
            <button 
              type="button"
              aria-label="Account menu"
              aria-expanded={isAccountMenuOpen}
              aria-controls="account-menu"
              onClick={() => setIsAccountMenuOpen(open => !open)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#fdf5f6] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#800000] text-white flex items-center justify-center font-black text-xs shadow-xs">
                {profile?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-black text-[#800000] leading-tight">
                  {profile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-[10px] text-[#800000]/70 font-semibold leading-none">
                  {profile?.roles?.[0] || 'Cashier'}
                </p>
              </div>
            </button>
            
            {isAccountMenuOpen && <div id="account-menu" className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#ebd5da] py-1 z-50">
              <div className="px-4 py-2 border-b border-[#ebd5da] bg-[#fdf5f6]">
                <p className="text-xs font-black text-[#800000] truncate">{profile?.displayName || 'User'}</p>
                <p className="text-[10px] text-[#800000]/70 truncate font-semibold">{user?.email}</p>
              </div>
              <button 
                type="button"
                onClick={() => { setIsAccountMenuOpen(false); setIsHardwareModalOpen(true); }}
                className="w-full text-left px-4 py-2 text-xs text-[#800000] hover:bg-[#fdf5f6] flex items-center gap-2 font-bold cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-[#800000]" /> Peripherals & Printers
              </button>
              <button 
                type="button"
                onClick={logout} 
                className="w-full text-left px-4 py-2 text-xs text-[#800000] hover:bg-[#fee8eb] flex items-center gap-2 border-t border-[#ebd5da] font-black cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#800000]" /> Sign out
              </button>
            </div>}
          </div>
        </div>
      </header>

      {/* Hardware Settings Modal */}
      {isHardwareModalOpen && (
        <HardwareSettingsModal onClose={() => setIsHardwareModalOpen(false)} />
      )}
    </>
  );
}
