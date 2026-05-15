'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup, signOut } from 'firebase/auth'
import { getReviewsByUser, getTipsByUser } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import type { Review, Tip } from '@/types'

export default function PerfilPage() {
  const { user, loading } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [tips, setTips] = useState<Tip[]>([])
  const [tab, setTab] = useState<'reviews' | 'tips'>('reviews')

  useEffect(() => {
    if (!user) { setReviews([]); setTips([]); return }
    Promise.all([getReviewsByUser(user.uid), getTipsByUser(user.uid)]).then(([revs, tps]) => {
      setReviews(revs)
      setTips(tps)
    })
  }, [user])

  async function handleLogin() {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch {}
  }

  async function handleLogout() {
    await signOut(auth)
    setReviews([])
    setTips([])
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="skeleton h-20 w-20 rounded-full mx-auto mb-4" />
        <div className="skeleton h-6 w-40 mx-auto mb-2" />
        <div className="skeleton h-4 w-32 mx-auto" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-orange-50 border-4 border-orange-200 flex items-center justify-center text-5xl mb-6">
          🗺️
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Oi, explorador(a)! 👋</h1>
        <p className="text-gray-500 mb-8 max-w-xs">
          Entre pra salvar seus roteiros, deixar reviews verificadas e mostrar pra galera que você foi lá de verdade.
        </p>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-gray-700 bg-white border-2 border-gray-200 hover:border-orange-400 hover:shadow-md transition-all"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 10-.2 13.4-5.2l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4-4.2 5.3l6.2 5.2C37 36.1 44 31 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          Continuar com Google
        </button>

        <div className="mt-8 grid grid-cols-3 gap-4 w-full">
          {[
            { icon: '✅', text: 'Reviews verificadas por GPS' },
            { icon: '🗓️', text: 'Roteiros salvos na nuvem' },
            { icon: '🏅', text: 'Conquistas de explorador' },
          ].map((f) => (
            <div key={f.text} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <div className="text-2xl mb-1">{f.icon}</div>
              <p className="text-xs text-gray-500 leading-tight">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const verifiedCount = reviews.filter((r) => r.verified).length
  const isExplorer = verifiedCount >= 5

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Cabeçalho do perfil */}
      <div className="card p-5 flex items-center gap-4 mb-5">
        {user.photoURL ? (
          <Image src={user.photoURL} alt={user.displayName || ''} width={60} height={60} className="rounded-full" />
        ) : (
          <div className="w-15 h-15 rounded-full bg-orange-100 flex items-center justify-center text-2xl">👤</div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 truncate">{user.displayName}</h2>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          {isExplorer && (
            <span className="inline-flex items-center gap-1 mt-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              🏅 Explorador verificado
            </span>
          )}
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-500">Sair</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Rolês', value: reviews.length },
          { label: 'Verificadas', value: verifiedCount },
          { label: 'Dicas', value: tips.length },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <div className="text-2xl font-bold" style={{ color: '#FF6B35' }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {reviews.length > 0 && (
        <p className="text-center text-sm text-gray-500 mb-4 font-medium">
          Você já deu <span style={{ color: '#FF6B35' }} className="font-bold">{reviews.length} rolê{reviews.length !== 1 ? 's' : ''}</span>! 🗺️
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-4 border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setTab('reviews')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'reviews' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          ⭐ Reviews ({reviews.length})
        </button>
        <button onClick={() => setTab('tips')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'tips' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          💡 Dicas ({tips.length})
        </button>
      </div>

      {tab === 'reviews' && (
        <div className="flex flex-col gap-3">
          {reviews.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Nenhum rolê avaliado ainda. Que tal explorar? 🗺️</p>
          ) : reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <span key={i} className={`text-sm ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                {r.verified && <span className="text-xs text-green-600 font-semibold">✅ Verificado</span>}
              </div>
              {r.text && <p className="text-sm text-gray-700 mt-1">{r.text}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'tips' && (
        <div className="flex flex-col gap-3">
          {tips.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Nenhuma dica ainda. A galera tá esperando a sua! 💡</p>
          ) : tips.map((t) => (
            <div key={t.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-sm text-gray-800">💡 {t.text}</p>
              <p className="text-xs text-gray-400 mt-1">❤️ {t.likes} curtidas</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
