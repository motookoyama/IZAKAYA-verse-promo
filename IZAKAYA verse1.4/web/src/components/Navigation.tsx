import { Link, useLocation } from 'react-router-dom'
import { Home, Play, Library, Ticket, Key } from 'lucide-react'

const Navigation = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/play', label: 'Play', icon: Play },
    { path: '/library', label: 'Library', icon: Library },
    { path: '/tickets', label: 'Tickets', icon: Ticket },
    { path: '/redeem', label: 'Redeem', icon: Key },
  ]

  return (
    <nav className="glass-card m-4 p-4">
      <div className="flex justify-center space-x-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white bg-opacity-20 text-white'
                  : 'text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <Icon size={20} />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default Navigation
