'use client'

import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-4xl animate-pulse">
            🗺️
          </div>
          <div className="w-24 h-2 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-3xl bg-orange-50 border-4 border-orange-200 flex items-center justify-center text-5xl mb-6 shadow-sm">
            🗺️
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Rolê</h1>
          <p className="text-gray-400 text-sm mb-8">Descobre o que tem pertinho de você</p>

          <div className="w-full bg-gray-50 rounded-2xl p-5 mb-6 text-left space-y-3">
            {[
              { icon: '📍', text: 'Destinos incríveis de bate-volta' },
              { icon: '✅', text: 'Reviews verificadas por GPS' },
              { icon: '🗓️', text: 'Monte e salve seus roteiros' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm text-gray-600 font-medium">{f.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => signInWithPopup(auth, googleProvider).catch(() => {})}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-gray-700 bg-white border-2 border-gray-200 hover:border-orange-400 hover:shadow-md transition-all"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-.2 13.4-5.2l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4-4.2 5.3l6.2 5.2C37 36.1 44 31 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
            Entrar com Google
          </button>

          <p className="text-xs text-gray-400 mt-4">
            Sem cadastro. Sem senha. Só você e o rolê. 🤙
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
