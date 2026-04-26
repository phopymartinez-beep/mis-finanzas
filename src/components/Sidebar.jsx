import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, PiggyBank, BarChart3, DollarSign } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transacciones' },
  { to: '/budget', icon: PiggyBank, label: 'Presupuesto' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <DollarSign className="text-primary-600" size={24} />
        <span className="text-lg font-bold text-gray-900">Mis Finanzas</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-gray-100 text-xs text-gray-400">
        v0.1.0
      </div>
    </aside>
  )
}
