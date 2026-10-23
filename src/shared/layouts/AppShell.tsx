import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { PwaInstallBanner } from '../components/PwaInstallBanner';

export function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isFullScreenRoute = location.pathname.startsWith('/kds') || location.pathname.startsWith('/pos');

  return (
    <div className="h-dvh overflow-hidden bg-[#ffffff] text-[#800000] flex font-sans selection:bg-[#800000] selection:text-white">
      {/* Desktop / Drawer Sidebar */}
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
        {/* PWA In-App Install Prompt Banner */}
        <PwaInstallBanner />

        {/* Global Top App Bar */}
        <TopBar onMenuClick={() => setIsMobileMenuOpen(open => !open)} isMenuOpen={isMobileMenuOpen} />
        
        {/* Navigation occupies its own row so it cannot cover page controls. */}
        <main className={`flex-1 min-h-0 min-w-0 overflow-y-auto bg-[#ffffff] ${isFullScreenRoute ? 'p-1 sm:p-2 md:p-4' : 'p-3 lg:p-6'}`}>
          <div className={`mx-auto h-full min-h-0 ${isFullScreenRoute ? 'max-w-none' : 'max-w-7xl'}`}>
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar (Thumb Zone) */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
