import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  UtensilsCrossed, 
  ChefHat, 
  LayoutDashboard, 
  Boxes
} from 'lucide-react';
import { usePosStore } from '../../features/pos/store/posStore';

export function MobileBottomNav() {
  const location = useLocation();
  const cart = usePosStore(state => state.cart);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { to: '/pos', label: 'POS', icon: ShoppingCart, badge: cartItemCount > 0 ? cartItemCount : undefined },
    { to: '/tables', label: 'Tables', icon: UtensilsCrossed },
    { to: '/kds', label: 'Kitchen', icon: ChefHat },
    { to: '/inventory', label: 'Stock', icon: Boxes },
    { to: '/', label: 'Overview', icon: LayoutDashboard },
  ];

  return (
    <nav aria-label="Quick navigation" className="relative shrink-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#ebd5da] lg:hidden shadow-lg pb-safe">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all relative cursor-pointer ${
                isActive 
                  ? 'text-[#800000]' 
                  : 'text-[#800000]/60 hover:text-[#800000]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-[#800000] text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-xs animate-in zoom-in-50 duration-200">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-1 font-black ${isActive ? 'text-[#800000]' : 'text-[#800000]/70'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-6 h-1 rounded-full bg-[#800000]"></div>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
