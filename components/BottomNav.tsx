'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const EXPLORAR_ROUTES = ['/explorar', '/eventos', '/comer', '/hospedar', '/veiculos']

const items = [
  { href: '/', icon: '🗺️', label: 'Descobrir', exact: true },
  { href: '/explorar', icon: '✨', label: 'Explorar', exact: false },
  { href: '/sugerir', icon: '➕', label: 'Sugerir', exact: true },
  { href: '/perfil', icon: '👤', label: 'Perfil', exact: true },
]

export default function BottomNav() {
  const pathname = usePathname()

  function isActive(item: typeof items[0]) {
    if (item.href === '/explorar') return EXPLORAR_ROUTES.some((r) => pathname.startsWith(r))
    return item.exact ? pathname === item.href : pathname.startsWith(item.href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-bottom">
      <div className="max-w-2xl mx-auto flex">
        {items.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium transition-colors ${
                active ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
