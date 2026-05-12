'use client'

import Link from 'next/link'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ color: '#FF6B35' }}>
          <span>🗺️</span>
          <span>Rolê</span>
        </Link>
        <Link href="/perfil" className="text-gray-500 text-sm hover:text-gray-800">
          Entrar
        </Link>
      </div>
    </header>
  )
}
