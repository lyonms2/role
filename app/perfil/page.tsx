'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { getReviewsByUser, getTipsByUser } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import { getRoteirosByUser, deleteRoteiro, type SavedRoteiro } from '@/lib/firestore'
import type { Review, Tip } from '@/types'

export default function PerfilPage() {
  const { user, loading } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [tips, setTips] = useState<Tip[]>([])
  const [roteiros, setRoteiros] = useState<SavedRoteiro[]>([])
  const [tab, setTab] = useState<'reviews' | 'tips' | 'roteiros'>('reviews')

  useEffect(() => {
    if (!user) { setReviews([]); setTips([]); return }
    Promise.all([
      getReviewsByUser(user.uid),
      getTipsByUser(user.uid),
      getRoteirosByUser(user.uid),
    ]).then(([revs, tps, rots]) => {
      setReviews(revs)
      setTips(tps)
      setRoteiros(rots)
    })
  }, [user])

  async function handleLogout() {
    await signOut(auth)
    setReviews([])
    setTips([])
  }

  if (loading || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="skeleton h-20 w-20 rounded-full mx-auto mb-4" />
        <div className="skeleton h-6 w-40 mx-auto mb-2" />
        <div className="skeleton h-4 w-32 mx-auto" />
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
        {([
          { id: 'roteiros', icon: '🗓️', label: 'Roteiros', count: roteiros.length },
          { id: 'reviews', icon: '⭐', label: 'Reviews', count: reviews.length },
          { id: 'tips', icon: '💡', label: 'Dicas', count: tips.length },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            {t.icon} {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === 'roteiros' && (
        <div className="flex flex-col gap-4">
          {roteiros.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">🗓️</div>
              <p className="font-semibold text-gray-700">Nenhum roteiro salvo ainda</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Escolha um destino e monte seu primeiro rolê completo!</p>
              <a href="/" className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">
                Descobrir destinos →
              </a>
            </div>
          ) : roteiros.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{r.name}</h3>
                  <p className="text-sm text-gray-500">{r.destination.city}, {r.destination.state}</p>
                </div>
                <button
                  onClick={async () => {
                    await deleteRoteiro(r.id)
                    setRoteiros((prev) => prev.filter((x) => x.id !== r.id))
                  }}
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                >
                  🗑️
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="bg-orange-50 text-orange-600 text-xs px-2 py-1 rounded-full font-medium">📍 {r.destination.name}</span>
                {r.events.length > 0 && <span className="bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded-full font-medium">🎭 {r.events.length} evento{r.events.length !== 1 ? 's' : ''}</span>}
                {r.eats.length > 0 && <span className="bg-orange-50 text-orange-600 text-xs px-2 py-1 rounded-full font-medium">🍽️ {r.eats.length} lugar{r.eats.length !== 1 ? 'es' : ''}</span>}
                {r.stays.length > 0 && <span className="bg-green-50 text-green-600 text-xs px-2 py-1 rounded-full font-medium">🏡 {r.stays.length} hospedagem{r.stays.length !== 1 ? 's' : ''}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

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
