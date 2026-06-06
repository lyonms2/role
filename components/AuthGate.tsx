'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const [loginError, setLoginError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  // Captura o resultado após signInWithRedirect (modo PWA standalone)
  useEffect(() => {
    getRedirectResult(auth).catch((e: { code?: string }) => {
      if (e?.code && e.code !== 'auth/cancelled-popup-request') {
        setLoginError('Falha ao entrar. Tente novamente.')
      }
    })
  }, [])

  if (pathname?.startsWith('/ver/')) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Image src="/og-rastrear.png" alt="LetsApp" width={220} height={116} className="logo-breathe" priority />
          <div className="w-24 h-2 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    )
  }

  if (!user) {
    const handleSignIn = async () => {
      setLoginError('')
      setSigningIn(true)
      try {
        // Em modo PWA standalone, signInWithPopup é bloqueado pelo WebKit (iOS).
        // Usar redirect garante que o login funcione quando instalado na tela inicial.
        const isStandalone =
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as { standalone?: boolean }).standalone === true

        if (isStandalone) {
          await signInWithRedirect(auth, googleProvider)
          // página navega para o Google — código abaixo não executa
        } else {
          await signInWithPopup(auth, googleProvider)
        }
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code
        // Ignorar cancelamento voluntário do popup (usuário fechou)
        if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
          setLoginError('Falha ao entrar. Tente novamente.')
        }
      } finally {
        setSigningIn(false)
      }
    }

    return (
      <div className="min-h-screen flex flex-col bg-white">
        {/* Topo com logo */}
        <div className="flex flex-col items-center justify-center pt-16 pb-10 px-6 bg-white">
          <Image src="/og-rastrear.png" alt="LetsApp" width={240} height={126} className="drop-shadow-sm" priority />
          <p className="text-gray-400 text-sm font-medium mt-3 tracking-wide">
            Descubra o que tem pertinho de você
          </p>
        </div>

        {/* Card branco com features e botão */}
        <div className="flex-1 flex flex-col items-center px-6 -mt-5">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 flex flex-col gap-5">

            <div className="space-y-3">
              {[
                { icon: '🏖️', label: 'Destinos', text: 'Praias, cachoeiras, trilhas e mais perto de você', color: 'bg-orange-50' },
                { icon: '✅', label: 'Avaliações', text: 'Reviews confirmadas por presença via GPS', color: 'bg-green-50' },
                { icon: '🗓️', label: 'Roteiros', text: 'Monte, salve e compartilhe seus roteiros', color: 'bg-blue-50' },
              ].map((f) => (
                <div key={f.label} className={`flex items-center gap-4 ${f.color} rounded-2xl px-4 py-3`}>
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{f.label}</p>
                    <p className="text-sm text-gray-700 leading-tight">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-gray-700 bg-white border-2 border-gray-200 hover:border-orange-400 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {signingIn ? (
                <span className="w-5 h-5 border-2 border-gray-300 border-t-orange-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 10-.2 13.4-5.2l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4-4.2 5.3l6.2 5.2C37 36.1 44 31 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                </svg>
              )}
              {signingIn ? 'Entrando...' : 'Entrar com Google'}
            </button>

            {loginError && (
              <p className="text-sm text-red-500 text-center">{loginError}</p>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-5 pb-8 text-center">
            Sem cadastro. Sem senha. Só você e a aventura. 🧭
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
