import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, ChefHat, Package, Users, Settings, 
  CreditCard, CalendarClock, Truck, Sparkles, FileBarChart, Armchair, Factory,
  Globe, Monitor, QrCode, UtensilsCrossed, X
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { hasRole, profile } = useAuth();

  const navigation = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard, roles: ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'INVENTORY', 'HR', 'ACCOUNTANT'] },
    { name: 'POS', to: '/pos', icon: ShoppingCart, roles: ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'Menu', to: '/menu', icon: UtensilsCrossed, roles: ['OWNER', 'ADMIN', 'MANAGER'] },
    { name: 'Kitchen', to: '/kds', icon: ChefHat, roles: ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN'] },
    { name: 'Tables', to: '/tables', icon: Armchair, roles: ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'Inventory', to: '/inventory', icon: Package, roles: ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY'] },
    { name: 'Manufacturing', to: '/manufacturing', icon: Factory, roles: ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY', 'KITCHEN'] },
    { name: 'Purchasing', to: '/purchasing', icon: Truck, roles: ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY'] },
    { name: 'CRM & Loyalty', to: '/crm', icon: Users, roles: ['OWNER', 'ADMIN', 'MANAGER'] },
    { name: 'Finance', to: '/finance', icon: CreditCard, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT'] },
    { name: 'HR & Payroll', to: '/hr', icon: CalendarClock, roles: ['OWNER', 'ADMIN', 'HR', 'MANAGER'] },
    { name: 'Reports & Analytics', to: '/reports', icon: FileBarChart, roles: ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'] },
    { name: 'Omnichannel & Delivery', to: '/integrations', icon: Globe, roles: ['OWNER', 'ADMIN', 'MANAGER'] },
    { name: 'AI Assistant', to: '/ai', icon: Sparkles, roles: ['OWNER', 'ADMIN'] },
    { name: 'Settings', to: '/settings', icon: Settings, roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  ];

  // If no roles are set, default to show all for demo purposes, or filter strictly
  const userRoles = profile?.roles || []; // Never treat a missing staff profile as owner

  const filteredNav = navigation.filter(item => 
    item.roles.some(role => userRoles.includes(role))
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#42000c]/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside id="app-sidebar" aria-label="Main navigation" className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#ebd5da]
        transform transition-transform duration-300 ease-in-out flex flex-col
        lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-[#ebd5da]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#800000] rounded-lg flex items-center justify-center shadow-xs">
              <span className="text-white font-bold text-xl leading-none">T</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#800000]">TalkOS</span>
              <span className="text-[10px] font-semibold tracking-widest text-[#800000]/70 uppercase -mt-1">Enterprise</span>
            </div>
          </div>
          <button type="button" aria-label="Close menu" onClick={() => setIsOpen(false)} className="lg:hidden p-2 -mr-2 rounded-lg hover:bg-[#fdf5f6]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-150 ${
                  isActive 
                    ? 'bg-[#800000] text-white shadow-xs' 
                    : 'text-[#800000] hover:bg-[#fdf5f6] hover:text-[#800000]'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[#ebd5da] space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <a
              href="/kiosk"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#fdf5f6] hover:bg-[#ebd5da] text-[#800000] text-[11px] font-bold transition-colors"
              title="Launch Customer Kiosk Terminal"
            >
              <Monitor className="w-3.5 h-3.5" /> Kiosk
            </a>
            <a
              href="/order?table=T1"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#fdf5f6] hover:bg-[#ebd5da] text-[#800000] text-[11px] font-bold transition-colors"
              title="Launch Table QR Ordering"
            >
              <QrCode className="w-3.5 h-3.5" /> Table QR
            </a>
          </div>

          <div className="bg-[#fdf5f6] border border-[#ebd5da] rounded-xl p-3">
            <h4 className="text-[11px] font-bold text-[#800000]/80 uppercase tracking-wider mb-0.5">Branch</h4>
            <p className="text-sm font-bold text-[#800000] truncate">Talk of the Town · Imphal</p>
            <p className="text-xs text-[#800000]/70">Terminal not configured</p>
          </div>
        </div>
      </aside>
    </>
  );
}
