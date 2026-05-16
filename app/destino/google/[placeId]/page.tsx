'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { haversineDistance } from '@/lib/geolocation'
import WeatherBadge from '@/components/WeatherBadge'
import { useRoteiro } from '@/lib/roteiro-context'
import type { WeatherData, Review } from '@/types'
import ImageLightbox from '@/components/ImageLightbox'
import RouteModal from '@/components/RouteModal'
import WriteReviewModal from '@/components/WriteReviewModal'
import { getReviewsByPlace } from '@/lib/firestore'

interface GoogleReview {
  author: string
  authorPhoto: string | null
  rating: number
  time: string
  text: string
}

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
  reviews: GoogleReview[]
  primaryType: string
}

interface EmergencyService {
  id: string
  name: string
  type: string
  address: string
  phone: string | null
  lat: number
  lng: number
  openNow: boolean | null
}

const TYPE_ICON: Record<string, string> = {
  hospital: '🏥',
  police: '👮',
  fire_station: '🚒',
  pharmacy: '💊',
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const [expanded, setExpanded] = useState(false)
  const long = review.text.length > 220
  const displayText = long && !expanded ? review.text.slice(0, 220) + '…' : review.text

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        {review.authorPhoto ? (
          <img src={review.authorPhoto} alt={review.author}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
            {review.author.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-gray-800">{review.author}</p>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`text-xs ${i <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
              ))}
            </div>
            {review.time && <span className="text-xs text-gray-400">{review.time}</span>}
          </div>
        </div>
      </div>
      {review.text && (
        <div>
          <p className="text-sm text-gray-700 leading-relaxed">{displayText}</p>
          {long && (
            <button onClick={() => setExpanded((v) => !v)}
              className="text-xs text-orange-500 font-semibold mt-1">
              {expanded ? 'ver menos' : 'ver mais'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function GooglePlacePage() {
  const { placeId } = useParams<{ placeId: string }>()
  const router = useRouter()
  const { setDestination } = useRoteiro()
  const [place, setPlace] = useState<GooglePlace | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [emergency, setEmergency] = useState<EmergencyService[]>([])
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showRoute, setShowRoute] = useState(false)
  const [showHours, setShowHours] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [appReviews, setAppReviews] = useState<Review[]>([])
  const [appReviewPage, setAppReviewPage] = useState(0)
  const APP_REVIEWS_PER_PAGE = 5

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/places/google?placeId=${placeId}`)
      const data = await res.json()
      if (data.place) {
        setPlace(data.place)
        fetch(`/api/weather?lat=${data.place.lat}&lng=${data.place.lng}`)
          .then((r) => r.json()).then(setWeather).catch(() => {})
        fetch(`/api/emergency?lat=${data.place.lat}&lng=${data.place.lng}`)
          .then((r) => r.json()).then((d) => setEmergency(d.services || [])).catch(() => {})
        getReviewsByPlace(data.place.googlePlaceId).then(setAppReviews).catch(() => {})
      }
      setLoading(false)
    }
    load()
  }, [placeId])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="skeleton h-72 w-full rounded-xl mb-4" />
        <div className="skeleton h-8 w-2/3 mb-2" />
        <div className="skeleton h-5 w-1/2 mb-2" />
        <div className="skeleton h-5 w-3/4" />
      </div>
    )
  }

  if (!place) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-3">🔍</div>
        <p className="font-semibold text-gray-700">Esse rolê sumiu no mapa!</p>
        <Link href="/" className="text-orange-500 text-sm mt-2 inline-block">Voltar ao início</Link>
      </div>
    )
  }

  const mapsUrl = place.googleMapsUri
    || `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`

  // weekdayDescriptions começa na segunda (índice 0 = segunda)
  const jsDay = new Date().getDay() // 0=dom, 1=seg...
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1
  const todayHours = place.weekdayDescriptions[todayIndex] || null

  return (
    <div className="max-w-2xl mx-auto">
      {lightbox && <ImageLightbox photos={place.photos} initialIdx={activePhoto} alt={place.name} onClose={() => setLightbox(null)} />}
      {showWriteReview && <WriteReviewModal placeId={place.googlePlaceId} placeName={place.name} onClose={() => setShowWriteReview(false)} onSubmitted={() => getReviewsByPlace(place.googlePlaceId).then(setAppReviews).catch(() => {})} />}

      {/* ── Foto principal ── */}
      <div className="relative h-72 bg-gray-100">
        {place.photos.length > 0 ? (
          <button className="absolute inset-0 w-full h-full" onClick={() => setLightbox(place.photos[activePhoto].url)}>
            <Image
              key={activePhoto}
              src={place.photos[activePhoto].url}
              alt={place.name}
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
            />
            <span className="absolute bottom-16 right-4 bg-black/40 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">🔍 Ampliar</span>
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-7xl bg-gradient-to-b from-orange-50 to-orange-100">
            📍
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow"
        >
          ←
        </button>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <span className="bg-blue-500/90 text-white text-xs font-semibold px-2 py-1 rounded-full">
            🔍 Descoberto
          </span>
          {place.openNow !== null && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              place.openNow ? 'bg-green-600/90 text-white' : 'bg-red-500/90 text-white'
            }`}>
              {place.openNow ? '✅ Aberto agora' : '🔴 Fechado'}
            </span>
          )}
        </div>
      </div>

      {/* ── Miniaturas ── */}
      {place.photos.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b border-gray-100">
          {place.photos.map((p, i) => (
            <button
              key={i}
              onClick={() => setActivePhoto(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                activePhoto === i ? 'border-orange-500 scale-105' : 'border-transparent opacity-70'
              }`}
            >
              <Image
                src={p.url}
                alt={`Foto ${i + 1}`}
                width={64}
                height={64}
                className="object-cover w-full h-full"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-5 flex flex-col gap-5">

        {/* ── Título + rating ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{place.name}</h1>
          <p className="text-gray-500 mt-0.5">{place.city}{place.state ? `, ${place.state}` : ''}</p>
          {place.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= Math.round(place.rating) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">
                {place.rating.toFixed(1)} ({place.reviewCount.toLocaleString('pt-BR')} avaliações Google)
              </span>
            </div>
          )}
        </div>

        {/* ── Clima ── */}
        {weather && <WeatherBadge weather={weather} />}

        {/* ── Horários ── */}
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
              <span className="text-gray-400 text-xs">{showHours ? '▲ fechar' : '▼ ver semana'}</span>
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

        {/* ── Descrição ── */}
        {place.description && (
          <p className="text-gray-700 leading-relaxed">{place.description}</p>
        )}

        {/* ── Contatos ── */}
        <div className="flex flex-col gap-2">
          {place.address && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <span className="mt-0.5 flex-shrink-0">📍</span>
              <span>{place.address}</span>
            </div>
          )}
          {place.phone && (
            <a href={`tel:${place.phone}`} className="flex items-center gap-2 text-sm text-blue-600 font-medium">
              <span>📞</span>
              <span>{place.phone}</span>
            </a>
          )}
          {place.website && (
            <a href={place.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 font-medium">
              <span>🌐</span>
              <span className="truncate">
                {place.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </span>
            </a>
          )}
        </div>

        {/* ── Botão rota ── */}
        {showRoute && (
          <RouteModal
            destLat={place.lat}
            destLng={place.lng}
            destName={place.name}
            mapsUrl={mapsUrl}
            onClose={() => setShowRoute(false)}
          />
        )}
        <button
          onClick={() => setShowRoute(true)}
          className="btn-primary text-center w-full"
        >
          📍 Como chegar
        </button>

        {/* ── Montar roteiro ── */}
        <section className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">🗓️</span>
            <div>
              <h2 className="font-bold text-gray-900">Monte seu roteiro</h2>
              <p className="text-sm text-gray-500 mt-0.5">Adicione eventos, restaurantes e hospedagem em {place.city} num único plano.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setDestination({ id: `google_${place.googlePlaceId}`, name: place.name, city: place.city, state: place.state, lat: place.lat, lng: place.lng, photoUrl: place.photos[0]?.url, source: 'external', googlePlaceId: place.googlePlaceId })
              router.push('/roteiro')
            }}
            className="w-full py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #f97316 100%)' }}
          >
            Montar roteiro →
          </button>
        </section>

        {/* ── Segurança no rolê ── */}
        {emergency.length > 0 && (
          <section className="border border-gray-100 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowEmergency((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50"
            >
              <h2 className="text-base font-bold text-gray-900">Segurança no rolê 🚨</h2>
              <span className="text-gray-400 text-xs">{showEmergency ? '▲ fechar' : '▼ ver serviços'}</span>
            </button>
            {showEmergency && (
              <div className="flex flex-col gap-2 p-3">
                {emergency.slice(0, 5).map((s) => {
                  const distKm = Math.round(haversineDistance(place.lat, place.lng, s.lat, s.lng) * 10) / 10
                  const mapsEmergencyUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`
                  return (
                    <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      <span className="text-2xl flex-shrink-0">{TYPE_ICON[s.type] || '🚑'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{s.name}</p>
                        <p className="text-xs text-gray-400 truncate">{s.address}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-bold text-gray-700">{distKm} km</span>
                          {s.openNow !== null && (
                            <span className={`text-xs font-medium ${s.openNow ? 'text-green-600' : 'text-red-500'}`}>
                              {s.openNow ? 'Aberto' : 'Fechado'}
                            </span>
                          )}
                          {s.phone && (
                            <a href={`tel:${s.phone}`} className="text-xs text-blue-500 font-medium">{s.phone}</a>
                          )}
                        </div>
                      </div>
                      <a
                        href={mapsEmergencyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 text-white text-lg"
                      >
                        🗺️
                      </a>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Avaliações ── */}
        {place.rating > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Avaliações ⭐</h2>

            {/* Resumo */}
            <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
              <div className="text-center">
                <p className="text-4xl font-extrabold text-gray-900">{place.rating.toFixed(1)}</p>
                <div className="flex gap-0.5 justify-center mt-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`text-base ${i <= Math.round(place.rating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{place.reviewCount.toLocaleString('pt-BR')} avaliações</p>
              </div>
              <div className="flex-1 border-l border-gray-200 pl-4 flex flex-col gap-2">
                <button
                  onClick={() => setShowWriteReview(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                >
                  ⭐ Avaliar no Rolê
                </button>
                <a
                  href={`https://search.google.com/local/writereview?placeid=${place.googlePlaceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  <span>🌐</span> Avaliar no Google
                </a>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-blue-500 text-center transition-colors"
                >
                  Ver todas as avaliações →
                </a>
              </div>
            </div>

            {/* Reviews do app */}
            {appReviews.length > 0 && (() => {
              const totalPages = Math.ceil(appReviews.length / APP_REVIEWS_PER_PAGE)
              const visible = appReviews.slice(appReviewPage * APP_REVIEWS_PER_PAGE, (appReviewPage + 1) * APP_REVIEWS_PER_PAGE)
              return (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-gray-900">Avaliações da comunidade Rolê</span>
                    <span className="text-xs font-semibold bg-orange-100 text-orange-600 rounded-full px-2 py-0.5">{appReviews.length}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {visible.map((r) => {
                      const date = r.createdAt?.toDate?.()
                      const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
                      return (
                        <div key={r.id} className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4">
                          <div className="flex items-center gap-3 mb-3">
                            {r.userPhoto ? (
                              <img src={r.userPhoto} alt={r.userName} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-orange-200" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {r.userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-gray-900 truncate">{r.userName}</p>
                                {r.verified && (
                                  <span className="text-[10px] font-bold bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 flex-shrink-0">✓ Verificado</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="flex gap-0.5">
                                  {[1,2,3,4,5].map((s) => (
                                    <span key={s} className={`text-xs ${s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                  ))}
                                </div>
                                {dateStr && <span className="text-xs text-gray-400">· {dateStr}</span>}
                              </div>
                            </div>
                          </div>
                          {r.text && <p className="text-sm text-gray-700 leading-relaxed">{r.text}</p>}
                        </div>
                      )
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <button disabled={appReviewPage === 0} onClick={() => setAppReviewPage((p) => p - 1)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 disabled:opacity-30">‹ Anterior</button>
                      <span className="text-xs text-gray-400">{appReviewPage + 1} / {totalPages}</span>
                      <button disabled={appReviewPage === totalPages - 1} onClick={() => setAppReviewPage((p) => p + 1)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 disabled:opacity-30">Próxima ›</button>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Reviews do Google */}
            {place.reviews.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-gray-900">Avaliações do Google</span>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">🌐 Google</span>
                </div>
                <div className="flex flex-col gap-3">
                  {place.reviews.map((r, i) => (
                    <ReviewCard key={i} review={r} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  )
}
