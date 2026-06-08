'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import RouteModal from './RouteModal'
import Lightbox from './Lightbox'
import WriteEatReviewModal from './WriteEatReviewModal'
import { getEatById, getEatReviews, reportReview, hasUserReportedReview } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import { getOptimizedUrl } from '@/lib/cloudinary'
import YouTubeEmbed from './YouTubeEmbed'
import type { Eat, EatReview } from '@/types'
import { EAT_CATEGORY_LABELS } from '@/types'

interface Props {
  eatId: string
  onClose: () => void
  zIndex?: number
}

export default function EatDetailModal({ eatId, onClose, zIndex = 120 }: Props) {
  const { user } = useAuth()
  const [eat, setEat] = useState<Eat | null>(null)
  const [reviews, setReviews] = useState<EatReview[]>([])
  const [loading, setLoading] = useState(true)
  const [showRoute, setShowRoute] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [durationMin, setDurationMin] = useState<number | null>(null)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    Promise.all([getEatById(eatId), getEatReviews(eatId)]).then(([e, revs]) => {
      setEat(e)
      setReviews(revs)
      setLoading(false)
      if (e?.lat && e?.lng) {
        navigator.geolocation?.getCurrentPosition(async (pos) => {
          try {
            const res = await fetch(`/api/distance?origin=${pos.coords.latitude},${pos.coords.longitude}&destinations=${e.lat},${e.lng}`)
            const data = await res.json()
            if (data.results?.[0]?.durationMin) setDurationMin(data.results[0].durationMin)
          } catch {}
        }, () => {}, { timeout: 10000, enableHighAccuracy: false })
      }
    })
  }, [eatId])

  const allPhotos = eat
    ? Array.from(new Set([eat.photoUrl, ...(eat.photos || [])].filter(Boolean))) as string[]
    : []

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const label = eat ? (EAT_CATEGORY_LABELS[eat.category] || eat.category) : ''
  const mapsUrl = eat?.mapsLink || (eat?.lat ? `https://www.google.com/maps?q=${eat.lat},${eat.lng}` : '')

  return (
    <div className="fixed inset-0 flex flex-col bg-black/60" style={{ zIndex }} onClick={onClose}>

      {lightboxIdx !== null && allPhotos.length > 0 && (
        <Lightbox
          photos={allPhotos}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      {showRoute && eat?.lat && eat?.lng && (
        <RouteModal destLat={eat.lat} destLng={eat.lng} destName={eat.name} mapsUrl={mapsUrl} onClose={() => setShowRoute(false)} zIndex={zIndex + 10} />
      )}

      {showReview && eat && (
        <WriteEatReviewModal
          eatId={eatId}
          eatName={eat.name}
          onClose={() => setShowReview(false)}
          onSubmitted={() => {
            setShowReview(false)
            getEatReviews(eatId).then(setReviews)
          }}
          zIndex={zIndex + 10}
        />
      )}

      <div className="bg-white flex flex-col mt-16 rounded-t-3xl overflow-hidden flex-1 max-w-2xl mx-auto w-full" onClick={(e) => e.stopPropagation()}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">{label}</span>
            <p className="font-bold text-gray-900 text-base truncate">{loading ? '...' : (eat?.name || 'Detalhes')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors ml-2">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              <div className="skeleton h-52 w-full rounded-xl" />
              <div className="skeleton h-6 w-2/3" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-16 w-full rounded-xl" />
            </div>
          ) : !eat ? (
            <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-2">😕</div><p>Não foi possível carregar.</p></div>
          ) : (
            <div className="flex flex-col">

              {/* Galeria */}
              {allPhotos.length > 0 && (
                <div className="relative h-52 bg-gray-100 flex-shrink-0">
                  <Image key={activePhoto} src={getOptimizedUrl(allPhotos[activePhoto], 800)} alt={eat.name} fill className="object-cover" unoptimized />
                  <button onClick={() => setLightboxIdx(activePhoto)}
                    className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white text-sm font-bold">⛶</button>
                  {allPhotos.length > 1 && (
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {allPhotos.slice(0, 6).map((url, i) => (
                        <button key={i} onClick={() => setActivePhoto(i)}
                          className={`w-6 h-6 rounded-md overflow-hidden border-2 transition-all ${activePhoto === i ? 'border-white scale-110' : 'border-white/40 opacity-70'}`}>
                          <Image src={getOptimizedUrl(url, 48)} alt="" width={24} height={24} className="object-cover w-full h-full" unoptimized />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {allPhotos.length === 0 && (
                <div className="h-28 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-5xl flex-shrink-0">🍽️</div>
              )}

              <div className="px-4 py-4 flex flex-col gap-4">

                {/* Título + rating */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{eat.name}</h2>
                  <p className="text-gray-500 text-sm">{eat.city}, {eat.state}</p>
                  {avgRating ? (
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={`text-sm ${i <= Math.round(Number(avgRating)) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                      <span className="text-sm text-gray-500 ml-1">{avgRating} ({reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''})</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Sem avaliações ainda</p>
                  )}
                </div>

                {/* Descrição */}
                {eat.description && (
                  <p className="text-gray-700 text-sm leading-relaxed">{eat.description}</p>
                )}

                {/* Informações */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>💰</span>
                    <span>Faixa de preço: <span className="font-bold text-gray-800">{eat.priceRange}</span>
                      <span className="text-gray-400 ml-1">{eat.priceRange === '💲' ? '— Econômico' : eat.priceRange === '💲💲' ? '— Moderado' : '— Premium'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>📍</span>
                    <span>{eat.city}, {eat.state}{durationMin != null ? ` · ~${durationMin >= 60 ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? `${durationMin % 60}min` : ''}` : `${durationMin}min`}` : ''}</span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-2">
                  {eat.socialLink && (
                    <a href={eat.socialLink} target="_blank" rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl font-bold text-sm text-center border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                      📱 Ver nas redes sociais
                    </a>
                  )}
                  {(eat.mapsLink || (eat.lat && eat.lng)) && (
                    <button onClick={() => setShowRoute(true)}
                      className="w-full py-3 rounded-xl font-bold text-white text-sm"
                      style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #f97316 100%)' }}>
                      📍 Como chegar{durationMin != null ? ` (~${durationMin >= 60 ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? `${durationMin % 60}min` : ''}` : `${durationMin}min`})` : ''}
                    </button>
                  )}
                </div>

                {/* Avaliações da comunidade */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-gray-900">Avaliações ⭐</h3>
                    {user && (
                      <button
                        onClick={() => setShowReview(true)}
                        className="text-xs font-bold text-orange-500 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        + Avaliar
                      </button>
                    )}
                  </div>
                  {reviews.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhuma avaliação ainda.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {reviews.map((r) => (
                        <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            {r.userPhoto ? (
                              <img src={r.userPhoto} alt={r.userName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs flex-shrink-0">
                                {r.userName[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800">{r.userName}</p>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <span key={i} className={`text-xs ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                ))}
                                <span className="text-xs text-gray-400 ml-1">
                                  {r.createdAt?.toDate?.().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>
                            {user && user.uid !== r.userId && (
                              reportedIds.has(r.id) ? (
                                <span className="text-[10px] text-gray-400 flex-shrink-0">🚩 Denunciado</span>
                              ) : reportingId === r.id ? (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={async () => {
                                      const already = await hasUserReportedReview(user.uid, r.id)
                                      if (!already) await reportReview({ reviewId: r.id, reviewType: 'eat', eatId: eatId, reviewUserId: r.userId, reviewUserName: r.userName, reviewText: r.text, reviewRating: r.rating, placeName: eat?.name, reportedBy: user.uid, reportedByName: user.displayName ?? 'Anônimo' })
                                      setReportedIds((s) => new Set(s).add(r.id))
                                      setReportingId(null)
                                    }}
                                    className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-lg"
                                  >Confirmar</button>
                                  <button onClick={() => setReportingId(null)} className="text-[10px] text-gray-400 px-1">✕</button>
                                </div>
                              ) : (
                                <button onClick={() => setReportingId(r.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-sm" title="Denunciar">🚩</button>
                              )
                            )}
                          </div>
                          <div className="flex gap-1.5 flex-wrap mb-1.5">
                            {r.foodQuality && (
                              <span className="text-[10px] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                                {r.foodQuality === 'otima' ? '😋 Comida excelente' : r.foodQuality === 'boa' ? '🙂 Comida boa' : '😕 Comida ruim'}
                              </span>
                            )}
                            <span className="text-[10px] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                              {r.crowded === 'tranquilo' ? '😌 Tranquilo' : r.crowded === 'moderado' ? '🙂 Moderado' : '🏃 Lotado'}
                            </span>
                            {r.priceRange && (
                              <span className="text-[10px] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                                {r.priceRange} {r.priceRange === '💲' ? 'Econômico' : r.priceRange === '💲💲' ? 'Moderado' : 'Premium'}
                              </span>
                            )}
                          </div>
                          {r.text && <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{r.text}</p>}
                          {r.photos && r.photos.length > 0 && (
                            <div className="flex gap-1.5 overflow-x-auto mt-1">
                              {r.photos.map((url, pi) => (
                                <img key={pi} src={getOptimizedUrl(url, 128)} alt="" className="h-16 w-16 flex-shrink-0 object-cover rounded-lg" loading="lazy" />
                              ))}
                            </div>
                          )}
                          {r.videoUrl && <YouTubeEmbed videoUrl={r.videoUrl} className="mt-2" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="h-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
