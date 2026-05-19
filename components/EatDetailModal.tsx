'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import RouteModal from './RouteModal'
import { getEatById, getEatReviews } from '@/lib/firestore'
import { getOptimizedUrl } from '@/lib/cloudinary'
import type { Eat, EatReview } from '@/types'
import { EAT_CATEGORY_LABELS } from '@/types'

interface Props {
  eatId: string
  onClose: () => void
  zIndex?: number
}

export default function EatDetailModal({ eatId, onClose, zIndex = 120 }: Props) {
  const [eat, setEat] = useState<Eat | null>(null)
  const [reviews, setReviews] = useState<EatReview[]>([])
  const [loading, setLoading] = useState(true)
  const [showRoute, setShowRoute] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    Promise.all([getEatById(eatId), getEatReviews(eatId)]).then(([e, revs]) => {
      setEat(e)
      setReviews(revs)
      setLoading(false)
    })
  }, [eatId])

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const label = eat ? (EAT_CATEGORY_LABELS[eat.category] || eat.category) : ''
  const mapsUrl = eat?.mapsLink || (eat?.lat ? `https://www.google.com/maps?q=${eat.lat},${eat.lng}` : '')

  return (
    <div className="fixed inset-0 flex flex-col bg-black/60" style={{ zIndex }} onClick={onClose}>

      {showRoute && eat?.lat && eat?.lng && (
        <RouteModal
          destLat={eat.lat}
          destLng={eat.lng}
          destName={eat.name}
          mapsUrl={mapsUrl}
          onClose={() => setShowRoute(false)}
          zIndex={zIndex + 10}
        />
      )}

      <div
        className="bg-white flex flex-col mt-16 rounded-t-3xl overflow-hidden flex-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">🍽️ {label}</span>
            <p className="font-bold text-gray-900 text-base truncate">
              {loading ? '...' : (eat?.name || 'Detalhes')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors ml-2"
          >✕</button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              <div className="skeleton h-48 w-full rounded-xl" />
              <div className="skeleton h-6 w-2/3" />
              <div className="skeleton h-16 w-full rounded-xl" />
            </div>
          ) : !eat ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">😕</div>
              <p>Não foi possível carregar.</p>
            </div>
          ) : (
            <div className="flex flex-col">

              {/* Foto */}
              {eat.photoUrl ? (
                <div className="relative h-52 bg-gray-100 flex-shrink-0">
                  <Image src={getOptimizedUrl(eat.photoUrl, 800)} alt={eat.name} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="h-28 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-5xl flex-shrink-0">🍽️</div>
              )}

              <div className="px-4 py-4 flex flex-col gap-4">

                {/* Nome + rating */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{eat.name}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {avgRating && (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-sm">★</span>
                        <span className="text-sm font-semibold text-gray-700">{avgRating}</span>
                        <span className="text-xs text-gray-400">({reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''})</span>
                      </div>
                    )}
                    <span className="text-sm font-bold text-gray-500">{eat.priceRange}</span>
                  </div>
                </div>

                {/* Card de detalhes */}
                <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">📍</span>
                    {eat.mapsLink ? (
                      <a href={eat.mapsLink} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors">
                        {eat.city}, {eat.state}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-gray-800">{eat.city}, {eat.state}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">💰</span>
                    <p className="text-sm text-gray-700">Faixa de preço: <span className="font-bold">{eat.priceRange}</span></p>
                  </div>
                  {eat.socialLink && (
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📱</span>
                      <a href={eat.socialLink} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-orange-600 hover:underline truncate">
                        Ver nas redes sociais
                      </a>
                    </div>
                  )}
                </div>

                {eat.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{eat.description}</p>
                )}

                {/* Ações */}
                <div className="flex flex-col gap-2">
                  {(eat.mapsLink || (eat.lat && eat.lng)) && (
                    <button
                      onClick={() => setShowRoute(true)}
                      className="w-full py-3 rounded-xl font-bold text-sm text-center border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      🗺️ Como chegar
                    </button>
                  )}
                </div>

                {/* Avaliações — leitura apenas */}
                <div className="pt-1 pb-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">
                    Avaliações {reviews.length > 0 && <span className="text-gray-400 font-normal">({reviews.length})</span>}
                  </h3>
                  {reviews.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhuma avaliação ainda.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {reviews.map((r) => (
                        <div key={r.id} className="bg-gray-50 rounded-2xl p-3 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            {r.userPhoto ? (
                              <img src={r.userPhoto} alt={r.userName} className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                                {r.userName[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{r.userName}</p>
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <span key={i} className={`text-xs ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap text-xs">
                            {r.foodQuality && (
                              <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                                {r.foodQuality === 'otima' ? '😋 Comida excelente' : r.foodQuality === 'boa' ? '🙂 Comida boa' : '😕 Comida ruim'}
                              </span>
                            )}
                            <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                              {r.crowded === 'tranquilo' ? '😌 Tranquilo' : r.crowded === 'moderado' ? '🙂 Moderado' : '🏃 Lotado'}
                            </span>
                            {r.priceRange && (
                              <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                                {r.priceRange} {r.priceRange === '💲' ? 'Econômico' : r.priceRange === '💲💲' ? 'Moderado' : 'Premium'}
                              </span>
                            )}
                          </div>
                          {r.text && <p className="text-xs text-gray-700 leading-relaxed">{r.text}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
