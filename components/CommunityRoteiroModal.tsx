'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSharedRoteirosByDestination, copySharedRoteiroToProfile, getRoteirosByUser, type SharedRoteiro } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import { getOptimizedUrl } from '@/lib/cloudinary'

interface Props {
  destinationId: string
  destinationName: string
  onClose: () => void
}

export default function CommunityRoteiroModal({ destinationId, destinationName, onClose }: Props) {
  const { user } = useAuth()
  const [roteiros, setRoteiros] = useState<SharedRoteiro[]>([])
  const [loading, setLoading] = useState(true)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [alreadyCopiedIds, setAlreadyCopiedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getSharedRoteirosByDestination(destinationId)
      .then(setRoteiros)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [destinationId])

  useEffect(() => {
    if (!user) return
    getRoteirosByUser(user.uid).then((mine) => {
      const ids = new Set(
        mine.filter((r) => r.originalRoteiroId).map((r) => r.originalRoteiroId as string)
      )
      setAlreadyCopiedIds(ids)
    }).catch(() => {})
  }, [user])

  async function handleCopy(r: SharedRoteiro) {
    if (!user) return
    setCopyingId(r.id)
    try {
      await copySharedRoteiroToProfile(r, user.uid, user.displayName || 'Usuário', user.photoURL ?? undefined)
      setAlreadyCopiedIds((prev) => new Set([...prev, r.id]))
      setCopiedId(r.id)
      setTimeout(() => setCopiedId(null), 2500)
    } finally {
      setCopyingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-t-3xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '88vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">🗓️ Roteiros da comunidade</h2>
            <p className="text-xs text-gray-400 mt-0.5">Para {destinationName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 pb-24">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : roteiros.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🗓️</div>
              <p className="font-semibold text-gray-700 mb-1">Nenhum roteiro ainda</p>
              <p className="text-sm text-gray-400">Seja o primeiro a criar e compartilhar um roteiro para {destinationName}!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {roteiros.map((r) => (
                <div key={r.id} className="card p-4">
                  {r.destination.photoUrl && (
                    <div className="h-32 rounded-xl overflow-hidden bg-gray-100 mb-3">
                      <img
                        src={r.destination.photoUrl.startsWith('/api/photo') ? r.destination.photoUrl : getOptimizedUrl(r.destination.photoUrl, 640)}
                        alt={r.destination.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 leading-tight">{r.name}</h3>
                    {r.copyCount ? (
                      <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                        📋 {r.copyCount}x copiado
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 mb-2">
                    {r.authorPhotoUrl ? (
                      <img src={r.authorPhotoUrl} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center text-[9px] text-orange-600 font-bold flex-shrink-0">
                        {r.authorName?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                    <p className="text-xs text-gray-500 truncate">{r.authorName || 'Anônimo'}</p>
                  </div>

                  {(r.averageRating || 0) > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} className={`text-sm ${s <= Math.round(r.averageRating!) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                      <span className="text-xs text-gray-500 ml-1">{r.averageRating!.toFixed(1)} ({r.reviewCount})</span>
                    </div>
                  )}

                  {(r.events.length > 0 || r.eats.length > 0 || r.stays.length > 0) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {r.events.length > 0 && (
                        <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-medium">
                          🎭 {r.events.length} evento{r.events.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {r.eats.length > 0 && (
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-medium">
                          🍽️ {r.eats.length} restaurante{r.eats.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {r.stays.length > 0 && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                          🏡 {r.stays.length} hospedagem{r.stays.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href={`/ver/${r.id}`}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-center border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Ver detalhes →
                    </Link>
                    <button
                      onClick={() => handleCopy(r)}
                      disabled={copyingId === r.id || r.authorId === user?.uid || alreadyCopiedIds.has(r.id)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                        r.authorId === user?.uid || alreadyCopiedIds.has(r.id)
                          ? 'bg-gray-100 text-gray-400 cursor-default'
                          : copiedId === r.id
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {r.authorId === user?.uid
                        ? 'Seu roteiro'
                        : alreadyCopiedIds.has(r.id)
                        ? '✓ Copiado'
                        : copiedId === r.id
                        ? '✓ Copiado!'
                        : copyingId === r.id
                        ? '...'
                        : '📋 Copiar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
