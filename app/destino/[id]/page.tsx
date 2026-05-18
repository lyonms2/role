'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getPlaceById, getReviewsByPlace, hasUserReviewedPlace } from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { haversineDistance } from '@/lib/geolocation'
import { useRoteiro } from '@/lib/roteiro-context'
import type { Place, Review, WeatherData } from '@/types'
import { CATEGORY_EMOJIS } from '@/types'
import WeatherBadge from '@/components/WeatherBadge'
import ReviewForm from '@/components/ReviewForm'
import ReviewList from '@/components/ReviewList'
import ImageLightbox from '@/components/ImageLightbox'
import RouteModal from '@/components/RouteModal'
import { getOptimizedUrl } from '@/lib/cloudinary'

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

export default function DestinoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { setDestination } = useRoteiro()
  const [place, setPlace] = useState<Place | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [emergencyServices, setEmergencyServices] = useState<{ police: EmergencyService[]; fire: EmergencyService[]; hospital: EmergencyService[] }>({ police: [], fire: [], hospital: [] })
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [showRoute, setShowRoute] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)
  const [emergencyFetched, setEmergencyFetched] = useState(false)
  const [emergencyLoading, setEmergencyLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser)
    return unsub
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [p, revs] = await Promise.all([getPlaceById(id), getReviewsByPlace(id)])
      setPlace(p)
      setReviews(revs)
      if (p) {
        fetch(`/api/weather?lat=${p.lat}&lng=${p.lng}`)
          .then((r) => r.json()).then(setWeather).catch(() => {})
      }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!user || !id) return
    hasUserReviewedPlace(user.uid, id).then(setHasReviewed)
  }, [user, id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="skeleton h-64 w-full rounded-xl mb-4" />
        <div className="skeleton h-8 w-2/3 mb-2" />
        <div className="skeleton h-5 w-1/2" />
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

  const emoji = CATEGORY_EMOJIS[place.category] || '📍'
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`

  return (
    <div className="max-w-2xl mx-auto">
      {lightbox !== null && (() => {
        const allPhotos = place.photos?.length ? place.photos : place.photoUrl ? [place.photoUrl] : []
        return <ImageLightbox photos={allPhotos.map((url) => ({ url }))} initialIdx={lightbox} alt={place.name} onClose={() => setLightbox(null)} />
      })()}

      {/* Fotos */}
      {(() => {
        const allPhotos = place.photos?.length ? place.photos : place.photoUrl ? [place.photoUrl] : []
        if (allPhotos.length === 0) return (
          <div className="relative h-72 bg-gradient-to-b from-orange-50 to-orange-100 flex items-center justify-center text-7xl">
            {emoji}
            <button onClick={() => router.back()} className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow">←</button>
          </div>
        )
        if (allPhotos.length === 1) return (
          <div className="relative h-72 bg-gray-100">
            <button className="absolute inset-0 w-full h-full" onClick={() => setLightbox(0)}>
              <Image src={getOptimizedUrl(allPhotos[0], 1200)} alt={place.name} fill className="object-cover" sizes="100vw" unoptimized={allPhotos[0].startsWith('/api/photo')} />
              <span className="absolute bottom-16 right-4 bg-black/40 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">🔍 Ampliar</span>
            </button>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">{emoji} {place.category.replace('_', ' ')}</span>
              {place.verifiedReviewCount > 0 && <span className="ml-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full">✅ Verificado por quem foi</span>}
            </div>
            <button onClick={() => router.back()} className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow">←</button>
          </div>
        )
        return (
          <div className="relative">
            <div className="flex overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
              {allPhotos.map((photo, i) => (
                <button key={i} onClick={() => setLightbox(i)} className="relative flex-shrink-0 w-full h-72 snap-center">
                  <Image src={getOptimizedUrl(photo, 1200)} alt={`${place.name} ${i + 1}`} fill className="object-cover" sizes="100vw" unoptimized={photo.startsWith('/api/photo')} />
                </button>
              ))}
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
              {allPhotos.map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/80" />)}
            </div>
            <div className="absolute bottom-10 left-4">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">{emoji} {place.category.replace('_', ' ')}</span>
              {place.verifiedReviewCount > 0 && <span className="ml-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full">✅ Verificado por quem foi</span>}
            </div>
            <span className="absolute top-4 right-4 bg-black/40 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">🔍 {allPhotos.length} fotos</span>
            <button onClick={() => router.back()} className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow">←</button>
          </div>
        )
      })()}

      <div className="px-4 py-5 flex flex-col gap-5">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{place.name}</h1>
          <p className="text-gray-500 mt-0.5">{place.city}, {place.state}</p>
          {place.reviewCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`${i <= Math.round(place.averageRating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">{place.averageRating.toFixed(1)} ({place.reviewCount} avaliações)</span>
            </div>
          )}
        </div>

        {weather && <WeatherBadge weather={weather} />}

        {/* Sinal agregado das reviews */}
        {reviews.length > 0 && (() => {
          const signalReviews = reviews.filter((r) => r.signal)
          if (signalReviews.length === 0) return null
          const counts = { good: 0, weak: 0, none: 0 }
          signalReviews.forEach((r) => { if (r.signal) counts[r.signal]++ })
          const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
          const total = signalReviews.length
          const icons = { good: '📶', weak: '🔅', none: '🚫' }
          const labels = { good: 'Sinal bom', weak: 'Sinal fraco', none: 'Sem sinal' }
          const colors = { good: 'bg-blue-50 border-blue-200 text-blue-800', weak: 'bg-yellow-50 border-yellow-200 text-yellow-800', none: 'bg-red-50 border-red-200 text-red-800' }
          const key = dominant[0] as 'good' | 'weak' | 'none'
          return (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${colors[key]}`}>
              <span className="text-base">{icons[key]}</span>
              <span>{labels[key]} — {dominant[1]} de {total} relato{total !== 1 ? 's' : ''}</span>
              {key === 'none' && <span className="ml-auto text-xs font-normal">Baixe mapas offline!</span>}
            </div>
          )
        })()}

        <p className="text-gray-700 leading-relaxed">{place.description}</p>

        {showRoute && (
          <RouteModal destLat={place.lat} destLng={place.lng} destName={place.name} mapsUrl={mapsUrl} onClose={() => setShowRoute(false)} />
        )}
        <button
          onClick={() => setShowRoute(true)}
          className="w-full py-3 rounded-xl font-bold text-sm text-center border-2 border-orange-400 text-orange-500 bg-white hover:bg-orange-50 transition-colors"
        >
          📍 Como chegar
        </button>

        {/* Montar roteiro */}
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
              setDestination({ id: place.id, name: place.name, city: place.city, state: place.state, lat: place.lat, lng: place.lng, photoUrl: place.photoUrl, category: place.category, source: 'firestore' })
              router.push('/roteiro')
            }}
            className="w-full py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #f97316 100%)' }}
          >
            Montar roteiro →
          </button>
        </section>

        {/* Segurança no rolê */}
        <section className="border border-gray-100 rounded-2xl overflow-hidden">
          <button
            onClick={() => {
              if (!showEmergency && !emergencyFetched) {
                setEmergencyFetched(true)
                setEmergencyLoading(true)
                fetch(`/api/emergency?lat=${place.lat}&lng=${place.lng}`)
                  .then((r) => r.json())
                  .then((d) => setEmergencyServices({ police: d.police || [], fire: d.fire || [], hospital: d.hospital || [] }))
                  .catch(() => {})
                  .finally(() => setEmergencyLoading(false))
              }
              setShowEmergency((v) => !v)
            }}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="font-bold text-gray-900 text-base">Segurança no rolê 🚨</span>
            <span className="text-gray-400 text-sm">{showEmergency ? '▲ fechar' : '▼ ver serviços'}</span>
          </button>
          {showEmergency && (
            <div className="flex flex-col gap-4 p-3">
              {emergencyLoading && <p className="text-xs text-gray-400 text-center py-4">Buscando serviços próximos…</p>}
              {([
                { key: 'police' as const, icon: '👮', label: 'Polícia', color: 'text-blue-600', bg: 'bg-blue-50' },
                { key: 'fire' as const, icon: '🚒', label: 'Bombeiros / Salva-vidas', color: 'text-red-600', bg: 'bg-red-50' },
                { key: 'hospital' as const, icon: '🏥', label: 'Pronto-socorro / SAMU', color: 'text-green-700', bg: 'bg-green-50' },
              ] as const).map(({ key, icon, label, color, bg }) => emergencyServices[key].length > 0 && (
                <div key={key}>
                  <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${color}`}>{icon} {label}</p>
                  <div className="flex flex-col gap-2">
                    {emergencyServices[key].map((s) => {
                      const distKm = Math.round(haversineDistance(place.lat, place.lng, s.lat, s.lng) * 10) / 10
                      const svcMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`
                      return (
                        <div key={s.id} className={`flex items-center gap-3 ${bg} rounded-xl px-3 py-2.5`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{s.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-xs font-bold text-gray-600">{distKm} km</span>
                              {s.openNow !== null && (
                                <span className={`text-xs font-medium ${s.openNow ? 'text-green-600' : 'text-red-500'}`}>· {s.openNow ? 'Aberto' : 'Fechado'}</span>
                              )}
                              {s.phone && <a href={`tel:${s.phone}`} className="text-xs text-blue-500 font-medium">· {s.phone}</a>}
                            </div>
                          </div>
                          <a href={svcMapsUrl} target="_blank" rel="noopener noreferrer"
                            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-orange-500 text-white text-base">🗺️</a>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Reviews verificadas ✅</h2>
            <span className="text-xs text-gray-400">{place.verifiedReviewCount} verificadas</span>
          </div>
          {!hasReviewed && !showReviewForm && (
            <button onClick={() => setShowReviewForm(true)} className="btn-primary w-full mb-4">
              ⭐ Fui nesse rolê — avaliar
            </button>
          )}
          {showReviewForm && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <ReviewForm
                placeId={id}
                placeLat={place.lat}
                placeLng={place.lng}
                onSuccess={async () => {
                  setShowReviewForm(false)
                  setHasReviewed(true)
                  const updated = await getReviewsByPlace(id)
                  setReviews(updated)
                }}
              />
            </div>
          )}
          <ReviewList
            reviews={reviews}
            currentUserId={user?.uid}
            placeId={id}
            placeName={place.name}
          />
        </section>
      </div>
    </div>
  )
}
