'use client'

import Link from 'next/link'

export default function GuestBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 shadow-xl text-white">
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">Crie sua conta grátis</p>
        <p className="text-xs leading-tight opacity-90">Salve lugares, avalie e monte roteiros</p>
      </div>
      <Link
        href="/entrar"
        className="flex-shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-orange-500 whitespace-nowrap"
      >
        Entrar →
      </Link>
    </div>
  )
}
