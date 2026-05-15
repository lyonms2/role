'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getPlaceById, getReviewsByPlace, getTipsByPlace, addTip, hasUserReviewedPlace } from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { haversineDistance } from '@/lib/geolocation'
import { useRoteiro } from '@/lib/roteiro-context'
import type { Place, Review, Tip, WeatherData } from '@/types'
import { CATEGORY_EMOJIS } from '@/types'
import WeatherBadge from '@/components/WeatherBadge'
import ReviewForm from '@/components/ReviewForm'
import ReviewList from '@/components/ReviewList'
import TipCard from '@/components/TipCard'
import Pagination from '@/components/Pagination'
import ImageLightbox from '@/components/ImageLightbox'
import RouteModal from '@/components/RouteModal'

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
  const [tips, setTips] = useState<Tip[]>([])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showTipForm, setShowTipForm] = useState(false)
  const [tipText, setTipText] = useState('')
  const [hasReviewed, setHasReviewed] = useState(false)
  const [distance, setDistance] = useState<{ km: number; min: number } | null>(null)
  const [emergencyServices, setEmergencyServices] = useState<EmergencyService[]>([])
  const [tipPage, setTipPage] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showRoute, setShowRoute] = useState(false)
  const TIPS_PER_PAGE = 5

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser)
    return unsub
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [p, revs, tps] = await Promise.all([
        getPlaceById(id),
        getReviewsByPlace(id),
        getTipsByPlace(id),
      ])
      setPlace(p)
      setReviews(revs)
      setTips(tps)

      if (p) {
        fetch(`/api/weather?lat=${p.lat}&lng=${p.lng}`)
          .then((r) => r.json())
          .then(setWeather)
          .catch(() => {})

        fetch(`/api/emergency?lat=${p.lat}&lng=${p.lng}`)
          .then((r) => r.json())
          .then((data) => setEmergencyServices(data.services || []))
          .catch(() => {})
      }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!user || !id) return
    hasUserReviewedPlace(user.uid, id).then(setHasReviewed)
  }, [user, id])

  async function handleAddTip(e: React.FormEvent) {
    e.preventDefault()
    if (!tipText.trim() || !user) return
    await addTip({ placeId: id, userId: user.uid, userName: user.displayName || 'Anônimo', text: tipText.trim() })
    setTipText('')
    setShowTipForm(false)
    const updated = await getTipsByPlace(id)
    setTips(updated)
  }

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
      {lightbox && <ImageLightbox src={lightbox} alt={place.name} onClose={() => setLightbox(null)} />}

      {/* Foto */}
      <div className="relative h-72 bg-gray-100">
        {place.photoUrl ? (
          <button className="absolute inset-0 w-full h-full" onClick={() => setLightbox(place.photoUrl!)}>
            <Image src={place.photoUrl} alt={place.name} fill className="object-cover" sizes="100vw" unoptimized={place.photoUrl?.startsWith('/api/photo')} />
            <span className="absolute bottom-16 right-4 bg-black/40 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">🔍 Ampliar</span>
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-7xl bg-gradient-to-b from-orange-50 to-orange-100">
            {emoji}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        <div className="absolute bottom-4 left-4 right-4">
          <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {emoji} {place.category.replace('_', ' ')}
          </span>
          {place.verifiedReviewCount > 0 && (
            <span className="ml-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full">
              ✅ Verificado por quem foi
            </span>
          )}
        </div>
        <Link href="/resultados" className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow">
          ←
        </Link>
      </div>

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

        {/* Clima */}
        {weather && <WeatherBadge weather={weather} />}

        {/* Sinal de celular (agregado das reviews) */}
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

        {/* Descrição */}
        <p className="text-gray-700 leading-relaxed">{place.description}</p>

        {/* Botão rota */}
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

        {/* Dicas */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Dicas da galera 💡</h2>
            {user && (
              <button onClick={() => setShowTipForm((v) => !v)} className="text-sm text-orange-500 font-semibold">
                + Jogar uma dica
              </button>
            )}
          </div>
          {showTipForm && (
            <form onSubmit={handleAddTip} className="mb-3 flex flex-col gap-2">
              <textarea
                value={tipText}
                onChange={(e) => setTipText(e.target.value)}
                rows={2}
                placeholder="Cola uma dica boa pra quem tá planejando o rolê..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
                required
              />
              <button type="submit" className="btn-primary text-sm py-2">Mandar dica 💡</button>
            </form>
          )}
          {tips.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-3">Ninguém jogou uma dica ainda. Bora ser o primeiro? 💡</p>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {tips.slice(tipPage * TIPS_PER_PAGE, (tipPage + 1) * TIPS_PER_PAGE).map((t) => (
                  <TipCard key={t.id} tip={t} />
                ))}
              </div>
              <Pagination
                page={tipPage}
                totalPages={Math.ceil(tips.length / TIPS_PER_PAGE)}
                onPrev={() => setTipPage((p) => Math.max(0, p - 1))}
                onNext={() => setTipPage((p) => Math.min(Math.ceil(tips.length / TIPS_PER_PAGE) - 1, p + 1))}
              />
            </>
          )}
        </section>

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
        {emergencyServices.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Segurança no rolê 🚨</h2>
            <div className="flex flex-col gap-2">
              {emergencyServices.slice(0, 5).map((s) => {
                const distKm = Math.round(haversineDistance(place.lat, place.lng, s.lat, s.lng) * 10) / 10
                const typeIcon: Record<string, string> = {
                  hospital: '🏥',
                  police: '👮',
                  fire_station: '🚒',
                  pharmacy: '💊',
                }
                const icon = typeIcon[s.type] || '🚑'
                return (
                  <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.address}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-700">{distKm} km</span>
                      {s.openNow !== null && (
                        <span className={`text-xs font-medium ${s.openNow ? 'text-green-600' : 'text-red-500'}`}>
                          {s.openNow ? 'Aberto' : 'Fechado'}
                        </span>
                      )}
                      {s.phone && (
                        <a href={`tel:${s.phone}`} className="text-xs text-blue-500 font-medium mt-0.5">
                          {s.phone}
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Reviews verificadas ✅</h2>
            <span className="text-xs text-gray-400">{place.verifiedReviewCount} verificadas</span>
          </div>

          {!hasReviewed && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="btn-primary w-full mb-4"
            >
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

          <ReviewList reviews={reviews} />
        </section>
      </div>
    </div>
  )
}
