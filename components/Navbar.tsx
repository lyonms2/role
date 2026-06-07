'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getUserNotifications } from '@/lib/firestore'

export default function Navbar() {
  const { user, loading } = useAuth()
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    getUserNotifications(user.uid).then((notifs) => {
      setUnreadCount(notifs.filter((n) => !n.read).length)
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (isIOS) { setShowIOSHint(true); return }
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

  const showButton = !installed && (installPrompt || isIOS)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" onClick={() => sessionStorage.removeItem('letsapp_search')}>
          <Image src="/logo1200x630.png" alt="LetsApp" width={160} height={56} className="h-10 w-auto object-contain" priority />
        </Link>

        <div className="flex items-center gap-2">
          {showButton && (
            <button
              onClick={handleInstall}
              title="Instalar app"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors text-base"
            >
              ⬇️
            </button>
          )}
          <Link
            href="/manual"
            title="Manual do usuário"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600 transition-colors text-sm font-bold"
          >
            ?
          </Link>
          <Link href="/perfil" className="relative">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          ) : user ? (
            <div className="relative">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'Perfil'}
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-orange-400 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-orange-100 border-2 border-orange-400 flex items-center justify-center text-orange-600 font-bold text-sm">
                  {user.displayName?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold text-gray-500 hover:text-orange-500 transition-colors">
              Entrar
            </span>
          )}
          </Link>
        </div>
      </div>

      {/* Instrução iOS */}
      {showIOSHint && (
        <div className="bg-orange-50 border-t border-orange-200 px-4 py-3 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">📲</span>
          <div className="flex-1 text-xs text-gray-700 leading-relaxed">
            Toque em <strong>Compartilhar</strong> <span className="text-base">⬆️</span> no Safari e depois em <strong>"Adicionar à Tela de Início"</strong> para instalar o app.
          </div>
          <button onClick={() => setShowIOSHint(false)} className="text-gray-400 text-lg leading-none flex-shrink-0">×</button>
        </div>
      )}
    </header>
  )
}
