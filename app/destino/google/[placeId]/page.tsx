'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import WeatherBadge from '@/components/WeatherBadge'
import { useRoteiro } from '@/lib/roteiro-context'
import type { WeatherData, Review } from '@/types'
import Lightbox from '@/components/Lightbox'
import RouteModal from '@/components/RouteModal'
import WriteReviewModal from '@/components/WriteReviewModal'
import CommunityRoteiroModal from '@/components/CommunityRoteiroModal'
import { getReviewsByPlace, reportReview, hasUserReportedReview, getApprovedEvents } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import type { RoleEvent } from '@/types'
import { getOptimizedUrl } from '@/lib/cloudinary'

const RENTCARS_ID = process.env.NEXT_PUBLIC_RENTCARS_AFFILIATE_ID
function rentcarsUrl(city: string) {
  const p = new URLSearchParams()
  if (RENTCARS_ID) p.set('partner', RENTCARS_ID)
  p.set('pickup_name', city)
  return `https://www.rentcars.com/pt-br/?${p}`
}

function formatEventDate(ts: any) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatEventTime(ts: any) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

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


const TYPE_ICON: Record<string, string> = {
  hospital: '🏥',
  police: '👮',
  fire_station: '🚒',
}
const TYPE_LABEL: Record<string, string> = {
  hospital: 'Pronto-socorro / Hospital',
  police: 'Delegacia / Polícia',
  fire_station: 'Bombeiros / Salva-vidas',
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
            className="w-8 h-8 rounded-full object-cover flex-shrink-0" loading="lazy" />
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
  const { user } = useAuth()
  const { setDestination } = useRoteiro()
  const [place, setPlace] = useState<GooglePlace | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showRoute, setShowRoute] = useState(false)
  const [showHours, setShowHours] = useState(false)
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [showCommunityRoteiros, setShowCommunityRoteiros] = useState(false)
  const [appReviews, setAppReviews] = useState<Review[]>([])
  const [appReviewPage, setAppReviewPage] = useState(0)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const [reviewLightbox, setReviewLightbox] = useState<{ photos: { url: string }[]; idx: number } | null>(null)
  const [eventLightbox, setEventLightbox] = useState<string | null>(null)
  const [events, setEvents] = useState<RoleEvent[]>([])
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
        getReviewsByPlace(data.place.googlePlaceId).then(setAppReviews).catch(() => {})
        getApprovedEvents(data.place.city).then(setEvents).catch(() => {})
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

  async function handleReport(r: Review) {
    if (!user) return
    const already = await hasUserReportedReview(user.uid, r.id)
    if (already) { setReportedIds((s) => new Set(s).add(r.id)); setReportingId(null); return }
    await reportReview({
      reviewId: r.id,
      placeId: r.placeId,
      reviewUserId: r.userId,
      reviewUserName: r.userName,
      reviewText: r.text,
      reviewRating: r.rating,
      placeName: r.placeName,
      googlePlaceId: r.googlePlaceId,
      reportedBy: user.uid,
      reportedByName: user.displayName ?? 'Anônimo',
    })
    setReportedIds((s) => new Set(s).add(r.id))
    setReportingId(null)
  }

  const mapsUrl = place.googleMapsUri
    || `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`

  // weekdayDescriptions começa na segunda (índice 0 = segunda)
  const jsDay = new Date().getDay() // 0=dom, 1=seg...
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1
  const todayHours = place.weekdayDescriptions[todayIndex] || null

  return (
    <div className="max-w-2xl mx-auto">
      {lightbox && <Lightbox photos={place.photos.map((p) => p.url)} startIndex={activePhoto} onClose={() => setLightbox(null)} />}
      {reviewLightbox && <Lightbox photos={reviewLightbox.photos.map((p) => p.url)} startIndex={reviewLightbox.idx} onClose={() => setReviewLightbox(null)} />}
      {eventLightbox && <Lightbox photos={[eventLightbox]} startIndex={0} onClose={() => setEventLightbox(null)} />}
      {showWriteReview && <WriteReviewModal placeId={place.googlePlaceId} placeName={place.name} googlePlaceId={place.googlePlaceId} onClose={() => setShowWriteReview(false)} onSubmitted={() => getReviewsByPlace(place.googlePlaceId).then(setAppReviews).catch(() => {})} />}

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
          className="w-full py-3 rounded-xl font-bold text-sm text-center border-2 border-orange-400 text-orange-500 bg-white hover:bg-orange-50 transition-colors"
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
          <button
            onClick={() => setShowCommunityRoteiros(true)}
            className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
          >
            🗓️ Ver roteiros da comunidade
          </button>
        </section>

        {showCommunityRoteiros && (
          <CommunityRoteiroModal
            destinationId={`google_${place.googlePlaceId}`}
            destinationName={place.name}
            onClose={() => setShowCommunityRoteiros(false)}
          />
        )}

        {/* ── Eventos na cidade ── */}
        {events.length > 0 && (
          <section className="border border-purple-100 rounded-2xl overflow-hidden">
            <div className="bg-purple-50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-gray-900">🎭 O que tá rolando em {place.city}</span>
                <span className="text-xs font-semibold bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">{events.length}</span>
              </div>
            </div>
            <div className="flex flex-col divide-y divide-gray-50">
              {events.slice(0, 3).map((ev) => (
                <div key={ev.id} className="flex bg-white">
                  {ev.photoUrl ? (
                    <button
                      onClick={() => setEventLightbox(ev.photoUrl!)}
                      className="relative w-24 h-24 flex-shrink-0 cursor-zoom-in group overflow-hidden"
                    >
                      <img
                        src={getOptimizedUrl(ev.photoUrl, 200)}
                        alt={ev.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-end justify-end p-1">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] bg-black/40 rounded px-1">⛶ zoom</span>
                      </div>
                    </button>
                  ) : (
                    <div className="w-24 h-24 flex-shrink-0 bg-purple-50 flex items-center justify-center text-3xl">🎭</div>
                  )}
                  <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide capitalize">
                        {formatEventDate(ev.date)}{ev.date ? ` · ${formatEventTime(ev.date)}` : ''}
                      </p>
                      <p className="text-sm font-bold text-gray-900 leading-tight truncate mt-0.5">{ev.name}</p>
                      {ev.venue && <p className="text-xs text-gray-400 truncate mt-0.5">📍 {ev.venue}</p>}
                      {ev.price && <p className="text-xs font-semibold text-green-700 mt-0.5">{ev.price}</p>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <Link href={`/evento/${ev.id}`} className="text-xs text-purple-600 font-bold hover:underline">
                        Ver evento →
                      </Link>
                      {ev.ticketUrl && (
                        <a href={ev.ticketUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-bold text-white bg-purple-600 rounded-lg px-2.5 py-1">
                          🎟️ Ingressos
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {events.length > 3 && (
                <div className="px-4 py-2 text-center">
                  <span className="text-xs text-purple-500 font-semibold">+{events.length - 3} eventos nesta cidade</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Alugar Veículo ── */}
        <a
          href={rentcarsUrl(place.city)}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl overflow-hidden border border-blue-100 hover:shadow-md transition-shadow"
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white font-extrabold text-base tracking-tight">rentcars</p>
              <p className="text-blue-200 text-xs">Compare e economize no aluguel</p>
            </div>
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">🚗 Ver opções →</span>
          </div>
          <div className="bg-white px-4 py-2">
            <p className="text-xs text-gray-500">Retire em <span className="font-semibold text-gray-700">{place.city}</span> e chegue no rolê do seu jeito</p>
          </div>
        </a>

        {/* ── Avaliações ── */}
        {place.rating > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Avaliações ⭐</h2>

            {/* Resumo lado a lado */}
            {(() => {
              const appAvg = appReviews.length > 0
                ? appReviews.reduce((s, r) => s + r.rating, 0) / appReviews.length
                : null
              return (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Rolê */}
                  <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4 flex flex-col items-center gap-1">
                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide">LetsApp</p>
                    {appAvg !== null ? (
                      <>
                        <p className="text-3xl font-extrabold text-gray-900">{appAvg.toFixed(1)}</p>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((i) => (
                            <span key={i} className={`text-sm ${i <= Math.round(appAvg) ? 'text-orange-400' : 'text-gray-200'}`}>★</span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400">{appReviews.length} {appReviews.length === 1 ? 'avaliação' : 'avaliações'}</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 text-center mt-1">Seja o primeiro a avaliar</p>
                    )}
                    <button
                      onClick={() => setShowWriteReview(true)}
                      className="mt-2 w-full py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                    >⭐ Avaliar</button>
                  </div>
                  {/* Google */}
                  <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 flex flex-col items-center gap-1">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">🌐 Google</p>
                    <p className="text-3xl font-extrabold text-gray-900">{place.rating.toFixed(1)}</p>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((i) => (
                        <span key={i} className={`text-sm ${i <= Math.round(place.rating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">{place.reviewCount.toLocaleString('pt-BR')} avaliações</p>
                    <a
                      href={`https://search.google.com/local/writereview?placeid=${place.googlePlaceId}`}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-2 w-full py-2 rounded-xl text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors text-center"
                    >🌐 Avaliar</a>
                  </div>
                </div>
              )
            })()}

            {/* Reviews do app */}
            {appReviews.length > 0 && (() => {
              const totalPages = Math.ceil(appReviews.length / APP_REVIEWS_PER_PAGE)
              const visible = appReviews.slice(appReviewPage * APP_REVIEWS_PER_PAGE, (appReviewPage + 1) * APP_REVIEWS_PER_PAGE)
              return (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-gray-900">Avaliações da comunidade LetsApp</span>
                    <span className="text-xs font-semibold bg-orange-100 text-orange-600 rounded-full px-2 py-0.5">{appReviews.length}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {visible.map((r) => {
                      const date = r.createdAt?.toDate?.()
                      const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
                      return (
                        <div key={r.id} className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4">
                          <div className="flex items-start gap-3 mb-3">
                            {r.userPhoto ? (
                              <img src={r.userPhoto} alt={r.userName} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-orange-200" loading="lazy" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {r.userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-gray-900 truncate">{r.userName}</p>
                                {r.reviewerRank && <span className="bg-orange-50 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{r.reviewerRank}</span>}
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
                            {/* Botão denúncia */}
                            {user && user.uid !== r.userId && (
                              reportedIds.has(r.id) ? (
                                <span className="text-[10px] text-gray-400 flex-shrink-0">Denunciado</span>
                              ) : reportingId === r.id ? (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={() => setReportingId(null)} className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded bg-gray-100">Cancelar</button>
                                  <button onClick={() => handleReport(r)} className="text-[10px] text-white px-1.5 py-0.5 rounded bg-red-500 font-semibold">Confirmar</button>
                                </div>
                              ) : (
                                <button onClick={() => setReportingId(r.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0" title="Denunciar">⚑</button>
                              )
                            )}
                          </div>
                          {r.text && <p className="text-sm text-gray-700 leading-relaxed">{r.text}</p>}
                          {r.photos && r.photos.length > 0 && (
                            <div className="flex gap-1.5 mt-2 overflow-x-auto">
                              {r.photos.map((url, pi) => (
                                <button key={pi} onClick={() => setReviewLightbox({ photos: r.photos!.map((u) => ({ url: u })), idx: pi })}
                                  className="flex-shrink-0">
                                  <img src={getOptimizedUrl(url, 128)} alt="" className="h-16 w-16 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-zoom-in" loading="lazy" />
                                </button>
                              ))}
                            </div>
                          )}
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
