'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'

export default function Navbar() {
  const { user, loading } = useAuth()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ color: '#FF6B35' }}>
          <span>🗺️</span>
          <span>Rolê</span>
        </Link>

        <Link href="/perfil">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'Perfil'}
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-orange-400"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-orange-100 border-2 border-orange-400 flex items-center justify-center text-orange-600 font-bold text-sm">
                  {user.displayName?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold text-gray-500 hover:text-orange-500 transition-colors">
              Entrar
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
