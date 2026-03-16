import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, ShoppingCart, TrendingUp, Package,
  Users, UserCheck, Wallet, Warehouse, Wheat, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const links = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/purchases',  label: 'Purchases',  icon: ShoppingCart },
  { to: '/sales',      label: 'Sales',      icon: TrendingUp },
  { to: '/inventory',  label: 'Inventory',  icon: Package },
  { to: '/suppliers',  label: 'Suppliers',  icon: UserCheck },
  { to: '/buyers',     label: 'Buyers',     icon: Users },
  { to: '/payments',   label: 'Payments',   icon: Wallet },
  { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
  { to: '/grains',     label: 'Grains',     icon: Wheat },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-6 border-b border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-earth-500/20 border border-earth-600/30 flex items-center justify-center">
            <Wheat size={18} className="text-earth-400" />
          </div>
          <div>
            <div className="font-display font-semibold text-earth-100 leading-tight">GrainBiz</div>
            <div className="text-xs text-grain-500">Trading Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setOpen(false)}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-dark-600">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-grain-700 flex items-center justify-center text-xs font-semibold text-grain-200">
            {user?.full_name?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-earth-200 truncate">{user?.full_name}</div>
            <div className="text-xs text-grain-500 capitalize">{user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-link w-full">
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-dark-800 border border-dark-600 flex items-center justify-center text-grain-400"
      >
        {open ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-dark-900/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed left-0 top-0 bottom-0 z-40 w-64 bg-dark-800 border-r border-dark-600
        transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-dark-800 border-r border-dark-600 fixed inset-y-0 left-0">
        <SidebarContent />
      </aside>
    </>
  )
}
