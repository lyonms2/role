'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import RouteModal from './RouteModal'
import Lightbox from './Lightbox'
import WriteReviewModal from './WriteReviewModal'
import { getReviewsByPlace } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import { getOptimizedUrl } from '@/lib/cloudinary'
import YouTubeEmbed from './YouTubeEmbed'
import type { Review } from '@/types'

interface GooglePlace {
  googlePlaceId: string
  name: string
  city: string
  state: string
  lat: number
  lng: number
  description: string
  address: string
  rating: number
  reviewCount: number
  phone: string | null
  website: string | null
  googleMapsUri: string | null
  openNow: boolean | null
  weekdayDescriptions: string[]
  photos: { name: string; url: string }[]
  reviews: { author: string; authorPhoto: string | null; rating: number; time: string; text: string }[]
}

interface Props {
  placeId: string
  onClose: () => void
  zIndex?: number
}

export default function PlaceDetailModal({ placeId, onClose, zIndex = 120 }: Props) {
  const { user } = useAuth()
  const [place, setPlace] = useState<GooglePlace | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHours, setShowHours] = useState(false)
  const [showRoute, setShowRoute] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [appReviews, setAppReviews] = useState<Review[]>([])
  const [showWriteReview, setShowWriteReview] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    fetch(`/api/places/google?placeId=${placeId}`)
      .then((r) => r.json())
      .then((d) => { setPlace(d.place); setLoading(false) })
      .catch(() => setLoading(false))
    getReviewsByPlace(placeId).then(setAppReviews).catch(() => {})
  }, [placeId])

  const jsDay = new Date().getDay()
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1
  const todayHours = place?.weekdayDescriptions[todayIndex] || null

  const mapsUrl = place
    ? (place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`)
    : ''

  return (
    <div className="fixed inset-0 flex flex-col bg-black/60" style={{ zIndex }} onClick={onClose}>
      {lightboxIdx !== null && place && (
        <Lightbox
          photos={place.photos.map((p) => p.url)}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
      {showRoute && place && (
        <RouteModal
          destLat={place.lat}
          destLng={place.lng}
          destName={place.name}
          mapsUrl={mapsUrl}
          onClose={() => setShowRoute(false)}
        />
      )}
      {showWriteReview && place && (
        <WriteReviewModal
          placeId={placeId}
          placeName={place.name}
          googlePlaceId={placeId}
          onClose={() => setShowWriteReview(false)}
          onSubmitted={() => {
            setShowWriteReview(false)
            getReviewsByPlace(placeId).then(setAppReviews).catch(() => {})
          }}
          zIndex={zIndex + 10}
        />
      )}

      <div
        className="bg-white flex flex-col mt-16 rounded-t-3xl overflow-hidden flex-1 max-w-2xl mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho fixo */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="font-bold text-gray-900 text-base truncate pr-4">
            {loading ? '...' : (place?.name || 'Detalhes do local')}
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              <div className="skeleton h-48 w-full rounded-xl" />
              <div className="skeleton h-6 w-2/3" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ) : !place ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">😕</div>
              <p>Não foi possível carregar os detalhes.</p>
            </div>
          ) : (
            <div className="flex flex-col">

              {/* Foto */}
              {place.photos.length > 0 && (
                <div className="relative h-52 bg-gray-100 flex-shrink-0">
                  <Image
                    key={activePhoto}
                    src={place.photos[activePhoto].url}
                    alt={place.name}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    unoptimized
                  />
                  <button
                    onClick={() => setLightboxIdx(activePhoto)}
                    className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white text-sm font-bold"
                  >⛶</button>
                  {place.openNow !== null && (
                    <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full ${
                      place.openNow ? 'bg-green-600/90 text-white' : 'bg-red-500/90 text-white'
                    }`}>
                      {place.openNow ? '✅ Aberto' : '🔴 Fechado'}
                    </span>
                  )}
                  {/* Miniaturas */}
                  {place.photos.length > 1 && (
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {place.photos.slice(0, 6).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActivePhoto(i)}
                          className={`w-6 h-6 rounded-md overflow-hidden border-2 transition-all ${
                            activePhoto === i ? 'border-white scale-110' : 'border-white/40 opacity-70'
                          }`}
                        >
                          <Image
                            src={place.photos[i].url}
                            alt=""
                            width={24}
                            height={24}
                            className="object-cover w-full h-full"
                            unoptimized
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="px-4 py-4 flex flex-col gap-4">

                {/* Título + rating */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{place.name}</h2>
                  <p className="text-gray-500 text-sm">{place.city}{place.state ? `, ${place.state}` : ''}</p>
                  {place.rating > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={`text-sm ${i <= Math.round(place.rating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                      <span className="text-sm text-gray-500 ml-1">
                        {place.rating.toFixed(1)} ({place.reviewCount.toLocaleString('pt-BR')})
                      </span>
                    </div>
                  )}
                </div>

                {/* Descrição */}
                {place.description && (
                  <p className="text-gray-700 text-sm leading-relaxed">{place.description}</p>
                )}

                {/* Horário de hoje */}
                {todayHours && (
                  <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setShowHours((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <span>🕐</span>
                        <span>{todayHours}</span>
                      </div>
                      <span className="text-gray-400 text-xs">{showHours ? '▲' : '▼ semana'}</span>
                    </button>
                    {showHours && place.weekdayDescriptions.length > 1 && (
                      <div className="px-4 pb-3 flex flex-col gap-1 border-t border-gray-100">
                        {place.weekdayDescriptions.map((d, i) => (
                          <p key={i} className={`text-xs py-0.5 ${i === todayIndex ? 'font-bold text-orange-500' : 'text-gray-500'}`}>
                            {d}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Contatos */}
                <div className="flex flex-col gap-1.5">
                  {place.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="flex-shrink-0 mt-0.5">📍</span>
                      <span>{place.address}</span>
                    </div>
                  )}
                  {place.phone && (
                    <a href={`tel:${place.phone}`} className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                      <span>📞</span><span>{place.phone}</span>
                    </a>
                  )}
                  {place.website && (
                    <a href={place.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                      <span>🌐</span>
                      <span className="truncate">{place.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                    </a>
                  )}
                </div>

                {/* Como chegar */}
                <button
                  onClick={() => setShowRoute(true)}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #f97316 100%)' }}
                >
                  📍 Como chegar
                </button>

                {/* Avaliações da comunidade */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-gray-900">Avaliações da comunidade ⭐</h3>
                    {user && (
                      <button
                        onClick={() => setShowWriteReview(true)}
                        className="text-xs font-bold text-orange-500 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        + Avaliar
                      </button>
                    )}
                  </div>
                  {appReviews.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">Nenhuma avaliação ainda. Seja o primeiro!</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {appReviews.map((r) => (
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
                          </div>
                          <div className="flex gap-1.5 flex-wrap mb-1.5">
                            {r.crowded && (
                              <span className="text-[10px] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                                {r.crowded === 'nao' ? '😌 Vazio' : r.crowded === 'moderado' ? '🙂 Moderado' : '🏃 Cheio'}
                              </span>
                            )}
                            {r.signal && (
                              <span className="text-[10px] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                                {r.signal === 'good' ? '📶 Sinal bom' : r.signal === 'weak' ? '🔅 Sinal fraco' : '🚫 Sem sinal'}
                              </span>
                            )}
                            {r.familyFriendly !== undefined && (
                              <span className="text-[10px] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                                {r.familyFriendly ? '👨‍👩‍👧 Família OK' : 'Não familiar'}
                              </span>
                            )}
                          </div>
                          {r.bestTime && (
                            <p className="text-[10px] text-gray-500 mb-1">⏰ Melhor horário: {r.bestTime}</p>
                          )}
                          {r.text && <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{r.text}</p>}
                          {r.photos && r.photos.length > 0 && (
                            <div className="flex gap-1.5 overflow-x-auto mt-1.5">
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

                {/* Avaliações do Google */}
                {place.reviews.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">No Google</h3>
                    <div className="flex flex-col gap-3">
                      {place.reviews.slice(0, 3).map((r, i) => (
                        <div key={i} className="border border-gray-100 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            {r.authorPhoto ? (
                              <img src={r.authorPhoto} alt={r.author} className="w-7 h-7 rounded-full object-cover flex-shrink-0" loading="lazy" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                                {r.author.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{r.author}</p>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <span key={s} className={`text-xs ${s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                ))}
                                {r.time && <span className="text-xs text-gray-400 ml-1">{r.time}</span>}
                              </div>
                            </div>
                          </div>
                          {r.text && (
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{r.text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {mapsUrl && (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        className="block text-center text-xs text-gray-400 hover:text-orange-500 mt-3 transition-colors">
                        Ver todas as avaliações no Google →
                      </a>
                    )}
                  </div>
                )}

                <div className="h-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
