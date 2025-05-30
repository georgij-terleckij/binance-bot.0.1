import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/archive', label: 'Archive' }
]

export default function Navbar() {
  const location = useLocation()

  return (
    <nav className="bg-gray-900 border-b border-gray-700 px-4 py-3 mb-4 flex gap-4">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`text-sm font-semibold ${
            location.pathname === item.to
              ? 'text-white underline'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
